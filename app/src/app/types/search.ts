export type SearchType = 'locations' | 'games' | 'plugs';

export interface SearchRequest {
  query: string;
  type: SearchType;
  location?: string;
  num_people?: number;
  energy_level?: 'chill' | 'medium' | 'chaotic' | 'wild';
  setting?: string;
  urgent?: boolean;
  limit?: number;
}

export interface SearchResult {
  position: number;
  title: string;
  url: string;
  description: string;
  name?: string;
  rules_content?: string;
}

export interface UnifiedSearchResponse {
  success: boolean;
  results: SearchResult[];
  count?: number;
  type: SearchType;
  query: string;
  empty?: boolean;
  partial?: boolean;
  suggestion?: string;
  from_cache?: boolean;
  error?: string;
  retryable?: boolean;
}
