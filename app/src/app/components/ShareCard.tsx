'use client';

import React from 'react';
import { Memory } from '@/app/types/sharing';

interface ShareCardProps {
  moment: Memory;
  id?: string;
}

export default function ShareCard({ moment, id = 'share-card-visual' }: ShareCardProps) {
  const getModeLabel = () => {
    switch (moment.mode) {
      case 'locator': return '📍 THE SPOT';
      case 'plug': return '🔌 THE PLUG';
      case 'game-master': return '🎮 THE GAME';
      default: return '✨ MOMENT';
    }
  };

  const getGradient = () => {
    switch (moment.mode) {
      case 'locator': return 'var(--gradient-cool)';
      case 'plug': return 'var(--gradient-warm)';
      case 'game-master': return 'var(--gradient-fire)';
      default: return 'var(--gradient-primary)';
    }
  };

  return (
    <div
      id={id}
      className="share-card"
      style={{
        width: '100%',
        maxWidth: '400px',
        aspectRatio: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px',
        textAlign: 'center',
        background: `linear-gradient(135deg, #0a0a1f 0%, #000 100%), ${getGradient()}`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      }}
    >
      <div className="share-card-content">
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          color: 'var(--text-muted)',
        }}>
          {getModeLabel()}
        </div>

        <h2 style={{
          fontSize: '2rem',
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          lineHeight: '1.1',
          marginBottom: '16px',
          background: getGradient(),
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))',
        }}>
          {moment.title}
        </h2>

        <div style={{
          width: '40px',
          height: '2px',
          background: 'rgba(255,255,255,0.2)',
          margin: '0 auto 24px',
        }} />

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          fontWeight: 500,
          opacity: 0.9,
        }}>
          "{moment.content}"
        </p>

        <div style={{
          marginTop: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            TCG
          </div>
          <div style={{
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            The Cruise God
          </div>
        </div>
      </div>
    </div>
  );
}
