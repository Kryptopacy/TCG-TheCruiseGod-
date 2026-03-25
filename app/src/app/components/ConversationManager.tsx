'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import VoiceButton from './VoiceButton';
import ChatFallback from './ChatFallback';
import CruiseHQ from './CruiseHQ';
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
  const [agentId, setAgentId] = useState<string>('rB4Vb4wWn5JDEJ2jJrdR');
  const [wingmanPreferences, setWingmanPreferences] = useState<string>('');


  // CruiseHQ (Multiplayer) States
  const [roomId, setRoomId] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [activeGuests, setActiveGuests] = useState<string[]>([]);
  const activeGuestsRef = useRef<string[]>([]); // live ref so client tool handlers always see current guests
  const [pushedImage, setPushedImage] = useState<string | null>(null);
  const [cohostRequests, setCohostRequests] = useState<string[]>([]);
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const supabase = useRef(typeof window !== 'undefined' ? createClient() : null as unknown as ReturnType<typeof createClient>);
  if (!supabase.current && typeof window !== 'undefined') {
    supabase.current = createClient();
  }
  const roomChannelRef = useRef<any>(null);
  const conversationRef = useRef<typeof conversation | null>(null);

  // Vision / Camera States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTask, setCameraTask] = useState<VisionTask>('general');
  const [cameraPrompt, setCameraPrompt] = useState<string | undefined>(undefined);
  
  const messageIdCounter = useRef(0);

  useEffect(() => {
    // Load profile from Supabase user metadata (set on profile page)
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.current.auth.getUser();
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
        setAgentId(agentToSet);
      } catch {
        const savedName = localStorage.getItem('tcg_userName') || '';
        const savedAgent = localStorage.getItem('tcg_agentId') || 'rB4Vb4wWn5JDEJ2jJrdR';
        setUserName(savedName);
        setAgentId(savedAgent);
      }
    };
    loadProfile();
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
    const channel = supabase.current.channel(`room:${newRoomId}`);
    roomChannelRef.current = channel;
    
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
          if (conversationRef.current?.status === 'connected') {
            conversationRef.current.sendUserMessage(
              `[SYSTEM] New guest joined: ${g}. Active guests are now: ${uniqueGuests.join(', ')} (${uniqueGuests.length} total).`
            );
          }
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
          if (conversationRef.current?.status === 'connected') {
            const groupName = msg.groupId === 'main' ? 'the Main Room' : `Group ${msg.groupId}`;
            conversationRef.current.sendUserMessage(
              `[From ${msg.sender} in ${groupName}]: ${msg.text}`
            );
          }
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
        if (conversationRef.current?.status === 'connected') {
          conversationRef.current.sendUserMessage(transcript);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[CruiseHQ] Broadcasting listening on room:${newRoomId}`);
        }
      });

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [addMessage]);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[TCG] Connected to ElevenLabs');
      setErrorMessage(null);
      addMessage('system', '🎙️ Connected! TCG is ready to cruise.');
    },
    onDisconnect: () => {
      console.log('[TCG] Disconnected');
    },
    onMessage: (message) => {
      console.log('[TCG] Message:', message);
      if (message.source === 'ai' && typeof message.message === 'string') {
        addMessage('agent', message.message);
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

  // Client tool handlers
  const handleCreateMemory = useCallback((params: Record<string, unknown>) => {
    const momentId = `share-${Date.now()}`;
    const shareCaption = params.shareCaption as string | undefined;
    const moment: Memory = {
      id: momentId,
      type: (params.type as Memory['type']) || 'moment',
      title: (params.title as string) || 'TCG Moment',
      content: (params.content as string) || '',
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
    const mode = params.mode as TCGMode;
    if (['locator', 'plug', 'game-master', 'tools'].includes(mode)) {
      setActiveMode(mode);
      if (mode !== 'game-master') setGameStatus(null);
      return `Mode switched to ${mode}`;
    }
    return 'Failed: Invalid mode';
  }, []);

  const [activeToolId, setActiveToolId] = useState<string | undefined>(undefined);

  const handleOpenTool = useCallback((params: Record<string, unknown>) => {
    const tool = params.tool as string;
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
        gameName: (params.gameName as string) || prev?.gameName || 'Game Session',
        status: (params.status as TCGGameStatus['status']) || prev?.status || 'playing',
        players: (params.players as Player[]) || prev?.players || [],
        currentTurn: (params.currentTurn as string) || prev?.currentTurn,
        timer: params.timer !== undefined ? (params.timer as number) : prev?.timer,
        rulesSummary: (params.rulesSummary as string) || prev?.rulesSummary,
      };
      return updated;
    });
    return 'Game state updated';
  }, []);

  const handleDisplayResults = useCallback((params: Record<string, unknown>) => {
    // Agent may send results as a JSON string (since ElevenLabs params are strings)
    let results: SearchResult[] = [];
    if (typeof params.results === 'string') {
      try { results = JSON.parse(params.results); } catch { results = []; }
    } else if (Array.isArray(params.results)) {
      results = params.results as SearchResult[];
    }
    setCurrentResults({
      success: true,
      results,
      type: (params.type as UnifiedSearchResponse['type']) || 'locations',
      query: (params.query as string) || '',
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
    const numGroups = Math.max(2, Number(params.numGroups) || 2);
    if (activeGuests.length < 2) return 'Not enough guests in the room to split into groups.';
    handleRandomizeGroups(numGroups);
    return `Split ${activeGuests.length} guests into ${numGroups} groups!`;
  }, [activeGuests]);

  const handleAnalyzeImage = useCallback((params: Record<string, unknown>) => {
    const task = (params.task as VisionTask) || 'general';
    const prompt = params.prompt as string | undefined;
    setCameraTask(task);
    setCameraPrompt(prompt);
    setShowCamera(true);
    return 'Camera is open — take a photo for TCG to analyze.';
  }, []);

  const handleVisionResult = useCallback((result: string, structured?: any) => {
    // Inject vision result into live transcript so agent gets context
    addMessage('system', `🔍 Vision result: ${result}`);
    if (conversation.status === 'connected') {
      conversation.sendUserMessage(`[Vision Analysis Complete] ${result}`);
    }
    // If it's a bill result, auto-populate the UI feedback
    if (structured?.total) {
      addMessage('system', `💰 Detected total: $${structured.total}. ${structured.summary || ''}`);
    }
  }, [addMessage, conversation]);

  const startConversation = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our API route natively supporting dynamic agent selection
      const response = await fetch('/api/get-signed-url?agentId=' + agentId);
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
          analyzeImage: handleAnalyzeImage,
          captureScreen: async () => {
            addMessage('system', '📸 Capturing screen memory...');
            await handleCreateMemory({ type: 'moment', title: 'Captured by Voice', shareCaption: 'TCG grabbed this legendary screenshot.' });
          },
        },
        overrides: {
          agent: {
            prompt: {
              prompt: `
<dynamic_context>
User Name: ${userName ? userName : 'Unknown yet (Ask naturally)'}
User Location: ${location ? location : 'Unknown (Ask if needed for spots/plugs)'}
Current UI Mode: ${activeMode}
CruiseHQ Room Code: ${roomId} | Active Guests: ${activeGuests.length > 0 ? activeGuests.join(', ') : 'None yet'}
${wingmanPreferences ? `
User's Wingman Protocols: ${wingmanPreferences}
Always honour these preferences without needing to be reminded.` : ''}
</dynamic_context>

<role>
You are TCG — The Cruise God. You are a world-class AI concierge, local expert, and game master all in one. Your personality is magnetic — you're the friend who always knows where to go, who to call, and how to turn a dead hangout into the best night ever.
</role>

<personality_core>
- ENERGY: Confident, warm, quick-witted. Match the user's energy (hyped or chill). Never monotone or robotic.
- PERSONALIZATION: ${userName ? 'Greet them joyfully by name!' : 'Warmly ask for their name in your very first message so you can personalize the conversation!'} Use it naturally.
- HUMOR: Light, natural humor. Roast gently, hype genuinely. Never corny.
- BREVITY: You are voice-first. Max 2-3 sentences per turn. No bullet lists. No walls of text. Be concise.
- CULTURAL AWARENESS: Be inclusive and adaptive. Read the room.
</personality_core>

<core_workflows>
1. 🔍 FINDING SPOTS: Call switchMode("locator") then displayResults(). Ask highly dynamic, situational questions to narrow it down if vague. Lead with top 1-2 picks.
2. 🔌 FINDING SERVICES: Call switchMode("plug") then displayResults(). Ask dynamic, context-aware questions to get specifics. Frame results as personal recommendations.
3. 🎮 THE GAME MASTER PROTOCOL: Call switchMode("game-master"). Suggest a game from our database. Ask, "Want me to moderate?". If they say yes, YOU become the host. Call openTool(tool) to deploy the Scoreboard, Timer, or Randomizer. Track turns, enforce the rules boldly, and announce the final winner.
4. 🎲 PARTY TOOLS: Call openTool(tool) for quick utilities (coin, dice, bill, truth, scoreboard, bottle, randomizer, timer, charades). Provide instant color commentary.
5. 📸 VISION: Call analyzeImage() when user wants to scan a receipt (task: bill_split), check a drink (task: drink_check), or analyze anything visual (task: general).
6. 👥 CRUISEHQ & POLLS: Call showQR() to invite guests. When guests mention you (@TCG) in room chat, respond directly to their query. If a Poll or Randomizer result is posted, acknowledge it neutrally and respectfully without roasting.
</core_workflows>

<critical_behaviors>
- LATENCY MGT: Say a natural filler BEFORE tools execute. Never leave silence.
- BARGE-IN RECOVERY: Acknowledge naturally ("Say less," "Got it") and handle new request instantly.
- MEMORIES: Call createMemory for: game wins, epic quotes, location drops, plug moments that came through, CruiseHQ highlights. Always provide a viral shareCaption. Suggest captures proactively (max 2-3 per session).
  - type options: location_drop | game_win | plug_moment | cruisehq_quote | party_milestone | group_capture | moment
- MODE TRANSITIONS: Detect transitions automatically from context. Call switchMode to update UI.
- VISION RESULTS: When you receive a [Vision Analysis Complete] message, speak it naturally. For bill_split results, break down who owes what based on the guest count.
</critical_behaviors>

<advanced_nlp_handling>
Flawlessly handle messy natural language: Extract core intent from rambling. Abstract vague reasoning. Triage multi-threading requests. Natively comprehend modern slang. Auto-pivot on interruptions without ever saying "As I was saying."
</advanced_nlp_handling>
              `,
            },
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
    if (conversation.status === 'connected') {
      conversation.sendUserMessage(text);
    }
  }, [addMessage, conversation]);

  // Auto-detect location
  const handleGetLocation = useCallback(() => {
    getDeviceLocation(
      (msg) => addMessage('system', msg),
      (err) => setErrorMessage(err)
    );
  }, [getDeviceLocation, addMessage]);

  // Derive group assignment for a player
  const getPlayerGroup = (name: string) => {
    for (const [groupName, members] of Object.entries(groups)) {
      if (members.includes(name)) return groupName;
    }
    return null;
  };

  const handleRandomizeGroups = useCallback((numGroups: number) => {
    const shuffled = [...activeGuests].sort(() => 0.5 - Math.random());
    const newGroups: Record<string, string[]> = {};
    for (let i = 0; i < numGroups; i++) {
      newGroups[`Group ${String.fromCharCode(65 + i)}`] = [];
    }
    shuffled.forEach((guest, index) => {
      const groupKey = `Group ${String.fromCharCode(65 + (index % numGroups))}`;
      newGroups[groupKey].push(guest);
    });
    setGroups(newGroups);
    addMessage('system', `🎲 Randomly assigned ${activeGuests.length} Cruisers into ${numGroups} groups.`);
  }, [activeGuests, addMessage]);

  return (
    <div id="tcg-capture-area" className="page-container">
      {/* 1. Radical Multi-Layer Background */}
      <div className="radical-bg" />

      {/* 2. Distinct Header Layer: Logo and Location */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: 'rgba(10, 10, 20, 0.88)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', padding: 'max(12px, env(safe-area-inset-top)) 14px 12px', boxShadow: '0 4px 30px rgba(0,0,0,0.5)', borderRadius: '20px', margin: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          {/* Logo */}
          <div style={{ width: 'min(110px, 26vw)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/tcg-logo.png" alt="TCG Logo" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))' }} />
            <button 
              onClick={() => setShowSettings(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '4px', opacity: 0.7, color: '#fff', minWidth: 'unset', minHeight: 'unset' }}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
          
          {/* Location & Room Wrapper */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', zIndex: 30, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Active Guests Badge */}
              {isStarted && activeGuests.length > 0 && (
                <div 
                  onClick={() => setShowGroupsModal(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)', color: 'var(--accent-cyan)', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  👥 {activeGuests.length} {Object.keys(groups).length > 0 ? `(${Object.keys(groups).length}G)` : ''}
                </div>
              )}

              {/* CruiseHQ Code Button */}
              {isStarted && (
                <button
                  onClick={() => setShowQR(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: 'var(--radius-full)', border: '2px solid var(--accent-magenta)', background: 'rgba(224, 64, 251, 0.1)', color: 'var(--accent-magenta)', fontSize: '0.7rem', whiteSpace: 'nowrap', fontWeight: 800, boxShadow: '0 2px 8px rgba(224, 64, 251, 0.2)', minWidth: 'unset', minHeight: 'unset' }}
                >
                  📱 {roomId}
                </button>
              )}
            </div>

            {/* Location Input/Badge */}
              {showLocationInput ? (
                <div style={{ background: 'rgba(255, 230, 0, 0.1)', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '320px', animation: 'slide-down-toast 0.2s', borderRadius: '14px', border: '1px solid rgba(255, 230, 0, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <textarea
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Edit full address..."
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', minHeight: '36px', resize: 'none', fontFamily: 'inherit', padding: '4px 0' }}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && location.trim()) {
                        e.preventDefault();
                        setShowLocationInput(false);
                        addMessage('system', `📍 Location set: ${location}`);
                      }
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={handleGetLocation} disabled={isGettingLocation} style={{ background: '#FFE600', border: '2px solid #d4b800', color: '#000', padding: '5px 10px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 800, minWidth: 'unset', minHeight: 'unset' }}>{isGettingLocation ? '...' : 'Auto'}</button>
                    {location.trim() && <button onClick={() => setShowLocationInput(false)} style={{ background: 'var(--accent-green)', border: 'none', color: '#000', padding: '5px 10px', borderRadius: '8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 900, minWidth: 'unset', minHeight: 'unset' }}>OK</button>}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLocationInput(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255, 230, 0, 0.3)', background: 'rgba(255, 230, 0, 0.1)', color: 'var(--accent-gold)', fontSize: '0.7rem', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', minWidth: 'unset', minHeight: 'unset' }}
                >
                  📍 {location || "Set Your Location"}
                </button>
              )}
            </div>
          </div>
        </div>

      {/* Tools Panel Overlay (shown when Tools mode is active) */}
      {activeMode === 'tools' && (
        <ToolsPanel activeTool={activeToolId as any} activeGuests={activeGuests} groups={groups} />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        initialName={userName} 
        onSaveName={setUserName} 
      />

      {/* Floating Modes (Pushed below header) */}
      <div style={{ position: 'absolute', top: 'clamp(95px, 20vmin, 155px)', left: 0, right: 0, zIndex: 15, display: 'flex', justifyContent: 'center' }}>
        <div className="glass-overlay" style={{ padding: '6px 8px', borderRadius: 'var(--radius-full)' }}>
          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
        </div>
      </div>

      {/* Co-host Approval Toast */}
      {cohostRequests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '100px', left: '20px', right: '20px', zIndex: 110, display: 'flex', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', border: '2px solid var(--accent-magenta)', boxShadow: '0 0 30px rgba(224, 64, 251, 0.4)', borderRadius: '24px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>🎙️ {cohostRequests[0]} wants to be a Co-host</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={async () => {
                  const targetId = cohostRequests[0];
                  if (roomChannelRef.current) {
                    await roomChannelRef.current.send({
                      type: 'broadcast',
                      event: 'cohost_approved',
                      payload: { cruiseId: targetId }
                    });
                  }
                  setCohostRequests(prev => prev.filter(id => id !== targetId));
                  addMessage('system', `✅ ${targetId} is now a Co-host.`);
                }} 
                style={{ background: 'var(--accent-green)', border: 'none', padding: '8px 16px', borderRadius: '12px', color: '#000', fontWeight: 900, cursor: 'pointer' }}
              >
                APPROVE
              </button>
              <button 
                onClick={() => setCohostRequests(prev => prev.slice(1))} 
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 16px', borderRadius: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                IGNORE
              </button>
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

      {/* 4. The Aura (Waveform behind character) */}
      <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '40vh', zIndex: 1, pointerEvents: 'none', opacity: 0.8 }}>
        <WaveformVisualizer 
          isSpeaking={conversation.isSpeaking} 
          isListening={conversation.status === 'connected' && !conversation.isSpeaking}
          color={
            conversation.isSpeaking 
              ? (activeMode === 'locator' ? '#00f0ff' : activeMode === 'plug' ? '#9d00ff' : activeMode === 'game-master' ? '#ff2a2a' : '#ff6b00')
              : '#ffffff'
          }
          secondaryColor={
            conversation.isSpeaking 
              ? (activeMode === 'locator' ? 'rgba(0, 240, 255, 0.4)' : activeMode === 'plug' ? 'rgba(157, 0, 255, 0.4)' : activeMode === 'game-master' ? 'rgba(255, 42, 42, 0.4)' : 'rgba(255, 107, 0, 0.4)')
              : 'rgba(255, 255, 255, 0.3)'
          }
        />
      </div>

      {/* 5. Majestic Anchored Character Avatar */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '-5vh',
          left: '50%', 
          transform: `translateX(-50%) ${conversation.isSpeaking ? 'scale(1.05)' : 'scale(1)'}`, 
          zIndex: 5, 
          width: 'min(85vw, 420px)',
          cursor: 'pointer',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: conversation.isSpeaking ? 'speaking-bounce 1s infinite ease-in-out' : 'idle-float 5s infinite ease-in-out',
          filter: conversation.isSpeaking 
                  ? 'drop-shadow(0 0 40px rgba(255, 230, 0, 0.4))' 
                  : (conversation.status === 'connected' ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.15))' : 'drop-shadow(0 -10px 30px rgba(0,0,0,0.8))')
        }}
        onClick={toggleConversation}
        onPointerDown={(e) => e.currentTarget.style.transform = `translateX(-50%) scale(0.95)`}
        onPointerUp={(e) => e.currentTarget.style.transform = `translateX(-50%) scale(1)`}
        onPointerLeave={(e) => e.currentTarget.style.transform = `translateX(-50%) scale(1)`}
        title={conversation.status === 'connected' ? "Tap to Disconnect" : "Tap to Connect"}
      >
        <img 
          src="/tcg-character.png" 
          alt="The Cruise God"
          style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} 
        />
      </div>

      {/* Floating Action Buttons */}
      {isStarted && (
        <div style={{ position: 'absolute', bottom: '24px', left: '16px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 60, alignItems: 'center' }}>
          {/* Manual Memory Capture Button */}
          <button
            onClick={() => handleCreateMemory({ type: 'moment', title: 'Captured Memory', content: 'Manually saved by you.' })}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(30, 10, 60, 0.85)',
              border: '2px solid rgba(0, 229, 255, 0.5)',
              color: '#00E5FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 229, 255, 0.35)',
              transition: 'transform 0.1s ease-in-out',
              fontSize: '1.4rem'
            }}
            aria-label="Capture Memory"
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            📸
          </button>

          {/* Manual TCG Vision Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => {
                setCameraTask('general');
                setCameraPrompt(undefined);
                setShowCamera(true);
              }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(145deg, #00C8FF, #0080FF)',
                border: '2px solid rgba(0, 200, 255, 0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0, 128, 255, 0.55)',
                transition: 'transform 0.1s ease-in-out',
                fontSize: '1.5rem',
              }}
              aria-label="Toggle TCG Vision"
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              👁️
            </button>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#1a0040', textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>VISION</span>
          </div>
          
          {/* CruiseHQ Group Chat Button — distinctly branded with group icon + CREW label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setShowCruiseHQ(true)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(145deg, #5B00C8, #9D00FF)',
                border: '2px solid rgba(200, 100, 255, 0.5)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(157, 0, 255, 0.55)',
                transition: 'transform 0.1s ease-in-out',
              }}
              aria-label="Toggle CruiseHQ Chat"
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {/* Group people icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </button>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#1a0040', textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>CREW</span>
          </div>

          {/* TCG AI Text Chat Button — distinctly branded with TCG label */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setShowTranscript(prev => !prev)}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: showTranscript ? 'linear-gradient(145deg, #1a0040, #3a0080)' : 'linear-gradient(145deg, #1a0040, #3a0080)',
                border: showTranscript ? '2px solid #FFE600' : '2px solid rgba(255, 230, 0, 0.5)',
                color: '#FFE600',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: showTranscript ? '0 6px 24px rgba(255, 230, 0, 0.6)' : '0 6px 20px rgba(255, 230, 0, 0.35)',
                transition: 'all 0.15s ease-in-out',
                gap: '2px',
              }}
              aria-label="Toggle TCG Text Chat"
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {showTranscript ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              )}
              <span style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.04em' }}>TCG</span>
            </button>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#1a0040', textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>CHAT</span>
          </div>
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

      {/* 7. Groups Management Modal */}
      <AnimatePresence>
        {showGroupsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(5, 5, 15, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          >
            <div className="glass-card-heavy" style={{ padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: 'var(--accent-cyan)', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>CRUISER ROSTER</h2>
                <button onClick={() => setShowGroupsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '24px', paddingRight: '8px' }}>
                {activeGuests.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>No cruisers connected yet...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeGuests.map(guest => (
                      <div key={guest} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <span style={{ fontWeight: 700 }}>{guest}</span>
                        {getPlayerGroup(guest) && (
                          <span style={{ fontSize: '0.7rem', background: 'var(--accent-magenta)', color: '#fff', padding: '4px 8px', borderRadius: '8px' }}>
                            {getPlayerGroup(guest)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeGuests.length > 1 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px', fontWeight: 700 }}>QUICK ACTIONS</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => handleRandomizeGroups(2)}
                      style={{ flex: 1, background: 'var(--accent-cyan)', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                    >
                      SPLIT 50/50
                    </button>
                    <button 
                      onClick={() => handleRandomizeGroups(3)}
                      style={{ flex: 1, background: 'transparent', border: '2px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                    >
                      3 GROUPS
                    </button>
                    {Object.keys(groups).length > 0 && (
                      <button 
                        onClick={() => setGroups({})}
                        style={{ flex: 1, background: 'rgba(255, 42, 42, 0.1)', color: '#FF2A2A', border: '1px solid #FF2A2A', padding: '12px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        RESET
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CruiseHQ Join QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5, 5, 15, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          >
            <div className="glass-card-heavy" style={{ padding: '40px', textAlign: 'center', maxWidth: '380px', width: '100%', border: '1px solid rgba(224, 64, 251, 0.3)', boxShadow: '0 10px 50px rgba(0,0,0,0.8)' }}>
              <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px', background: 'var(--gradient-magenta)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                Join CruiseHQ
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                Scan to join <strong>{roomId}</strong>. Chat with everyone, or submit private truths, dares, charades, and songs!
              </p>
              
              <div style={{ background: '#fff', padding: '16px', borderRadius: '24px', marginBottom: '32px', display: 'inline-block', boxShadow: '0 0 30px rgba(224, 64, 251, 0.3)' }}>
                {/* Dynamically generating the QR Code linking to the Guest UI route */}
                {/* Fallback host URL for local testing or production */}
                {typeof window !== 'undefined' && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/room/${roomId}`)}`} 
                    alt="CruiseHQ QR Code" 
                    style={{ width: '220px', height: '220px', display: 'block' }} 
                  />
                )}
              </div>
              
              <button 
                onClick={() => setShowQR(false)} 
                style={{ background: 'var(--gradient-magenta)', border: 'none', padding: '16px 24px', borderRadius: 'var(--radius-full)', color: '#fff', fontWeight: 800, cursor: 'pointer', width: '100%', fontSize: '1rem', boxShadow: '0 4px 20px rgba(224, 64, 251, 0.4)' }}
              >
                Close Scanner
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Splash Screen Overlay */}
      {!isStarted && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(9, 9, 11, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <img src="/tcg-logo.png" alt="TCG Character" style={{ width: 'min(260px, 72vw)', height: 'auto', marginBottom: '40px', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))', animation: 'idle-float 4s infinite ease-in-out', willChange: 'transform' }} />
          <button 
            className="chunky-button"
            onClick={() => {
              setIsStarted(true);
              startConversation();
            }}
            style={{ transform: 'translateZ(0)' }}
          >
            TAP TO ENTER
          </button>
        </div>
      )}

      {/* CruiseHQ Main Messaging Shell */}
      <CruiseHQ 
        roomId={roomId} 
        currentUser="Host" 
        groups={groups} 
        isOpen={showCruiseHQ} 
        onClose={() => setShowCruiseHQ(false)}
        onSaveMemory={(text, img) => handleCreateMemory({ type: 'moment', title: 'Room Memory', content: text, image_url: img })}
      />
    </div>
  );
}
