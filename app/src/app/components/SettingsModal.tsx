'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SettingsModal({
  isOpen,
  onClose,
  initialName,
  onSaveName,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onSaveName: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Sync with Supabase Auth user_metadata
        await supabase.auth.updateUser({
          data: { display_name: name.trim() }
        });
      }
      
      // Always save to localStorage as fallback
      localStorage.setItem('tcg_userName', name.trim());
      onSaveName(name.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', width: '90%', maxWidth: '400px', color: '#fff' }}>
        <h2 style={{ margin: '0 0 16px', color: 'var(--accent-cyan)' }}>⚙️ Preferences</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            Your Permanent CruiseID
          </label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maverick"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px', borderRadius: '12px', outline: 'none', fontSize: '1rem' }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
            This name will dynamically sync to your profile and be used when you join active CruiseHQ rooms.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleSave} disabled={isSaving} style={{ flex: 1, background: 'var(--accent-cyan)', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 900, cursor: isSaving ? 'default' : 'pointer' }}>
            {isSaving ? 'SAVING...' : 'SAVE'}
          </button>
          <button onClick={onClose} disabled={isSaving} style={{ padding: '12px 20px', background: 'transparent', color: '#fff', border: 'none', cursor: isSaving ? 'default' : 'pointer', fontWeight: 700 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
