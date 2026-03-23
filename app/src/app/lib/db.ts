/**
 * TCG Database Layer (Persistence Foundation)
 * 
 * This module provides a unified interface for storing and retrieving 
 * TCG data (Trophies, User Sessions, Analytics).
 * 
 * Current Phase: Preparation for Supabase / PostgreSQL integration.
 */

import { Memory } from '@/app/types/sharing';
import { createClient } from '@/utils/supabase/client';

export interface DBClient {
  saveTrophy: (trophy: Memory) => Promise<boolean>;
  getTrophies: (limit?: number) => Promise<Memory[]>;
  deleteTrophy: (id: string) => Promise<boolean>;
}

// Supabase implementation
const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const db: DBClient = {
  saveTrophy: async (trophy) => {
    try {
      if (isDemoMode()) {
        const existing = JSON.parse(localStorage.getItem('tcg_trophies') || '[]');
        localStorage.setItem('tcg_trophies', JSON.stringify([{
           ...trophy, 
           user_id: trophy.user_id || 'demo-user',
           created_at: trophy.created_at || new Date(trophy.timestamp).toISOString()
        }, ...existing]));
        return true;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('trophies').insert({
        id: trophy.id,
        // user_id is auto-populated by Postgres default value `auth.uid()` based on RLS
        type: trophy.type,
        title: trophy.title,
        content: trophy.content,
        mode: trophy.mode,
        image_url: trophy.image_url || null,
        created_at: new Date(trophy.timestamp).toISOString()
      });

      if (error) {
        console.error('[DB] Failed to save trophy:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[DB] Exception saving trophy:', err);
      return false;
    }
  },

  getTrophies: async (limit) => {
    try {
      if (isDemoMode()) {
        const existing: Memory[] = JSON.parse(localStorage.getItem('tcg_trophies') || '[]');
        return limit ? existing.slice(0, limit) : existing;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('trophies')
        .select('id, type, title, content, mode, image_url, created_at, user_id') // Best Practice: explicit columns
        // Best Practice: Omit .eq('user_id', user.id) - Postgres RLS handles this securely at the DB layer
        .order('created_at', { ascending: false });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map(row => ({
        id: row.id,
        type: row.type as Memory['type'],
        title: row.title,
        content: row.content,
        mode: row.mode as Memory['mode'],
        image_url: row.image_url || undefined,
        timestamp: row.created_at,
        user_id: row.user_id
      }));
    } catch {
      return [];
    }
  },

  deleteTrophy: async (id) => {
    try {
      if (isDemoMode()) {
        const existing: Memory[] = JSON.parse(localStorage.getItem('tcg_trophies') || '[]');
        const updated = existing.filter((t: Memory) => t.id !== id);
        localStorage.setItem('tcg_trophies', JSON.stringify(updated));
        return true;
      }

      const supabase = createClient();
      // Best practice: rely on RLS to ensure a user can only delete their own row
      const { error } = await supabase.from('trophies').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
};
