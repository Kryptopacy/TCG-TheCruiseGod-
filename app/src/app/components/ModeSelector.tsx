'use client';

import React from 'react';

export type TCGMode = 'locator' | 'plug' | 'game-master' | 'tools';

interface ModeSelectorProps {
  activeMode: TCGMode;
  onModeChange: (mode: TCGMode) => void;
}

// Tools is intentionally excluded from the pill — it lives in the side action stack
const modes: { id: Exclude<TCGMode, 'tools'>; label: string; svgPath: string }[] = [
  {
    id: 'locator',
    label: 'Locator',
    svgPath: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  },
  {
    id: 'plug',
    label: 'The Plug',
    svgPath: 'M16 7V3h-2v4H10V3H8v4c0 2.1 1.4 3.84 3.33 4.38V21h1.34v-9.62C14.6 10.84 16 9.1 16 7zM7 8H5v7h2v3h2V8H7z',
  },
  {
    id: 'game-master',
    label: 'Game Master',
    svgPath: 'M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z',
  },
];

export default function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      justifyContent: 'center',
      flexWrap: 'nowrap',
    }}>
      {modes.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            style={{
              cursor: 'pointer',
              padding: 'clamp(6px, 1.5vw, 10px) clamp(8px, 2.5vw, 16px)',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: isActive ? 800 : 600,
              fontSize: 'clamp(0.6rem, 1.8vw, 0.74rem)',
              whiteSpace: 'nowrap',
              minHeight: 'unset',
              minWidth: 'unset',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(30, 6, 50, 0.98) 0%, rgba(18, 4, 32, 0.98) 100%)'
                : 'rgba(18, 4, 32, 0.78)',
              border: isActive
                ? '1.5px solid rgba(245, 200, 0, 0.7)'
                : '1.5px solid rgba(255, 255, 255, 0.12)',
              color: isActive ? '#F5C800' : 'rgba(255, 248, 231, 0.75)',
              boxShadow: isActive
                ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245,200,0,0.12) inset'
                : '0 2px 10px rgba(0,0,0,0.25)',
              transform: isActive ? 'scale(1.04)' : 'scale(1)',
            }}
            aria-label={`Switch to ${mode.label} mode`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}
            >
              <path d={mode.svgPath} />
            </svg>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
