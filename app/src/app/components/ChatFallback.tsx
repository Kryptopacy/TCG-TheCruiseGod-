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
  replyTo?: { author: string; preview: string };
}

interface ChatFallbackProps {
  messages: Message[];
  currentResults: UnifiedSearchResponse | null;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  isAgentSpeaking: boolean;
  onPushImage?: (imageUrl: string) => void;
  cruiseId?: string; // user's CruiseID to display on own bubbles
}

/** Parse @mentions in a string and wrap them in a styled span */
function renderWithMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.match(/^@\w+$/) ? (
      <span key={i} className="mention-tag">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function ChatFallback({
  messages,
  currentResults,
  onSendMessage,
  isConnected,
  isAgentSpeaking,
  onPushImage,
  cruiseId,
}: ChatFallbackProps) {
  const [input, setInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ author: string; preview: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    const text = replyTarget
      ? `↩ @${replyTarget.author}: ${input.trim()}`
      : input.trim();
    onSendMessage(text);
    setInput('');
    setReplyTarget(null);
  };

  const getAuthorLabel = (msg: Message) => {
    if (msg.role === 'agent') return 'TCG 🔥';
    if (msg.role === 'user') return cruiseId || 'You';
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Drawer header */}
      <div style={{
        padding: '8px 16px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,150,0,0.12)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.78rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: 'linear-gradient(90deg, #FFE600, #FF6B00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Chat with TCG</span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,200,80,0.45)', fontWeight: 600 }}>
          {isConnected ? '🟢 Live' : '⚪ Offline'}
        </span>
      </div>

      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="transcript-area"
        style={{ flex: 1, overflowY: 'auto' }}
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
            <span style={{ fontSize: '2.5rem' }}>🔥</span>
            <p style={{
              color: 'rgba(255, 200, 80, 0.5)',
              fontSize: '0.85rem',
              maxWidth: '260px',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              Tap the mic or type below to start vibing with TCG
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isAgent = msg.role === 'agent';
          const isSystem = msg.role === 'system';
          const author = getAuthorLabel(msg);

          return (
            <div
              key={msg.id}
              className={`transcript-bubble ${msg.role}`}
              style={{ position: 'relative' }}
            >
              {/* CruiseID tag on user bubbles */}
              {isUser && (
                <span className="cruise-id-tag">
                  🚢 {cruiseId || 'You'}
                </span>
              )}

              {/* Agent label */}
              {isAgent && !isSystem && (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: '#FF8C00',
                  marginBottom: '5px',
                  fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  TCG 🔥
                </div>
              )}

              {/* Reply quote (if this message replied to something) */}
              {msg.replyTo && (
                <div className="reply-quote">
                  <strong style={{ color: '#FF8C00', fontSize: '0.68rem' }}>↩ {msg.replyTo.author}</strong>
                  <div>{msg.replyTo.preview}</div>
                </div>
              )}

              {/* Message content */}
              <div>
                {renderWithMentions(msg.content)}
                {msg.metadata?.image && (
                  <div style={{ marginTop: '10px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,150,0,0.2)' }}>
                    <img src={msg.metadata.image} alt="Shared" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    {onPushImage && (
                      <button
                        onClick={() => onPushImage(msg.metadata!.image!)}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'linear-gradient(135deg, #FF8C00, #CC1010)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                    