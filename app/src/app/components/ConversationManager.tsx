'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import VoiceButton from './VoiceButton';
import ChatFallback from './ChatFallback';
import ModeSelector, { TCGMode } from './ModeSelector';
import GameSession from './GameSession';
import WaveformVisualizer from './WaveformVisualizer';
import { TCGGameStatus, Player } from '@/app/lib/gameState';
import { SearchResult, UnifiedSearchResponse } from '@/app/types/search';
import { db } from '@/app/lib/db';
import { useTrophyCapture } from '@/app/hooks/useTrophyCapture';
import { useDeviceLocation } from '@/app/hooks/useDeviceLocation';
import { ShareableMoment } from '@/app/types/sharing';
import { AnimatePresence } from 'framer-motion';
import ToolsPanel from './ToolsPanel';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

export default function ConversationManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<TCGMode>('locator');
  const [shareables, setShareables] = useState<ShareableMoment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<TCGGameStatus | null>(null);
  const [currentResults, setCurrentResults] = useState<UnifiedSearchResponse | null>(null);
  
  // UX Overhaul States
  const [isStarted, setIsStarted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [userName, setUserName] = useState<string>('');
  
  const messageIdCounter = useRef(0);

  useEffect(() => {
    // Attempt to recover user name for seamless UX
    const savedName = localStorage.getItem('tcg_userName');
    if (savedName) setUserName(savedName);
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

  const addMessage = useCallback((role: 'user' | 'agent' | 'system', content: string) => {
    const msg: Message = {
      id: `msg-${messageIdCounter.current++}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

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

  // Client tool handlers
  const handleCreateShareable = useCallback((params: Record<string, unknown>) => {
    const momentId = `share-${Date.now()}`;
    const moment: ShareableMoment = {
      id: momentId,
      type: (params.type as ShareableMoment['type']) || 'moment',
      title: (params.title as string) || 'TCG Moment',
      content: (params.content as string) || '',
      mode: activeMode,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setShareables(prev => [...prev, moment]);

    // Background process for capture & save
    (async () => {
      const imageUrl = await captureAndUpload(momentId);
      await db.saveTrophy({ ...moment, image_url: imageUrl || null });
    })();

    return 'Moment saved to your Trophy Room!';
  }, [activeMode, captureAndUpload]);

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
    setCurrentResults({
      success: true,
      results: (params.results as SearchResult[]) || [],
      type: (params.type as UnifiedSearchResponse['type']) || 'locations',
      query: (params.query as string) || '',
      count: (params.results as any[])?.length || 0,
    });
    return 'Results displayed in UI';
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

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
          createShareableMoment: handleCreateShareable,
          switchMode: handleSwitchMode,
          openTool: handleOpenTool,
          updateGameState: handleUpdateGameState,
          displayResults: handleDisplayResults,
        },
        overrides: {
          agent: {
            prompt: {
              prompt: `
              ${userName 
                ? `The user's name is ${userName}. Greet them joyfully by name! ` 
                : `You do not know the user's name yet. Warmly ask for their name in your very first message so you can personalize the conversation! If they tell you, playfully celebrate their name! `}
              
              ${location 
                ? `The user's current location is: ${location}. Use this context when searching for places.` 
                : `The user has not shared their location. If they ask for location-specific things, ask where they are.`}
              
              Current mode: ${activeMode}.
              
              VIBE CHECK: Be extremely fun, energetic, and embody urban street-smart afrofuturism. Use slang naturally, do NOT be robotic. Keep it punchy!
              `,
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow mic access or use the text chat below.');
      } else {
        setErrorMessage('Could not connect. Check your internet and try again.');
      }
    }
  }, [conversation, handleCreateShareable, handleSwitchMode, handleOpenTool, location, activeMode]);

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
    // Text messages are handled through the ElevenLabs conversation context
    // The agent will see these via the transcript
  }, [addMessage]);

  // Auto-detect location
  const handleGetLocation = useCallback(() => {
    getDeviceLocation(
      (msg) => addMessage('system', msg),
      (err) => setErrorMessage(err)
    );
  }, [getDeviceLocation, addMessage]);

  // Derive button status
  const getButtonStatus = (): 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing' => {
    if (conversation.status === 'connecting') return 'connecting';
    if (conversation.status === 'connected') {
      if (conversation.isSpeaking) return 'speaking';
      return 'listening';
    }
    return 'idle';
  };

  return (
    <div className="page-container">
      {/* 1. Radical Multi-Layer Background */}
      <div className="radical-bg" />

      {/* 2. Distinct White Header Layer: Logo and Location */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', padding: 'max(16px, env(safe-area-inset-top)) 20px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)', borderRadius: '24px', margin: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <div style={{ width: 'min(140px, 30vw)', flexShrink: 0 }}>
            <img src="/TCG.png" alt="TCG Logo" style={{ width: '100%', height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))' }} />
          </div>
          
          {/* Location Wrapper */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 30 }}>
            {showLocationInput ? (
              <div style={{ background: '#fffbe6', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center', width: '100%', maxWidth: '400px', animation: 'slide-down-toast 0.2s', borderRadius: '16px', border: '2px solid #FFE600', boxShadow: '0 4px 12px rgba(255,230,0,0.15)' }}>
                <textarea
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Edit full address..."
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#000', fontSize: '0.85rem', outline: 'none', minHeight: '40px', resize: 'none', fontFamily: 'inherit', padding: '4px 0' }}
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
                  <button onClick={handleGetLocation} disabled={isGettingLocation} style={{ background: '#FFE600', border: '2px solid #d4b800', color: '#000', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 800 }}>{isGettingLocation ? '...' : 'Auto'}</button>
                  {location.trim() && <button onClick={() => setShowLocationInput(false)} style={{ background: 'var(--accent-green)', border: 'none', color: '#000', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 900 }}>OK</button>}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLocationInput(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-full)', border: '2px solid #FFE600', background: '#fffbe6', color: '#8a6000', fontSize: '0.75rem', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 700, boxShadow: '0 2px 8px rgba(255,230,0,0.2)' }}
              >
                📍 {location || "Set Your Location"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tools Panel Overlay (shown when Tools mode is active) */}
      {activeMode === 'tools' && (
        <ToolsPanel activeTool={activeToolId as any} />
      )}

      {/* Floating Modes (Pushed below header) */}
      <div style={{ position: 'absolute', top: '160px', left: 0, right: 0, zIndex: 15, display: 'flex', justifyContent: 'center' }}>
        <div className="glass-overlay" style={{ padding: '8px', borderRadius: 'var(--radius-full)' }}>
          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
        </div>
      </div>

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
          color={activeMode === 'locator' ? 'var(--accent-green)' : activeMode === 'plug' ? 'var(--accent-gold)' : 'var(--accent-red)'}
        />
      </div>

      {/* 5. Majestic Anchored Character Avatar */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '-5vh', // Anchor him slightly below the screen edge to look rooted
          left: '50%', 
          transform: `translateX(-50%) ${conversation.isSpeaking ? 'scale(1.05)' : 'scale(1)'}`, 
          zIndex: 5, 
          width: '120vw', 
          maxWidth: '500px',
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
          src="/TCG character.png" 
          alt="The Cruise God"
          style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} 
        />
      </div>

      {/* Floating Action Button for Chat Mode */
      isStarted && (
        <button
          onClick={() => setShowTranscript(prev => !prev)}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px', // Moved to the left to avoid overlapping character on the right
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--accent-gold)',
            border: 'none',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(255, 230, 0, 0.4)',
            zIndex: 60,
            transition: 'transform 0.1s ease-in-out'
          }}
          aria-label="Toggle Text Chat"
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {showTranscript ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          )}
        </button>
      )}

      {/* Transcript Drawer Overlay */}
      <div className={`transcript-drawer ${showTranscript ? 'open' : ''}`}>
        <AnimatePresence mode="wait">
          {activeMode === 'game-master' && gameStatus && (
            <GameSession 
              key="game-session"
              gameStatus={gameStatus} 
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
          />
        </AnimatePresence>
      </div>

      {/* 8. Splash Screen Overlay */}
      {!isStarted && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(9, 9, 11, 0.6)', // Increased opacity slightly
          backdropFilter: 'blur(10px)', // Drastically reduced blur radius for cheap rendering
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center'
        }}>
          <img src="/TCG.png" alt="TCG Character" style={{ width: '320px', height: 'auto', marginBottom: '48px', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))', animation: 'idle-float 4s infinite ease-in-out', willChange: 'transform' }} />
          <button 
            className="chunky-button"
            onClick={() => {
              setIsStarted(true);
              startConversation();
            }}
            style={{ transform: 'translateZ(0)' }} // GPU acceleration
          >
            TAP TO ENTER
          </button>
        </div>
      )}
    </div>
  );
}
