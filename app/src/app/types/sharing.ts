import { TCGMode } from '@/app/components/ModeSelector';
import { Database } from './database.types';

type TrophyRow = Database['public']['Tables']['trophies']['Row'];

export interface Memory extends Omit<TrophyRow, 'timestamp' | 'mode' | 'type' | 'user_id' | 'created_at' | 'image_url'> {
  type: 'game_result' | 'recommendation' | 'moment';
  mode: TCGMode;
  timestamp: Date | string;
  user_id?: string;
  created_at?: string;
  image_url?: string | null;
}
