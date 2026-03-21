'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchResult, SearchType } from '@/app/types/search';

interface ResultCardProps {
  result: SearchResult;
  type: SearchType;
  index: number;
}

export default function ResultCard({ result, type, index }: ResultCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'locations': return '📍';
      case 'games': return '🎮';
      case 'plugs': return '🔌';
      default: return '✨';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'locations': return 'var(--accent-cyan)';
      case 'games': return 'var(--accent-magenta)';
      case 'plugs': return 'var(--accent-gold)';
      default: return 'var(--text-accent)';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
      className="result-card"
      style={{
        marginBottom: '10px',
        borderLeft: `3px solid ${getAccentColor()}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 className="result-card-title">{result.title}</h3>
        <span style={{ fontSize: '1.2rem' }}>{getIcon()}</span>
      </div>

      <div className="result-card-meta">
        {type === 'locations' && <span>Venue</span>}
        {type === 'games' && <span>Party Game</span>}
        {type === 'plugs' && <span>Service</span>}
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.7rem', opacity: 0.6 }}
          >
            Visit Website ↗
          </a>
        )}
      </div>

      <p className="result-card-desc">{result.description}</p>

      {type === 'games' && result.rules_content && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          maxHeight: '150px',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-magenta)' }}>
            Rules Preview:
          </div>
          <div style={{ opacity: 0.8, whiteSpace: 'pre-wrap' }}>
            {result.rules_content.length > 300
              ? result.rules_content.substring(0, 300) + '...'
              : result.rules_content}
          </div>
        </div>
      )}
    </motion.div>
  );
}
