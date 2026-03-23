'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function TrophyRoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to Sentry
    console.error('[Trophy Room Error]', error);
  }, [error]);

  return (
    <div className="page-container" style={{ 
      minHeight: '100dvh', 
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆⚠️</div>
      <h2 style={{
        fontSize: '1.5rem',
        fontFamily: 'var(--font-display)',
        marginBottom: '12px',
        color: 'var(--accent-red)'
      }}>
        Trophy Room Unavailable
      </h2>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        maxWidth: '300px',
        lineHeight: 1.5,
        marginBottom: '24px'
      }}>
        We ran into an issue loading your memories. The vault may be temporarily locked.
      </p>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--gradient-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          Try Again
        </button>
        <Link 
          href="/"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          Back to Cruising
        </Link>
      </div>
    </div>
  );
}
