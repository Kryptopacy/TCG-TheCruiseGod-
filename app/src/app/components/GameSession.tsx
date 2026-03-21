'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TCGGameStatus } from '@/app/lib/gameState';

interface GameSessionProps {
  gameStatus: TCGGameStatus;
  onEndGame?: () => void;
}

export default function GameSession({ gameStatus, onEndGame }: GameSessionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card-heavy"
      style={{
        margin: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(224, 64, 251, 0.3)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2 className="gradient-text" style={{ 
          fontSize: '1.8rem', 
          fontWeight: 900,
          background: 'var(--gradient-fire)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {gameStatus.gameName}
        </h2>
        <div className="mode-badge game-master" style={{ marginTop: '8px' }}>
          🎮 LIVE SESSION
        </div>
      </div>

      {gameStatus.timer !== undefined && (
        <div style={{
          fontSize: '3rem',
          fontWeight: 800,
          textAlign: 'center',
          fontFamily: 'monospace',
          color: 'var(--accent-magenta)',
          textShadow: '0 0 20px rgba(224, 64, 251, 0.5)',
        }}>
          {Math.floor(gameStatus.timer / 60)}:{(gameStatus.timer % 60).toString().padStart(2, '0')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Leaderboard
        </h4>
        {gameStatus.players.map((player) => (
          <div
            key={player.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-md)',
              border: player.id === gameStatus.currentTurn ? '1px solid var(--accent-magenta)' : '1px solid transparent',
              boxShadow: player.id === gameStatus.currentTurn ? '0 0 15px rgba(224, 64, 251, 0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {player.id === gameStatus.currentTurn && <span style={{ color: 'var(--accent-magenta)' }}>⚡</span>}
              <span style={{ fontWeight: 600 }}>{player.name}</span>
            </div>
            <span style={{ 
              fontWeight: 800, 
              color: 'var(--accent-cyan)',
              fontSize: '1.2rem',
            }}>
              {player.score}
            </span>
          </div>
        ))}
      </div>

      {gameStatus.rulesSummary && (
        <div style={{
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          borderLeft: '2px solid var(--accent-magenta)',
        }}>
          <strong>Rules:</strong> {gameStatus.rulesSummary}
        </div>
      )}

      {onEndGame && (
        <button
          onClick={onEndGame}
          style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 82, 82, 0.1)',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            color: 'var(--accent-red)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          End Game
        </button>
      )}
    </motion.div>
  );
}
