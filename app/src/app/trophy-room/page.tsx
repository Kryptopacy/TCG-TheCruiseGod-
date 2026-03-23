'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/app/lib/db';
import { Memory } from '@/app/types/sharing';

export default function TrophyRoom() {
  const [trophies, setTrophies] = useState<Memory[]>([]);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrophies() {
      try {
        const fetched = await db.getTrophies();
        setTrophies(fetched);
      } catch {
        setTrophies([]);
      }
    }
    loadTrophies();
  }, []);

  const handleShare = async (trophy: Memory) => {
    const shareText = `🏆 ${trophy.title}\n\n${trophy.content}\n\n🎤 Powered by TCG — The Cruise God\n#ElevenHacks @firecrawl @elevenlabs`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `TCG — ${trophy.title}`,
          text: shareText,
        });
        setShareStatus('Shared! 🎉');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText);
          setShareStatus('Copied to clipboard! 📋');
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      setShareStatus('Copied to clipboard! 📋');
    }

    setTimeout(() => setShareStatus(null), 3000);
  };

  const handleDelete = async (id: string) => {
    // Optimistic UI update
    const updated = trophies.filter(t => t.id !== id);
    setTrophies(updated);
    
    // Background DB delete
    await db.deleteTrophy(id);
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'locator': return 'var(--accent-cyan)';
      case 'plug': return 'var(--accent-gold)';
      case 'game-master': return 'var(--accent-magenta)';
      default: return 'var(--text-secondary)';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'locator': return '📍';
      case 'plug': return '🔌';
      case 'game-master': return '🎮';
      default: return '✨';
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100dvh', padding: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <a href="/" style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '8px',
          }}>
            ← Back to TCG
          </a>
          <h1 style={{
            fontSize: '1.8rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
          }}>
            🏆 Trophy Room
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
          }}>
            Your captured memories from TCG sessions
          </p>
        </div>
      </div>

      {/* Share status toast */}
      {shareStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(105, 240, 174, 0.15)',
          border: '1px solid rgba(105, 240, 174, 0.3)',
          color: 'var(--accent-green)',
          fontSize: '0.85rem',
          fontWeight: 600,
          zIndex: 100,
          animation: 'slide-up 0.3s ease-out',
        }}>
          {shareStatus}
        </div>
      )}

      {/* Empty state */}
      {trophies.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
          <h2 style={{
            fontSize: '1.2rem',
            fontFamily: 'var(--font-display)',
            marginBottom: '8px',
          }}>
            No trophies yet
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            maxWidth: '280px',
            lineHeight: 1.5,
          }}>
            Start a conversation with TCG and your best moments will show up here for sharing.
          </p>
          <a href="/" style={{
            marginTop: '24px',
            padding: '12px 24px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--gradient-primary)',
            color: 'var(--bg-primary)',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}>
            Start Cruising
          </a>
        </div>
      )}

      {/* Trophy grid */}
      <div className="trophy-grid">
        {trophies.map((trophy) => (
          <div key={trophy.id} className="share-card" style={{ padding: '20px' }}>
            <div className="share-card-content">
              {/* Mode badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: getModeColor(trophy.mode),
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {getModeIcon(trophy.mode)} {trophy.mode.replace('-', ' ')}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                }}>
                  {new Date(trophy.timestamp).toLocaleDateString()}
                </span>
              </div>

              {/* Content */}
              <h3 style={{
                fontSize: '1.1rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                marginBottom: '8px',
              }}>
                {trophy.title}
              </h3>
              <p style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: trophy.image_url ? '12px' : '16px',
              }}>
                {trophy.content}
              </p>

              {/* Attached Screenshot */}
              {trophy.image_url && (
                <div style={{
                  marginBottom: '16px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={trophy.image_url} alt="Session Moment" style={{ width: '100%', display: 'block' }} />
                </div>
              )}

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <button
                  onClick={() => handleShare(trophy)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--gradient-primary)',
                    color: 'var(--bg-primary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Share 🔥
                </button>
                <button
                  onClick={() => handleDelete(trophy.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255, 82, 82, 0.3)',
                    background: 'rgba(255, 82, 82, 0.1)',
                    color: 'var(--accent-red)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
