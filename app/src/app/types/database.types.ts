export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      trophies: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: string
          mode: string
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string // Handled by Supabase anon/auth but generated automatically if needed
          type: string
          title: string
          content: string
          mode: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: string
          mode?: string
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
