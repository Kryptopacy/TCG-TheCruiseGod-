'use client';

import React from 'react';

export type TCGMode = 'locator' | 'plug' | 'game-master';

interface ModeSelectorProps {
  activeMode: TCGMode;
  onModeChange: (mode: TCGMode) => void;
}

const modes: { id: TCGMode; label: string; icon: string; desc: string }[] = [
  { id: 'locator', label: 'Locator', icon: '📍', desc: 'Find spots & vibes' },
  { id: 'plug', label: 'The Plug', icon: '🔌', desc: 'Find services' },
  { id: 'game-master', label: 'Game Master', icon: '🎮', desc: 'Run the fun' },
];

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      {modes.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`mode-badge ${mode.id}`}
            style={{
              cursor: 'pointer',
              padding: '8px 16px',
              background: isActive
                ? mode.id === 'locator' ? 'rgba(0, 229, 255, 0.2)'
                  : mode.id === 'plug' ? 'rgba(255, 215, 64, 0.2)'
                    : 'rgba(224, 64, 251, 0.2)'
                : 'var(--bg-card)',
              borderColor: isActive
                ? mode.id === 'locator' ? 'rgba(0, 229, 255, 0.5)'
                  : mode.id === 'plug' ? 'rgba(255, 215, 64, 0.5)'
                    : 'rgba(224, 64, 251, 0.5)'
                : 'var(--border-subtle)',
              transition: 'all 0.2s',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}
            aria-label={`Switch to ${mode.label} mode`}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
