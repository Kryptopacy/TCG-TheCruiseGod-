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
import { captureShareCard, shareImage } from '@/app/lib/shareUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
}

interface ShareableMoment {
  id: string;
  type: 'game_result' | 'recommendation' | 'moment';
  title: string;
  content: string;
  mode: TCGMode;
  timestamp: Date;
}

export default function ConversationManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<TCGMode>('locator');
  const [shareables, setShareables] = useState<ShareableMoment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<string>('');
  const [showLocationInput, setShowLocationInput] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [gameStatus, setGameStatus] = useState<TCGGameStatus | null>(null);
  const [currentResults, setCurrentResults] = useState<UnifiedSearchResponse | null>(null);
  const messageIdCounter = useRef(0);

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
    const moment: ShareableMoment = {
      id: `share-${Date.now()}`,
      type: (params.type as ShareableMoment['type']) || 'moment',
      title: (params.title as string) || 'TCG Moment',
      content: (params.content as string) || '',
      mode: activeMode,
      timestamp: new Date(),
    };
    setShareables(prev => [...prev, moment]);

    // Save to localStorage for Trophy Room
    try {
      const existing = JSON.parse(localStorage.getItem('tcg-trophies') || '[]');
      existing.push(moment);
      localStorage.setItem('tcg-trophies', JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to save trophy:', e);
    }

    return 'Moment saved to your Trophy Room!';
  }, [activeMode]);

  const handleSwitchMode = useCallback((params: Record<string, unknown>) => {
    const mode = params.mode as TCGMode;
    if (['locator', 'plug', 'game-master'].includes(mode)) {
      setActiveMode(mode);
      if (mode !== 'game-master') setGameStatus(null);
      return `Mode switched to ${mode}`;
    }
    return 'Failed: Invalid mode';
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
          updateGameState: handleUpdateGameState,
          displayResults: handleDisplayResults,
        },
        overrides: {
          agent: {
            prompt: {
              prompt: location
                ? `The user's current location is: ${location}. Use this context when searching for places, services, or local recommendations. Current mode: ${activeMode}.`
                : `The user has not shared their location yet. If they ask for location-based recommendations, ask them where they are. Current mode: ${activeMode}.`,
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
  }, [conversation, handleCreateShareable, handleSwitchMode, location, activeMode]);

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
  const getDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation not available on this device.');
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using Google Maps
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.results?.[0]) {
            const addr = data.results[0].formatted_address;
            setLocation(addr);
            setShowLocationInput(false);
            addMessage('system', `📍 Location set: ${addr}`);
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            setShowLocationInput(false);
          }
        } catch {
          setLocation(`Lat/Lng detected`);
          setShowLocationInput(false);
        }
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setErrorMessage('Could not get location. You can type it manually below.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [addMessage]);

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
    <div className="page-container" style={{ height: '100dvh' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 className="gradient-text" style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}>
              TCG
            </h1>
            <p style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              The Cruise God
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {shareables.length > 0 && (
              <a
                href="/trophy-room"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--accent-gold)',
                }}
              >
                🏆 {shareables.length}
              </a>
            )}

            {location && (
              <button
                onClick={() => setShowLocationInput(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  maxWidth: '150px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                📍 {location}
              </button>
            )}
          </div>
        </div>

        {/* Location input */}
        {showLocationInput && (
          <div className="glass-card" style={{
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            animation: 'slide-up 0.3s ease-out',
          }}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where are you? (e.g. Downtown Chicago)"
              className="chat-input"
              style={{ flex: 1, padding: '10px 16px', fontSize: '0.85rem' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && location.trim()) {
                  setShowLocationInput(false);
                  addMessage('system', `📍 Location set: ${location}`);
                }
              }}
            />
            <button
              onClick={getDeviceLocation}
              disabled={isGettingLocation}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-accent)',
                background: 'rgba(0, 229, 255, 0.1)',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
              }}
              aria-label="Use device location"
            >
              {isGettingLocation ? '...' : '📍 Auto'}
            </button>
            {location.trim() && (
              <button
                onClick={() => {
                  setShowLocationInput(false);
                  addMessage('system', `📍 Location set: ${location}`);
                }}
                className="send-btn"
                style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}
              >
                ✓
              </button>
            )}
          </div>
        )}

        {/* Mode selector */}
        <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
      </header>

      {/* Error banner */}
      {errorMessage && (
        <div style={{
          margin: '0 16px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 82, 82, 0.1)',
          border: '1px solid rgba(255, 82, 82, 0.3)',
          color: 'var(--accent-red)',
          fontSize: '0.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'slide-up 0.3s ease-out',
        }}>
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-red)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat transcript / Results */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
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

      {/* Voice button dock */}
      <div style={{
        padding: '12px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)',
        position: 'relative',
      }}>
        <WaveformVisualizer 
          isSpeaking={conversation.isSpeaking} 
          isListening={conversation.status === 'connected' && !conversation.isSpeaking}
          color={activeMode === 'locator' ? 'var(--accent-cyan)' : activeMode === 'plug' ? 'var(--accent-gold)' : 'var(--accent-magenta)'}
        />
        
        <VoiceButton
          status={getButtonStatus()}
          onClick={toggleConversation}
        />
      </div>
    </div>
  );
}
