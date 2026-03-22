'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Profile Authentication Error]', error);
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
      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👤⚠️</div>
      <h2 style={{
        fontSize: '1.5rem',
        fontFamily: 'var(--font-display)',
        marginBottom: '12px',
        color: 'var(--accent-red)'
      }}>
        Profile Access Error
      </h2>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        maxWidth: '300px',
        lineHeight: 1.5,
        marginBottom: '24px'
      }}>
        There was an issue authenticating your Wingman Profile preferences.
      </p>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-glass)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          Try Reloading
        </button>
        <Link 
          href="/login"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--gradient-primary)',
            color: 'var(--bg-primary)',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          Sign In Again
        </Link>
      </div>
    </div>
  );
}
