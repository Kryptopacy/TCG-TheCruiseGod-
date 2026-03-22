'use client';

import React from 'react';

export type TCGMode = 'locator' | 'plug' | 'game-master' | 'tools';

interface ModeSelectorProps {
  activeMode: TCGMode;
  onModeChange: (mode: TCGMode) => void;
}

const modes: { id: TCGMode; label: string; icon: string; desc: string }[] = [
  { id: 'locator', label: 'Locator', icon: '📍', desc: 'Find spots & vibes' },
  { id: 'plug', label: 'The Plug', icon: '🔌', desc: 'Find services' },
  { id: 'game-master', label: 'Game Master', icon: '🎮', desc: 'Run the fun' },
  { id: 'tools', label: 'Tools', icon: '🎲', desc: 'Party tools' },
];

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '16px 8px',
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
              padding: '10px 20px',
              borderRadius: '30px',
              background: isActive
                ? mode.id === 'locator' ? 'rgba(0, 240, 255, 0.15)'
                  : mode.id === 'plug' ? 'rgba(255, 215, 0, 0.15)'
                  : mode.id === 'tools' ? 'rgba(255, 140, 0, 0.15)'
                    : 'rgba(248, 0, 177, 0.15)'
                : 'rgba(255, 255, 255, 0.03)',
              borderColor: isActive
                ? mode.id === 'locator' ? 'rgba(0, 240, 255, 0.6)'
                  : mode.id === 'plug' ? 'rgba(255, 215, 0, 0.6)'
                  : mode.id === 'tools' ? 'rgba(255, 140, 0, 0.6)'
                    : 'rgba(248, 0, 177, 0.6)'
                : 'rgba(255, 255, 255, 0.08)',
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
