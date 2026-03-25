'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'kryptopacy@gmail.com';
const ADMIN_PASSWORD = 'tcghackathon';

// We initialize Supabase to check the live-mode admin login.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminDashboard() {
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Check cookie on mount
    const isDemo = document.cookie.includes('tcg_demo_mode=true');
    setDemoMode(isDemo);

    const checkAuth = async () => {
      // Demo Mode: Requires hardcoded "tcg_admin_auth" session storage (or password entry UI below)
      if (isDemo) {
        if (sessionStorage.getItem('tcg_admin_auth') === 'true') {
          setIsAuthorized(true);
        }
      } else {
        // Live Mode: Requires Supabase JWT with specific admin email
        if (supabaseUrl && supabaseKey) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email === ADMIN_EMAIL) {
            setIsAuthorized(true);
          }
        }
      }
      setAuthChecking(false);
    };
    
    checkAuth();
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthorized(true);
      sessionStorage.setItem('tcg_admin_auth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  };

  const toggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    if (enabled) {
      document.cookie = "tcg_demo_mode=true; path=/; max-age=31536000;";
      setNotification("Hackathon Demo Mode ENABLED. All auth bypassed. Using localStorage.");
    } else {
      document.cookie = "tcg_demo_mode=false; path=/; max-age=0;"; // Delete cookie
      setNotification("Production Mode ENABLED. Using Supabase Auth and DB.");
      
      // If switching out of demo mode into live mode, force re-authorization via Supabase email check
      sessionStorage.removeItem('tcg_admin_auth');
      setIsAuthorized(false);
    }

    setTimeout(() => setNotification(null), 4000);
  };

  if (authChecking) {
    return <div style={{ minHeight: '100dvh', background: '#0B0C10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Console...</div>;
  }

  // Intercept the render if not authorized
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0B0C10', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#00E5FF', marginBottom: '16px' }}>TCG Admin Access Required</h2>
        
        {demoMode ? (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '300px' }}>
            <p style={{ color: '#A0AAB2', fontSize: '0.9rem', textAlign: 'center', marginBottom: '8px' }}>
              Hackathon Demo Mode is active. Enter the admin password to unlock the console.
            </p>
            <input 
              type="password" 
              placeholder="Admin Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
            />
            {passwordError && <div style={{ color: '#FF2A2A', fontSize: '0.8rem', textAlign: 'center' }}>{passwordError}</div>}
            <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: '#00E5FF', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              Unlock Console
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', color: '#A0AAB2', maxWidth: '400px', lineHeight: 1.6 }}>
            <p>Live production mode is currently active.</p>
            <p>You must be logged into the main app with the approved admin email (<strong style={{color: '#fff'}}>{ADMIN_EMAIL}</strong>) to access this page.</p>
            <a href="/" style={{ color: '#00E5FF', display: 'inline-block', marginTop: '16px', textDecoration: 'none', fontWeight: 'bold' }}>Return to App & Login</a>
          </div>
        )}
      </div>
    );
  }

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
