'use client';

import React, { useState, useRef, useEffect } from 'react';
import ResultCard from './ResultCard';
import { UnifiedSearchResponse } from '@/app/types/search';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    image?: string;
  };
}

interface ChatFallbackProps {
  messages: Message[];
  currentResults: UnifiedSearchResponse | null;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  isAgentSpeaking: boolean;
  onPushImage?: (imageUrl: string) => void;
}

export default function ChatFallback({ messages, currentResults, onSendMessage, isConnected, isAgentSpeaking, onPushImage }: ChatFallbackProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
    }}>
      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="transcript-area"
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '8px',
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: '2rem',
            }}>🎤</span>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              maxWidth: '280px',
              lineHeight: 1.5,
            }}>
              Tap the mic or type below to start vibing with TCG
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`transcript-bubble ${msg.role}`}
          >
            {msg.role === 'agent' && (
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--accent-magenta)',
                marginBottom: '4px',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                TCG
              </div>
            )}
            <div>
              {msg.content}
              {msg.metadata?.image && (
                <div style={{ marginTop: '12px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={msg.metadata.image} alt="Shared" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  {onPushImage && (
                    <button 
                      onClick={() => onPushImage(msg.metadata!.image!)}
                      style={{ 
                        position: 'absolute', 
                        bottom: '8px', 
                        right: '8px', 
                        background: 'var(--accent-magenta)', 
                        color: '#fff', 
                        border: 'none', 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(224, 64, 251, 0.4)'
                      }}
                    >
                      PUSH TO SCREEN 📺
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {currentResults && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            margin: '12px 0',
            animation: 'slide-up 0.4s ease-out',
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              fontWeight: 600, 
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>Found {currentResults.results.length} results</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>
            {currentResults.results.map((res, idx) => (
              <ResultCard key={`${res.title}-${idx}`} result={res} type={currentResults.type} index={idx} />
            ))}
          </div>
        )}

        {isAgentSpeaking && (
          <div className="transcript-bubble agent">
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--accent-magenta)',
              marginBottom: '4px',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              TCG
            </div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <form onSubmit={handleSubmit} className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? "Type your message..." : "Connect to start chatting"}
          disabled={!isConnected}
          className="chat-input"
          id="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || !isConnected}
          className="send-btn"
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}
