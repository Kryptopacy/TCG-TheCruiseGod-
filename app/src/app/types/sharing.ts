import { TCGMode } from '@/app/components/ModeSelector';

export interface ShareableMoment {
  id: string;
  type: 'game_result' | 'recommendation' | 'moment';
  title: string;
  content: string;
  mode: TCGMode;
  timestamp: Date;
}
