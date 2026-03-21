/**
 * TCG Database Layer (Persistence Foundation)
 * 
 * This module provides a unified interface for storing and retrieving 
 * TCG data (Trophies, User Sessions, Analytics).
 * 
 * Current Phase: Preparation for Supabase / PostgreSQL integration.
 */

import { ShareableMoment } from '@/app/types/sharing';

export interface DBClient {
  saveTrophy: (trophy: ShareableMoment) => Promise<boolean>;
  getTrophies: (limit?: number) => Promise<ShareableMoment[]>;
  deleteTrophy: (id: string) => Promise<boolean>;
}

// Stub implementation using localStorage (fallback)
export const db: DBClient = {
  saveTrophy: async (trophy) => {
    if (typeof window === 'undefined') return false;
    try {
      const existing = JSON.parse(localStorage.getItem('tcg-trophies') || '[]');
      existing.push(trophy);
      localStorage.setItem('tcg-trophies', JSON.stringify(existing));
      return true;
    } catch {
      return false;
    }
  },

  getTrophies: async (limit) => {
    if (typeof window === 'undefined') return [];
    try {
      const existing = JSON.parse(localStorage.getItem('tcg-trophies') || '[]');
      const sorted = existing.reverse();
      return limit ? sorted.slice(0, limit) : sorted;
    } catch {
      return [];
    }
  },

  deleteTrophy: async (id) => {
    if (typeof window === 'undefined') return false;
    try {
      const existing = JSON.parse(localStorage.getItem('tcg-trophies') || '[]');
      const filtered = existing.filter((t: any) => t.id !== id);
      localStorage.setItem('tcg-trophies', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * PRODUCTION NOTE: 
 * When migrating to Supabase, replace this stub with:
 * import { createClient } from '@supabase/supabase-js'
 * export const supabase = createClient(...)
 */
