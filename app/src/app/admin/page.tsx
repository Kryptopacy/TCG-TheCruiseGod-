'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    // Check cookie on mount
    const isDemo = document.cookie.includes('tcg_demo_mode=true');
    setDemoMode(isDemo);
  }, []);

  const toggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    if (enabled) {
      document.cookie = "tcg_demo_mode=true; path=/; max-age=31536000;";
      setNotification("Hackathon Demo Mode ENABLED. All auth bypassed. Using localStorage.");
    } else {
      document.cookie = "tcg_demo_mode=false; path=/; max-age=0;"; // Delete cookie
      setNotification("Production Mode ENABLED. Using Supabase Auth and DB.");
    }

    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      padding: '40px 20px',
      background: 'var(--bg-primary, #0B0C10)',
      color: 'var(--text-primary, #FFFFFF)',
      fontFamily: 'var(--font-display, sans-serif)'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--accent-cyan, #00E5FF)' }}>
          TCG Admin Console
        </h1>
        <p style={{ color: 'var(--text-secondary, #A0AAB2)', marginBottom: '32px' }}>
          Stealth control center for toggling app behavior.
        </p>

        {notification && (
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'rgba(105, 240, 174, 0.15)',
            border: '1px solid rgba(105, 240, 174, 0.3)',
            color: 'var(--accent-green, #69f0ae)',
            marginBottom: '24px',
            fontSize: '0.9rem',
            animation: 'slide-up 0.3s ease-out'
          }}>
            {notification}
          </div>
        )}

        <div style={{
          padding: '24px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Hackathon Demo Mode</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #6C7A89)', marginBottom: '24px', lineHeight: 1.5 }}>
            When enabled, TCG bypasses all Supabase authentication requirements. 
            Trophies are saved to and loaded from local browser storage instead of the database to prevent unauthenticated RLS violations during demos.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => toggleDemoMode(true)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: demoMode ? '2px solid var(--accent-cyan, #00E5FF)' : '1px solid rgba(255,255,255,0.2)',
                background: demoMode ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                color: demoMode ? 'var(--accent-cyan, #00E5FF)' : 'var(--text-secondary, #A0AAB2)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              Demo Mode (Local)
            </button>

            <button 
              onClick={() => toggleDemoMode(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: !demoMode ? '2px solid var(--accent-gold, #FFD700)' : '1px solid rgba(255,255,255,0.2)',
                background: !demoMode ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                color: !demoMode ? 'var(--accent-gold, #FFD700)' : 'var(--text-secondary, #A0AAB2)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              Production (Supabase)
            </button>
          </div>
        </div>

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
          <a href="/" style={{ color: 'var(--text-secondary, #A0AAB2)', fontSize: '0.9rem', textDecoration: 'underline' }}>
            Return to App
          </a>
        </div>
      </div>
    </div>
  );
}
