export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface TCGGameStatus {
  gameName: string;
  status: 'lobby' | 'playing' | 'ended';
  players: Player[];
  currentTurn?: string;
  timer?: number; // seconds
  rulesSummary?: string;
}
