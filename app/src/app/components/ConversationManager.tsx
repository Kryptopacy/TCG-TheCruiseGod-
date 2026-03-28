'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import VoiceButton from './VoiceButton';
import ChatFallback from './ChatFallback';
import CruiseHQ, { GroupState } from './CruiseHQ';
import ModeSelector, { TCGMode } from './ModeSelector';
import GameSession from './GameSession';
import WaveformVisualizer from './WaveformVisualizer';
import { TCGGameStatus, Player } from '@/app/lib/gameState';
import { SearchResult, UnifiedSearchResponse } from '@/app/types/search';
import { db } from '@/app/lib/db';
import { useTrophyCapture } from '@/app/hooks/useTrophyCapture';
import { useDeviceLocation } from '@/app/hooks/useDeviceLocation';
import { Memory } from '@/app/types/sharing';
import { AnimatePresence, motion } from 'framer-motion';
import ToolsPanel from './ToolsPanel';
import CameraCapture, { VisionTask } from './CameraCapture';
import { createClient } from '@/utils/supabase/client';
import SettingsModal from './SettingsModal';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    image?: string;
    [key: string]: any;
  };
}

export default function ConversationManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<TCGMode>('locator');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<TCGGameStatus | null>(null);
  const [currentResults, setCurrentResults] = useState<UnifiedSearchResponse | null>(null);
  
  // UX Overhaul States
  const [isStarted, setIsStarted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCruiseHQ, setShowCruiseHQ] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [wingmanPreferences, setWingmanPreferences] = useState<string>('');

  // (background video stream removed — camera only runs inside Vision modal)

  // Mic mute state
  const [isMicMuted, setIsMicMuted] = useState(false);


  // CruiseHQ (Multiplayer) States
  const [roomId, setRoomId] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [activeGuests, setActiveGuests] = useState<string[]>([]);
  const activeGuestsRef = useRef<string[]>([]); // live ref so client tool handlers always see current guests
  const [pushedImage, setPushedImage] = useState<string | null>(null);
  const [hostCruiseId, setHostCruiseId] = useState<string>(userName || '');
  const [cohostRequests, setCohostRequests] = useState<string[]>([]);
  const [groups, setGroups] = useState<Record<string, GroupState>>({});
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  // createClient() is a singleton — safe to call unconditionally (but we ensure it only runs once per component instance).
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabase.current) supabase.current = createClient();
  const roomChannelRef = useRef<any>(null);
  const conversationRef = useRef<typeof conversation | null>(null);

  // Vision / Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTask, setCameraTask] = useState<VisionTask>('general');
  const [cameraPrompt, setCameraPrompt] = useState<string | undefined>(undefined);
  
  const messageIdCounter = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Load profile from Supabase user metadata (set on profile page)
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.current!.auth.getUser();
        let nameToSet = '';
        let agentToSet = '';
        
        if (user) {
          nameToSet = user.user_metadata?.display_name || localStorage.getItem('tcg_userName') || '';
          agentToSet = user.user_metadata?.agent_id || localStorage.getItem('tcg_agentId') || '';
          const prefs = user.user_metadata?.wingman_preferences || '';
          setWingmanPreferences(prefs);
          
          if (nameToSet) localStorage.setItem('tcg_userName', nameToSet);
          if (agentToSet) localStorage.setItem('tcg_agentId', agentToSet);
        } else {
          nameToSet = localStorage.getItem('tcg_userName') || '';
          agentToSet = localStorage.getItem('tcg_agentId') || '';
        }
        
        setUserName(nameToSet);
      } catch {
        const savedName = localStorage.getItem('tcg_userName') || '';
        setUserName(savedName);
      }
    };
    loadProfile();
  }, []);

  // (background video stream removed — no persistent camera)

  // Toggle mic mute — disables the actual mic hardware track so audio truly stops
  const toggleMicMute = useCallback(() => {
    if (conversationRef.current?.status !== 'connected') return;
    setIsMicMuted(prev => {
      const next = !prev;
      // Primary fix: enable/disable the raw mic stream tracks at the hardware level
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !next; // false = muted (stream still "open" but silent)
        });
      }
      // Also notify ElevenLabs SDK as a secondary signal (best-effort)
      try { (conversationRef.current as any)?.setMute?.(next); } catch {}
      return next;
    });
  }, []);

  const { captureAndUpload } = useTrophyCapture();
  const { 
    location, 
    setLocation, 
    isGettingLocation, 
    showLocationInput, 
    setShowLocationInput, 
    getDeviceLocation 
  } = useDeviceLocation();

  // Maintain fresh context for the onConnect closure to bypass ElevenLabs overrides restrictions
  const contextRef = useRef<string>('');
  useEffect(() => {
    contextRef.current = `[SYSTEM] The user just opened TCG. Context:
- Name: ${hostCruiseId || 'Unknown yet (Ask naturally)'}
- Location: ${location || 'Unknown (Ask if needed for spots/plugs)'}
- UI Mode: ${activeMode}
- CruiseHQ Room Code: ${roomId} | Active Guests: ${activeGuests.length > 0 ? activeGuests.join(', ') : 'None yet'}
${wingmanPreferences ? `- Wingman Protocols: ${wingmanPreferences}\nAlways honour these preferences without needing to be reminded.` : ''}

Greet them with energy right now! Be warm, hype, and brief.`;
  }, [hostCruiseId, location, activeMode, roomId, activeGuests, wingmanPreferences]);

  const addMessage = useCallback((role: 'user' | 'agent' | 'system', content: string, metadata?: any) => {
    const msg: Message = {
      id: `msg-${messageIdCounter.current++}`,
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // Keep activeGuestsRef in sync with state so client-tool handlers always have live data
  useEffect(() => {
    activeGuestsRef.current = activeGuests;
  }, [activeGuests]);

  useEffect(() => {
    // Generate Room ID once
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(newRoomId);

    // Subscribe to Supabase Realtime Broadcast for this specific room
    const channel = supabase.current!.channel(`room:${newRoomId}`);
    roomChannelRef.current = channel;

    // Local helper — reads from conversationRef so no stale-closure or hoisting issues.
    const injectIfConnected = (text: string) => {
      if (conversationRef.current?.status === 'connected') {
        try { conversationRef.current.sendUserMessage(text); } catch { /* closed */ }
      }
    };
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const guests = Object.values(state).flatMap(p => p).map((p: any) => p.cruiseId as string).filter(Boolean);
        const uniqueGuests = [...new Set(guests)];
        const prev = activeGuestsRef.current;

        // Detect joins and leaves for real-time agent awareness
        const joined = uniqueGuests.filter(g => !prev.includes(g));
        const left = prev.filter(g => !uniqueGuests.includes(g));

        setActiveGuests(uniqueGuests);

        joined.forEach(g => {
          addMessage('system', `👋 ${g} joined CruiseHQ! (${uniqueGuests.length} total)`);
          // Let the live agent know so it can acknowledge
          injectIfConnected(
            `[SYSTEM] New guest joined: ${g}. Active guests are now: ${uniqueGuests.join(', ')} (${uniqueGuests.length} total).`
          );
        });
        left.forEach(g => {
          addMessage('system', `🚶 ${g} left the room. (${uniqueGuests.length} remaining)`);
        });
      })
      .on('broadcast', { event: 'guest_action' }, (payload) => {
        // Inject guest actions dynamically into the transcript.
        const { type, content, author, image } = payload.payload;

        if (type === 'chat') {
          addMessage('user', `💬 ${author || 'Guest'}: ${content}`, { image });
        } else if (type === 'dare') {
          addMessage('system', `🔥 ${author || 'Guest'} submitted a dare: "${content}"`, { image });
        } else if (type === 'truth') {
          addMessage('system', `🤫 ${author || 'Guest'} submitted a truth: "${content}"`, { image });
        } else if (type === 'song') {
          addMessage('system', `🎵 ${author || 'Guest'} queued a song: "${content}"`);
        } else if (type === 'charades') {
          addMessage('system', `🎭 [HIDDEN] ${author || 'Guest'} submitted a secret charades word.`);
        } else {
          addMessage('system', `📬 ${author || 'Guest'} says: "${content}"`, { image });
        }
      })
      .on('broadcast', { event: 'room_chat' }, (payload) => {
        const msg = payload.payload;
        // If someone @tags TCG in the room chat, forward it to the Agent
        if (msg.text && (msg.text.includes('@TCG') || msg.text.includes('@tcg'))) {
          const groupName = msg.groupId === 'main' ? 'the Main Room' : `Group ${msg.groupId}`;
          injectIfConnected(`[From ${msg.sender} in ${groupName}]: ${msg.text}`);
        }
      })
      .on('broadcast', { event: 'cohost_request' }, (payload) => {
        const { cruiseId } = payload.payload;
        setCohostRequests(prev => [...new Set([...prev, cruiseId])]);
        addMessage('system', `🎙️ ${cruiseId} requested to be a Co-host!`);
      })
      .on('broadcast', { event: 'cohost_voice' }, (payload) => {
        const { transcript, author } = payload.payload;
        addMessage('user', `🎙️ [Remote Mic] ${author}: ${transcript}`);
        // Inject the co-host transcript into the live ElevenLabs session via ref
        injectIfConnected(transcript);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[CruiseHQ] Broadcasting listening on room:${newRoomId}`);
        }
      });

    return () => {
      supabase.current!.removeChannel(channel);
    };
  }, [addMessage]);

  const conversation = useConversation({
    micMuted: isMicMuted,
    onConnect: () => {
      console.log('[TCG] Connected to ElevenLabs');
      setErrorMessage(null);
      addMessage('system', '🎙️ Connected! TCG is live.');
      // Kick off agent's first speaking turn — without this the agent waits silently
      setTimeout(() => {
        if (conversationRef.current?.status === 'connected') {
          try { conversationRef.current.sendUserMessage(contextRef.current); } catch { /* closed */ }
        }
      }, 900);
    },
    onDisconnect: () => {
      console.log('[TCG] Disconnected');
    },
    onMessage: (message) => {
      console.log('[TCG] Message:', message);
      if (typeof message.message === 'string') {
        if (message.source === 'ai') addMessage('agent', message.message);
        if (message.source === 'user') addMessage('user', message.message);
      }
    },
    onError: (error) => {
      console.error('[TCG] Error:', error);
      setErrorMessage('Connection issue. Try again or use the text chat below.');
    },
  });

  // Keep conversationRef current so presence handler can reach the live session
  useEffect(() => {
    conversationRef.current = conversation;
  });

  // Cleanup ElevenLabs session and mic stream on Fast Refresh unmount
  useEffect(() => {
    return () => {
      // Cleanly terminate active WebSocket to avoid 'CLOSING or CLOSED state' zombie messages
      if (conversationRef.current?.status === 'connected') {
        conversationRef.current.endSession().catch(() => {});
      }
      // Guarantee mic turns off when component vanishes
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  /**
   * Safe wrapper around sendUserMessage — silently skips if the WebSocket is not
   * in a "connected" state, preventing the flood of
   * "WebSocket is already in CLOSING or CLOSED state" errors.
   */
  const safeInjectMessage = useCallback((text: string) => {
    if (conversationRef.current?.status === 'connected') {
      try {
        conversationRef.current.sendUserMessage(text);
      } catch {
        // WebSocket may have closed between the status check and the send — ignore.
      }
    }
  }, []);

  // Client tool handlers
  const handleCreateMemory = useCallback((params: Record<string, unknown>) => {
    const momentId = `share-${Date.now()}`;
    const shareCaption = params.param_shareCaption as string | undefined;
    const moment: Memory = {
      id: momentId,
      type: (params.param_type as Memory['type']) || 'moment',
      title: (params.param_title as string) || 'TCG Moment',
      content: (params.param_content as string) || '',
      mode: activeMode,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setMemories(prev => [...prev, moment]);

    // Background process for capture & save
    (async () => {
      const imageUrl = await captureAndUpload(momentId);
      await db.saveTrophy({
        ...moment,
        image_url: imageUrl || null,
        ...(shareCaption ? { share_caption: shareCaption } : {}),
      });
    })();

    if (shareCaption) {
      addMessage('system', `📸 Memory saved! Caption: "${shareCaption}"`);
    }

    return 'Memory saved to Trophy Room!';
  }, [activeMode, captureAndUpload, addMessage]);

  const handleSwitchMode = useCallback((params: Record<string, unknown>) => {
    const mode = params.param_mode as TCGMode;
    if (['locator', 'plug', 'game-master', 'tools'].includes(mode)) {
      setActiveMode(mode);
      if (mode !== 'game-master') setGameStatus(null);
      // Mode-specific announcement so the switch is genuinely useful
      const announcements: Record<string, string> = {
        locator: "Locator mode activated! I'm connected to Google Maps — ask me to find a place, get directions, check vibes at a spot, or handle any location-based need. Where are we heading?",
        plug: "The Plug is active! I connect you to the right service providers based on your location and what you need — a DJ, a caterer, a photographer, a barber, an after-party venue. What do you need sorted?",
        'game-master': "Game Master mode activated! Tell me the event type, vibe, and how many people — I'll recommend games that fit perfectly. Once we pick one, I'll referee and keep score. What kind of event is this?",
        tools: "Tools mode! I can open the randomizer, dice, coin flip, timer — just say the word.",
      };
      setTimeout(() => {
        safeInjectMessage(`[SYSTEM MODE SWITCH] You just switched to ${mode} mode. ${announcements[mode] || ''} Announce this naturally to the user now.`);
      }, 300);
      return `Mode switched to ${mode}`;
    }
    return 'Failed: Invalid mode';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeInjectMessage]);

  const [activeToolId, setActiveToolId] = useState<string | undefined>(undefined);

  const handleOpenTool = useCallback((params: Record<string, unknown>) => {
    const tool = params.param_tool as string;
    const validTools = ['coin', 'dice', 'bottle', 'randomizer', 'timer'];
    if (validTools.includes(tool)) {
      setActiveMode('tools');
      setActiveToolId(tool);
      return `Opening ${tool} tool`;
    }
    return 'Failed: Unknown tool';
  }, []);

  const handleUpdateGameState = useCallback((params: Record<string, unknown>) => {
    setGameStatus(prev => {
      const updated: TCGGameStatus = {
        gameName: (params.param_gameName as string) || prev?.gameName || 'Game Session',
        status: (params.param_status as TCGGameStatus['status']) || prev?.status || 'playing',
        players: (params.param_players as Player[]) || prev?.players || [],
        currentTurn: (params.param_currentTurn as string) || prev?.currentTurn,
        timer: params.param_timer !== undefined ? (params.param_timer as number) : prev?.timer,
        rulesSummary: (params.param_rulesSummary as string) || prev?.rulesSummary,
      };
      return updated;
    });
    return 'Game state updated';
  }, []);

  const handleDisplayResults = useCallback((params: Record<string, unknown>) => {
    // Agent may send results as a JSON string (since ElevenLabs params are strings)
    let results: SearchResult[] = [];
    if (typeof params.param_results === 'string') {
      try { results = JSON.parse(params.param_results); } catch { results = []; }
    } else if (Array.isArray(params.param_results)) {
      results = params.param_results as SearchResult[];
    }
    setCurrentResults({
      success: true,
      results,
      type: (params.param_type as UnifiedSearchResponse['type']) || 'locations',
      query: (params.param_query as string) || '',
      count: results.length,
    });
    return 'Results displayed in UI';
  }, []);

  // ─── New Voice-Control Handlers ──────────────────────────────────────────────

  const handleShowQR = useCallback(() => {
    setShowQR(true);
    return 'CruiseHQ QR code is now visible.';
  }, []);

  const handleRandomizeGroupsTool = useCallback((params: Record<string, unknown>) => {
    const numGroups = Math.max(2, Number(params.param_numGroups) || 2);
    const mode = (params.param_mode as 'auto' | 'self-select' | 'smart') || 'auto';
    const sortParam = params.param_param as string | undefined;
    if (activeGuests.length < 2) return 'Not enough guests in the room to split into groups.';
    handleCreateGroups(numGroups, mode, sortParam);
    return `${mode === 'auto' ? 'Split' : 'Creating'} ${activeGuests.length} guests into ${numGroups} groups (mode: ${mode})!`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGuests]);

  const handleSetGroupLeaderTool = useCallback((params: Record<string, unknown>) => {
    const groupName = params.param_groupName as string;
    const leader = params.param_leader as string;
    if (!groupName || !leader) return 'Failed: Missing groupName or leader param.';
    handleSetGroupLeader(groupName, leader);
    return `${leader} is now the leader of ${groupName}!`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyzeImage = useCallback((params: Record<string, unknown>) => {
    const task = (params.param_task as VisionTask) || 'general';
    const prompt = params.param_prompt as string | undefined;
    setCameraTask(task);
    setCameraPrompt(prompt);
    setShowCamera(true);
    return 'Camera is open — take a photo for TCG to analyze.';
  }, []);

  const handleVisionResult = useCallback((result: string, structured?: any) => {
    // Inject vision result into live transcript so agent gets context
    addMessage('system', `🔍 Vision result: ${result}`);
    safeInjectMessage(`[Vision Analysis Complete] ${result}`);

    // If it's a bill result, show the total amount (numbers-only in UI)
    if (structured?.total) {
      addMessage('system', `💰 Detected total: ${structured.total}. ${structured.summary || ''}`);
    }

    // ─── Actionable OCR: auto-verify barcode in background ────────────────────
    const ocr = structured?.ocr;
    if (!ocr) return;

    // Barcode lookup via Open Food Facts
    if (ocr.barcode) {
      addMessage('system', `🔎 Looking up barcode ${ocr.barcode}…`);
      fetch('/api/verify-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: ocr.barcode }),
      })
        .then(r => r.json())
        .then((data) => {
          if (data.found) {
            addMessage('system', `📦 Barcode verified: ${data.summary}`);
            safeInjectMessage(`[Barcode Lookup] ${data.summary}`);
          } else {
            addMessage('system', `❓ Barcode ${ocr.barcode}: ${data.message || 'Not found in product database.'}`);
            safeInjectMessage(`[Barcode Lookup] Barcode ${ocr.barcode} not found in product database.`);
          }
        })
        .catch(() => addMessage('system', '⚠️ Barcode lookup failed.'));
    }
  }, [addMessage, safeInjectMessage]);


  const startConversation = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Request microphone permission and hold handle to the stream for later cleanup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Get signed URL from our API route
      const response = await fetch('/api/get-signed-url');
      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }
      const { signedUrl } = await response.json();

      // Start conversation with ElevenLabs
      await conversation.startSession({
        signedUrl,
        clientTools: {
          createMemory: handleCreateMemory,
          switchMode: handleSwitchMode,
          openTool: handleOpenTool,
          updateGameState: handleUpdateGameState,
          displayResults: handleDisplayResults,
          showQR: handleShowQR,
          randomizeGroups: handleRandomizeGroupsTool,
          setGroupLeader: handleSetGroupLeaderTool,
          analyzeImage: handleAnalyzeImage,
          stopListening: async () => {
            if (!isMicMuted) toggleMicMute();
            addMessage('system', '🔇 You told TCG to stop listening. Tap the mic to unmute.');
            return 'Mic muted successfully.';
          },
          getAutoLocation: async () => {
            handleGetLocation();
            return 'Fetching device location... User will be prompted if permission is missing.';
          },
          captureScreen: async () => {
            addMessage('system', '📸 Capturing screen memory...');
            await handleCreateMemory({ type: 'moment', title: 'Captured by Voice', shareCaption: 'TCG grabbed this legendary screenshot.' });
            return 'Screen captured successfully.';
          },
        },
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsStarted(false);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow mic access or use the text chat below.');
      } else {
        setErrorMessage('Could not connect. Check your internet and try again.');
      }
    }
  }, [conversation, handleCreateMemory, handleSwitchMode, handleOpenTool, location, activeMode, wingmanPreferences]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    
    // Shut down mic hardware immediately when session ends manually
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    addMessage('system', 'Session ended. Tap the mic to start again.');
  }, [conversation, addMessage]);

  const toggleConversation = useCallback(() => {
    if (conversation.status === 'connected') {
      stopConversation();
    } else {
      startConversation();
    }
  }, [conversation.status, startConversation, stopConversation]);

  const handleTextMessage = useCallback((text: string) => {
    addMessage('user', text);
    // Route typed messages into the live ElevenLabs agent session
    safeInjectMessage(text);
  }, [addMessage, safeInjectMessage]);

  // Auto-detect location
  const handleGetLocation = useCallback(() => {
    getDeviceLocation(
      (msg) => {
        addMessage('system', msg);
        safeInjectMessage(`[SYSTEM] The user just updated their location UI: ${msg}`);
      },
      (err) => setErrorMessage(err)
    );
  }, [getDeviceLocation, addMessage, safeInjectMessage]);

  // ─── Group Management ─────────────────────────────────────────────────────

  /** Broadcast the current group state to all guest devices */
  const broadcastGroupUpdate = useCallback((newGroups: Record<string, GroupState>) => {
    if (roomChannelRef.current) {
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'group_update',
        payload: { groups: newGroups },
      }).catch(() => {});
    }
  }, []);

  /** Build groups from current guest roster */
  const handleCreateGroups = useCallback((numGroups: number, mode: 'auto' | 'self-select' | 'smart', param?: string) => {
    const newGroups: Record<string, GroupState> = {};
    for (let i = 0; i < numGroups; i++) {
      newGroups[`Group ${String.fromCharCode(65 + i)}`] = { members: [], leader: null };
    }

    if (mode === 'auto') {
      const shuffled = [...activeGuests].sort(() => 0.5 - Math.random());
      shuffled.forEach((guest, index) => {
        const groupKey = `Group ${String.fromCharCode(65 + (index % numGroups))}`;
        newGroups[groupKey].members.push(guest);
      });
      addMessage('system', `🎲 Auto-split ${activeGuests.length} Cruisers into ${numGroups} groups.`);
    } else if (mode === 'self-select') {
      // Members are empty — guests pick their own group from their phone
      addMessage('system', `✋ Self-select mode: Guests can now pick their group on their phones!`);
      safeInjectMessage(`[SYSTEM] Groups created in self-select mode. ${numGroups} groups available: ${Object.keys(newGroups).join(', ')}. Guests will pick their own groups from their phones. Announce this to the room!`);
    } else if (mode === 'smart' && param) {
      addMessage('system', `🧠 Smart sort requested by param: "${param}". TCG will handle distribution.`);
      safeInjectMessage(`[SYSTEM] The host wants to create ${numGroups} groups sorted by the following parameter: "${param}". Ask the group about this parameter and then tell the host to assign guests manually via the Roster tab, or ask each guest for their preference and use the setGroupLeader / moveGuest tools.`);
    }

    setGroups(newGroups);
    broadcastGroupUpdate(newGroups);
  }, [activeGuests, addMessage, safeInjectMessage, broadcastGroupUpdate]);

  /** Clear all groups */
  const handleClearGroups = useCallback(() => {
    setGroups({});
    broadcastGroupUpdate({});
    addMessage('system', '🗑️ All groups cleared.');
  }, [broadcastGroupUpdate, addMessage]);

  /** Move a guest to a different group (or remove from groups) */
  const handleMoveGuest = useCallback((guest: string, toGroup: string | null) => {
    setGroups(prev => {
      const next = { ...prev };
      // Remove from current group
      for (const gName of Object.keys(next)) {
        next[gName] = { ...next[gName], members: next[gName].members.filter(m => m !== guest) };
        if (next[gName].leader === guest) next[gName] = { ...next[gName], leader: null };
      }
      // Add to target group
      if (toGroup && next[toGroup]) {
        next[toGroup] = { ...next[toGroup], members: [...next[toGroup].members, guest] };
      }
      broadcastGroupUpdate(next);
      return next;
    });
  }, [broadcastGroupUpdate]);

  /** Set or update a group leader */
  const handleSetGroupLeader = useCallback((groupName: string, leader: string) => {
    setGroups(prev => {
      const next = {
        ...prev,
        [groupName]: { ...prev[groupName], leader },
      };
      broadcastGroupUpdate(next);
      return next;
    });
    addMessage('system', `👑 ${leader} is now the leader of ${groupName}!`);
    safeInjectMessage(`[SYSTEM] ${leader} has been set as the leader of ${groupName}. Acknowledge and hype them up!`);
  }, [broadcastGroupUpdate, addMessage, safeInjectMessage]);

  // Listen for guest self-select group requests
  useEffect(() => {
    if (!roomChannelRef.current) return;
    const sub = roomChannelRef.current.on('broadcast', { event: 'group_self_select' }, (payload: any) => {
      const { guest, requestedGroup } = payload.payload;
      if (!guest || !requestedGroup) return;
      handleMoveGuest(guest, requestedGroup);
      addMessage('system', `✋ ${guest} joined ${requestedGroup}!`);
    });
    return () => { sub?.unsubscribe?.(); };
  }, [handleMoveGuest, addMessage]);

  // Legacy shim kept so voice tool still works
  const handleRandomizeGroups = useCallback((numGroups: number) => {
    handleCreateGroups(numGroups, 'auto');
  }, [handleCreateGroups]);

  // ─── CruiseHQ close: re-inject context so TCG stays oriented ───────────────
  useEffect(() => {
    if (!showCruiseHQ) {
      safeInjectMessage(`[SYSTEM] User returned to the main screen from CruiseHQ.`);
    }
  // Only fire on showCruiseHQ transitions, not on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCruiseHQ]);

  // ─── Search Results Panel ────────────────────────────────────────────────────
  function SearchResultsPanel() {
    if (!currentResults || !currentResults.results || currentResults.results.length === 0) return null;
    const typeIcon = currentResults.type === 'locations' ? '📍' : currentResults.type === 'plugs' ? '🔌' : '🎮';
    return (
      <div style={{
        position: 'fixed', bottom: '90px', left: '12px', right: '12px',
        zIndex: 90, maxHeight: '55vh', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(16,4,32,0.98) 0%, rgba(12,2,22,0.98) 100%)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(245,200,0,0.3)',
        borderRadius: '22px', boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(245,200,0,0.12)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 900, background: 'linear-gradient(90deg,#FFE600,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {typeIcon} {currentResults.count ?? currentResults.results.length} Result{currentResults.results.length !== 1 ? 's' : ''}
            </span>
            {currentResults.query && <span style={{ fontSize: '0.65rem', color: 'rgba(255,200,80,0.4)', fontWeight: 600 }}>"{currentResults.query}"</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setShowTranscript(true);
                const summary = currentResults.results.slice(0, 5)
                  .map((r, i) => `${i + 1}. **${r.title || r.name || ''}** — ${r.description || ''}`)
                  .join('\n');
                addMessage('agent', `🔍 Here are the results for "${currentResults.query || 'your search'}":\n\n${summary}`);
              }}
              style={{ background: 'rgba(245,200,0,0.1)', border: '1px solid rgba(245,200,0,0.3)', color: '#F5C800', padding: '5px 12px', borderRadius: '14px', fontWeight: 800, fontSize: '0.68rem', cursor: 'pointer', minWidth: 'unset', minHeight: 'unset' }}
            >
              View in Chat
            </button>
            <button
              onClick={() => setCurrentResults(null)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900, minWidth: 'unset', minHeight: 'unset' }}
            >
              ✕
            </button>
          </div>
        </div>
        {/* Results list */}
        <div style={{ overflowY: 'auto', padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentResults.results.map((result, i) => {
            const label = result.title || result.name || `Result ${i + 1}`;
            const sub = result.description || '';
            return (
              <button
                key={i}
                onClick={() => {
                  safeInjectMessage(`[User selected result] ${label}: ${sub}. Acknowledge this choice and offer next steps.`);
                  setCurrentResults(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,200,0,0.12)',
                  borderRadius: '14px', padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', minWidth: 'unset', minHeight: 'unset',
                }}
                onPointerEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,200,0,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,0,0.3)'; }}
                onPointerLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,200,0,0.12)'; }}
              >
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{typeIcon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#FFE600', fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                  {sub && (
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sub}
                    </div>
                  )}
                  {(result.rating || result.priceLevel || result.address) && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                      {result.rating && <span style={{ flexShrink: 0, fontSize: '0.65rem', background: 'rgba(255,200,0,0.15)', color: '#FFE600', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>★ {result.rating}</span>}
                      {result.priceLevel && <span style={{ flexShrink: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{result.priceLevel}</span>}
                      {result.address && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>📍 {result.address.split(',')[0]}</span>}
                    </div>
                  )}
                </div>
                <span style={{ color: 'rgba(245,200,0,0.4)', fontSize: '0.75rem', flexShrink: 0, fontWeight: 700 }}>Pick →</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div id="tcg-capture-area" className="page-container">



      {/* ── Header ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(12, 4, 22, 0.97)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(245, 200, 0, 0.2)',
        padding: 'max(12px, env(safe-area-inset-top)) 16px 12px',
        boxShadow: '0 4px 40px rgba(0, 0, 0, 0.6)',
        borderRadius: '0 0 20px 20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <img src="/tcg-logo.png" alt="TCG Logo" style={{ width: 'min(96px, 24vw)', height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
            <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'rgba(245,200,0,0.5)', minWidth: 'unset', minHeight: 'unset' }} title="Settings">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {isStarted && conversation.status === 'connected' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '99px', background: 'var(--grad-red)', border: 'none', color: '#fff', fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.06em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4444', display: 'inline-block', animation: 'mic-live-pulse 1.4s ease-in-out infinite' }} />
                  LIVE
                </div>
              )}
              {isStarted && (
                <button onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '99px', border: 'none', background: 'rgba(18, 4, 32, 0.9)', color: '#F5C800', fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer', minWidth: 'unset', minHeight: 'unset', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm-4 4h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm-2-6h2v2h-2z"/></svg>
                  {roomId}
                </button>
              )}
              {isStarted && activeGuests.length > 0 && (
                <div onClick={() => setShowGroupsModal(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '99px', background: 'rgba(18, 4, 32, 0.88)', border: '1px solid rgba(255,140,0,0.4)', color: '#FF8C00', fontSize: '0.62rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  {activeGuests.length}{Object.keys(groups).length > 0 ? ` · ${Object.keys(groups).length}G` : ''}
                </div>
              )}
            </div>
            {showLocationInput ? (
              <div style={{ background: 'rgba(245,200,0,0.07)', padding: '7px 10px', display: 'flex', gap: '7px', alignItems: 'center', width: '100%', maxWidth: '300px', borderRadius: '12px', border: '1px solid rgba(245,200,0,0.2)' }}>
                <textarea value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Edit address..." style={{ flex: 1, background: 'transparent', border: 'none', color: '#FFF5D6', fontSize: '0.76rem', outline: 'none', minHeight: '30px', resize: 'none', fontFamily: 'inherit', padding: '2px 0' }} rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && location.trim()) { e.preventDefault(); setShowLocationInput(false); addMessage('system', `📍 Location: ${location}`); safeInjectMessage(`[SYSTEM] User manually set location to: ${location}`); } }} autoFocus />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button onClick={handleGetLocation} disabled={isGettingLocation} style={{ background: 'var(--grad-gold)', border: 'none', color: '#000', padding: '4px 8px', borderRadius: '6px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 800, minWidth: 'unset', minHeight: 'unset' }}>{isGettingLocation ? '...' : 'Auto'}</button>
                  {location.trim() && <button onClick={() => { setShowLocationInput(false); safeInjectMessage(`[SYSTEM] User manually set location to: ${location}`); }} style={{ background: 'rgba(100,220,100,0.15)', border: '1px solid rgba(100,220,100,0.35)', color: '#7dff7d', padding: '4px 8px', borderRadius: '6px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 900, minWidth: 'unset', minHeight: 'unset' }}>OK</button>}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowLocationInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '99px', border: '1px solid rgba(245,200,0,0.35)', background: 'rgba(18, 4, 32, 0.8)', color: 'rgba(245,200,0,0.9)', fontSize: '0.62rem', maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 700, cursor: 'pointer', minWidth: 'unset', minHeight: 'unset', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                {location || 'Set Location'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Panel — shown whenever TCG returns search data */}
      <SearchResultsPanel />

      {/* Tools Panel Overlay (shown when Tools mode is active) */}
      {activeMode === 'tools' && (
        <ToolsPanel 
          activeTool={activeToolId as any} 
          activeGuests={activeGuests} 
          groups={Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.members]))} 
          location={location}
          onClose={() => setActiveMode('locator')}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        initialName={userName} 
        onSaveName={setUserName} 
      />

      {/* ── Mode Selector ── */}
      <div style={{ position: 'absolute', top: 'clamp(80px, 19vmin, 135px)', left: 0, right: 0, zIndex: 15, display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(10, 4, 18, 0.88)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(245,200,0,0.2)', borderRadius: '99px', padding: '4px 6px', boxShadow: '0 6px 32px rgba(0,0,0,0.45)' }}>
          <ModeSelector activeMode={activeMode} onModeChange={(mode) => {
            setActiveMode(mode);
            if (mode !== 'game-master') setGameStatus(null);
            const announcements: Record<string, string> = {
              locator: "Locator mode activated! I'm connected to Google Maps — ask me to find a place, get directions, check vibes at a spot, or handle any location-based need. Where are we heading?",
              plug: "The Plug is active! I connect you to the right service providers based on your location and what you need — a DJ, a caterer, a photographer, a barber, an after-party venue. What do you need sorted?",
              'game-master': "Game Master mode activated! Tell me the event type, vibe, and how many people — I'll recommend games that fit perfectly. Once we pick one, I'll referee and keep score. What kind of event is this?",
              tools: "Tools mode! Say the word and I'll open the randomizer, dice, coin flip, or timer.",
            };
            setTimeout(() => safeInjectMessage(`[SYSTEM MODE SWITCH] Switched to ${mode} mode. ${announcements[mode] || ''} Announce this naturally.`), 300);
          }} />
        </div>
      </div>

      {/* Co-host Approval Toast */}
      {cohostRequests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 110, display: 'flex', justifyContent: 'center' }}>
          <div className="glass-card-heavy" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', border: '1.5px solid rgba(245,200,0,0.3)', boxShadow: '0 0 28px rgba(245,200,0,0.15)', borderRadius: '20px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF5D6' }}>🎙️ {cohostRequests[0]} wants Co-host</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={async () => { const targetId = cohostRequests[0]; if (roomChannelRef.current) { await roomChannelRef.current.send({ type: 'broadcast', event: 'cohost_approved', payload: { cruiseId: targetId } }); } setCohostRequests(prev => prev.filter(id => id !== targetId)); addMessage('system', `✅ ${targetId} is now a Co-host.`); }} style={{ background: 'linear-gradient(135deg,#F5C800,#FF8C00)', border: 'none', padding: '7px 14px', borderRadius: '10px', color: '#0A0A10', fontWeight: 900, cursor: 'pointer', fontSize: '0.78rem' }}>APPROVE</button>
              <button onClick={() => setCohostRequests(prev => prev.slice(1))} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '7px 14px', borderRadius: '10px', color: 'rgba(255,245,214,0.6)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}>IGNORE</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Error Toasts */}
      {errorMessage && (
        <div className="glass-toast">
          <span>⚠️ {errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6, padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Waveform Aura ── */}
      <div style={{
        position: activeMode === 'tools' ? 'fixed' : 'absolute',
        bottom: activeMode === 'tools' ? '20px' : '10%',
        left: activeMode === 'tools' ? 'auto' : '50%',
        right: activeMode === 'tools' ? '20px' : 'auto',
        transform: activeMode === 'tools' ? 'none' : 'translateX(-50%)',
        width: activeMode === 'tools' ? '120px' : '100vw',
        height: activeMode === 'tools' ? '120px' : '40vh',
        zIndex: activeMode === 'tools' ? 99 : 1,
        pointerEvents: 'none',
        opacity: activeMode === 'tools' ? 1 : 0.85,
        transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
      }}>
        <WaveformVisualizer
          isSpeaking={conversation.isSpeaking}
          isListening={conversation.status === 'connected' && !conversation.isSpeaking}
          color={conversation.isSpeaking ? '#CC1010' : '#F5C800'}
          secondaryColor={conversation.isSpeaking ? 'rgba(204,16,16,0.35)' : 'rgba(245,200,0,0.25)'}
        />
      </div>

      {/* ── Character + Vision Eye Hotspot ── */}
      <div style={{ position: 'relative', display: 'contents' }}>
        <div
          style={{
            position: (activeMode === 'tools' || showTranscript || showCruiseHQ) ? 'fixed' : 'absolute',
            bottom: showCruiseHQ ? 'auto' : (showTranscript ? 'auto' : (activeMode === 'tools' ? '30px' : '-5vh')),
            top: showCruiseHQ ? '80px' : (showTranscript ? '10vh' : 'auto'),
            left: showCruiseHQ ? 'auto' : (showTranscript ? '50%' : (activeMode === 'tools' ? 'auto' : '50%')),
            right: showCruiseHQ ? '20px' : (activeMode === 'tools' ? '30px' : 'auto'),
            transform: showCruiseHQ 
              ? `scale(${conversation.isSpeaking ? 1.05 : 1})`
              : (showTranscript || activeMode !== 'tools' ? `translateX(-50%) scale(${conversation.isSpeaking ? 1.05 : 1})` : `scale(${conversation.isSpeaking ? 1.05 : 1})`),
            zIndex: 150,
            /* Slightly larger in widget modes for legibility */
            width: showCruiseHQ ? '95px' : (showTranscript ? '140px' : (activeMode === 'tools' ? '95px' : 'min(85vw, 420px)')),
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: conversation.isSpeaking ? 'speaking-bounce 1s infinite ease-in-out' : 'idle-float 5s infinite ease-in-out',
            filter: conversation.isSpeaking
              ? 'drop-shadow(0 0 30px rgba(255,215,0,0.5))'
              : conversation.status === 'connected'
                ? 'drop-shadow(0 0 15px rgba(255,215,0,0.2))'
                : 'drop-shadow(0 -5px 15px rgba(0,0,0,0.3))',
          }}
        >
          {/* Character — always clickable: toggle connect/disconnect (or unmute if muted) */}
          <img
            src="/tcg-character.png"
            alt="The Cruise God"
            title={conversation.status === 'connected' ? (isMicMuted ? 'Tap to unmute' : 'Tap to disconnect TCG') : 'Tap to connect TCG'}
            onClick={() => {
              if (isMicMuted) {
                toggleMicMute();
              } else {
                toggleConversation();
              }
            }}
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: 'block', 
              pointerEvents: 'auto',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          />
          {/* Vision eye hotspot — overlaid on visor area. Compact in widget modes. */}
          {isStarted && (
            <button
              onClick={() => { setCameraTask('general'); setCameraPrompt(undefined); setShowCamera(true); }}
              aria-label="Open TCG Vision"
              style={{
                position: 'absolute',
                /* In widget modes (HQ/transcript/tools), sit at the chin not the torso */
                top: (showCruiseHQ || showTranscript || activeMode === 'tools') ? '72%' : '28%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(18, 4, 32, 0.9)',
                border: '1.5px solid rgba(245,200,0,0.8)',
                borderRadius: '99px',
                /* Smaller padding in widget modes so it doesn't cover the whole widget */
                padding: (showCruiseHQ || showTranscript || activeMode === 'tools') ? '3px 7px' : '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                animation: 'eye-glow-pulse 2.5s ease-in-out infinite',
                transition: 'all 0.18s ease',
                minWidth: 'unset', minHeight: 'unset',
                zIndex: 10,
              }}
            >
              <svg width={(showCruiseHQ || showTranscript || activeMode === 'tools') ? '9' : '13'} height={(showCruiseHQ || showTranscript || activeMode === 'tools') ? '9' : '13'} viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              {!(showCruiseHQ || showTranscript || activeMode === 'tools') && (
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>VISION</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Broadcast Control Strip (bottom-center) ── */}
      {isStarted && (
        <div style={{
          position: 'fixed', bottom: showTranscript ? 'calc(65vh + 12px)' : '24px',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 65, display: 'flex', alignItems: 'center',
          gap: '6px',
          background: 'rgba(10, 4, 18, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1.5px solid ${conversation.status === 'connected' ? 'rgba(245,200,0,0.35)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '99px', padding: '6px 10px',
          boxShadow: '0 6px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
          transition: 'bottom 0.35s cubic-bezier(0.4,0,0.2,1)',
          whiteSpace: 'nowrap',
        }}>
          {/* Live dot */}
          {conversation.status === 'connected' && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4444', display: 'inline-block', animation: 'mic-live-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', color: conversation.status === 'connected' ? '#F5C800' : 'rgba(255,245,214,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {conversation.status === 'connected' ? (isMicMuted ? 'MUTED' : 'LIVE') : 'OFFLINE'}
          </span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
          {/* Mute toggle */}
          <button
            onClick={toggleMicMute}
            disabled={conversation.status !== 'connected'}
            style={{
              background: isMicMuted ? 'rgba(204,16,16,0.2)' : 'rgba(245,200,0,0.1)',
              border: isMicMuted ? '1px solid rgba(204,16,16,0.5)' : '1px solid rgba(245,200,0,0.35)',
              borderRadius: '99px', padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: '5px',
              cursor: conversation.status === 'connected' ? 'pointer' : 'not-allowed',
              opacity: conversation.status === 'connected' ? 1 : 0.4,
              transition: 'all 0.18s ease',
              minWidth: 'unset', minHeight: 'unset',
            }}
            aria-label={isMicMuted ? 'Unmute' : 'Mute'}
          >
            {isMicMuted ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff7070"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#F5C800"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
            )}
            <span style={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', color: isMicMuted ? '#ff7070' : '#F5C800', letterSpacing: '0.04em' }}>{isMicMuted ? 'UNMUTE' : 'MUTE'}</span>
          </button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />
          {/* Disconnect */}
          <button
            onClick={toggleConversation}
            style={{
              background: conversation.status === 'connected' ? 'rgba(139,21,21,0.25)' : 'rgba(245,200,0,0.1)',
              border: conversation.status === 'connected' ? '1px solid rgba(204,16,16,0.5)' : '1px solid rgba(245,200,0,0.35)',
              borderRadius: '99px', padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: '5px',
              cursor: 'pointer', transition: 'all 0.18s ease',
              minWidth: 'unset', minHeight: 'unset',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={conversation.status === 'connected' ? '#ff7070' : '#F5C800'}>
              {conversation.status === 'connected'
                ? <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                : <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>}
            </svg>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', color: conversation.status === 'connected' ? '#ff7070' : '#F5C800', letterSpacing: '0.04em' }}>{conversation.status === 'connected' ? 'END' : 'CONNECT'}</span>
          </button>
        </div>
      )}

      {/* ── Side Action Buttons (right edge) ── */}
      {isStarted && (
        <div style={{ position: 'fixed', right: '14px', bottom: '50%', transform: 'translateY(50%)', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {/* Tools — open the party tools panel */}
          <button
            onClick={() => {
              setActiveMode('tools');
              safeInjectMessage('[SYSTEM MODE SWITCH] You just switched to Tools mode. Announce this and offer to open a specific tool like the randomizer, dice, coin, or timer.');
            }}
            aria-label="Open Party Tools"
            style={{ width: 56, height: 56, borderRadius: '16px', background: activeMode === 'tools' ? 'rgba(0,229,255,0.2)' : 'rgba(18, 4, 32, 0.95)', border: activeMode === 'tools' ? '1.5px solid rgba(0,229,255,0.6)' : '1px solid rgba(255,255,255,0.15)', color: activeMode === 'tools' ? '#00E5FF' : '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, backdropFilter: 'blur(16px)', transition: 'all 0.15s ease', minWidth: 'unset', minHeight: 'unset', boxShadow: activeMode === 'tools' ? '0 0 24px rgba(0,229,255,0.3)' : '0 8px 32px rgba(0,0,0,0.4)' }}
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TOOLS</span>
          </button>

          {/* CruiseHQ */}
          <button
            onClick={() => setShowCruiseHQ(true)}
            aria-label="Open CruiseHQ"
            style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--grad-red)', border: 'none', color: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, backdropFilter: 'blur(16px)', transition: 'transform 0.12s ease', minWidth: 'unset', minHeight: 'unset', boxShadow: '0 8px 32px rgba(232, 35, 42, 0.4)' }}
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', color: '#FFFFFF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>HQ</span>
          </button>
          
          {/* Chat */}
          <button
            onClick={() => setShowTranscript(prev => !prev)}
            aria-label="Toggle Chat"
            style={{ width: 56, height: 56, borderRadius: '16px', background: showTranscript ? 'rgba(30, 6, 50, 0.98)' : 'rgba(18, 4, 32, 0.95)', border: showTranscript ? '1.5px solid rgba(245,200,0,0.8)' : '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, backdropFilter: 'blur(16px)', transition: 'all 0.15s ease', minWidth: 'unset', minHeight: 'unset', boxShadow: showTranscript ? '0 0 24px rgba(245,200,0,0.4)' : '0 8px 32px rgba(0,0,0,0.4)' }}
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, fontFamily: 'var(--font-russo), sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>CHAT</span>
          </button>
        </div>
      )}


      {/* Transcript Drawer Overlay */}
      <div className={`transcript-drawer ${showTranscript ? 'open' : ''}`}>
        <AnimatePresence mode="wait">
          {activeMode === 'game-master' && gameStatus && (
            <GameSession 
              key="game-session"
              gameStatus={gameStatus!} 
              onEndGame={() => setGameStatus(null)} 
            />
          )}

          <ChatFallback
            key="chat"
            messages={messages}
            currentResults={currentResults}
            onSendMessage={handleTextMessage}
            isConnected={conversation.status === 'connected'}
            isAgentSpeaking={conversation.isSpeaking}
            onPushImage={(img) => setPushedImage(img)}
            cruiseId={hostCruiseId}
          />
        </AnimatePresence>
      </div>

      {/* Camera / Vision Modal */}
      <CameraCapture
        isOpen={showCamera}
        task={cameraTask}
        prompt={cameraPrompt}
        onClose={() => setShowCamera(false)}
        onResult={handleVisionResult}
      />

      {/* 6. Push to Screen Overlay */}
      <AnimatePresence>
        {pushedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setPushedImage(null)}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              zIndex: 200, 
              background: 'rgba(0,0,0,0.9)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'zoom-out',
              padding: '40px'
            }}
          >
            <motion.img 
              src={pushedImage} 
              alt="Pushed to screen" 
              style={{ 
                maxWidth: '90%', 
                maxHeight: '90%', 
                borderRadius: '24px', 
                boxShadow: '0 0 100px rgba(224, 64, 251, 0.4)',
                border: '4px solid #FFE600'
              }} 
            />
            <div style={{ position: 'absolute', bottom: '40px', color: '#fff', fontSize: '1.2rem', fontWeight: 800, background: 'rgba(0,0,0,0.5)', padding: '12px 24px', borderRadius: '40px' }}>
              TAP TO DISMISS
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5, 5, 15, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          >
            <div className="glass-card-heavy" style={{ padding: '36px', textAlign: 'center', maxWidth: '360px', width: '100%', border: '1px solid rgba(245,200,0,0.2)', boxShadow: '0 10px 50px rgba(0,0,0,0.8)' }}>
              <h2 style={{ fontFamily: "'Russo One', sans-serif", fontSize: '1.6rem', fontWeight: 900, marginBottom: '6px', background: 'linear-gradient(90deg,#F5C800,#FF8C00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.04em' }}>Join CruiseHQ</h2>
              <p style={{ color: 'rgba(255,245,214,0.65)', fontSize: '0.88rem', marginBottom: '24px', lineHeight: 1.6 }}>Scan to join <strong style={{ color: '#F5C800' }}>{roomId}</strong>. Chat, submit dares, truths, and songs!</p>
              <div style={{ background: '#fff', padding: '14px', borderRadius: '20px', marginBottom: '28px', display: 'inline-block', boxShadow: '0 0 40px rgba(245,200,0,0.2)' }}>
                {typeof window !== 'undefined' && (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/room/${roomId}`)}`} alt="CruiseHQ QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
                )}
              </div>
              <button onClick={() => setShowQR(false)} style={{ background: 'linear-gradient(135deg,#F5C800,#FF8C00)', border: 'none', padding: '14px 24px', borderRadius: '99px', color: '#0A0A10', fontWeight: 900, cursor: 'pointer', width: '100%', fontSize: '0.95rem', fontFamily: "'Russo One', sans-serif", letterSpacing: '0.04em' }}>CLOSE SCANNER</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Splash Screen ── */}
      {!isStarted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'var(--grad-hero)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '32px', textAlign: 'center', gap: '0',
        }}>
          <img
            src="/tcg-logo.png"
            alt="TCG"
            style={{
              width: 'min(280px, 75vw)', height: 'auto',
              marginBottom: '48px',
              filter: 'drop-shadow(0 0 40px rgba(245,200,0,0.45)) drop-shadow(0 20px 40px rgba(0,0,0,0.7))',
              animation: 'idle-float 4s infinite ease-in-out',
              willChange: 'transform',
            }}
          />
          
          <input
            type="text"
            placeholder="ENTER YOUR CRUISE ID"
            value={hostCruiseId}
            onChange={(e) => setHostCruiseId(e.target.value.toUpperCase())}
            style={{
              background: 'rgba(18, 4, 32, 0.65)',
              border: '1.5px solid rgba(245, 200, 0, 0.4)',
              color: '#FFE600',
              padding: '16px 24px',
              borderRadius: '99px',
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 900,
              textAlign: 'center',
              letterSpacing: '0.08em',
              marginBottom: '24px',
              outline: 'none',
              width: 'min(320px, 80vw)',
              textTransform: 'uppercase',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(12px)',
            }}
          />

          <button
            className="chunky-button"
            onClick={() => { setIsStarted(true); startConversation(); }}
          >
            TAP TO UNLEASH
          </button>
          <p style={{ marginTop: '16px', color: 'rgba(18, 4, 32, 0.7)', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Audio starts instantly
          </p>
        </div>
      )}

      {/* CruiseHQ Main Messaging Shell */}
      <CruiseHQ 
        roomId={roomId} 
        currentUser="Host" 
        groups={groups}
        activeGuests={activeGuests}
        isOpen={showCruiseHQ} 
        onClose={() => setShowCruiseHQ(false)}
        onCreateGroups={handleCreateGroups}
        onClearGroups={handleClearGroups}
        onSetGroupLeader={handleSetGroupLeader}
        onMoveGuest={handleMoveGuest}
        onSaveMemory={(text, img) => handleCreateMemory({ type: 'moment', title: 'Room Memory', content: text, image_url: img })}
      />
    </div>
  );
}
