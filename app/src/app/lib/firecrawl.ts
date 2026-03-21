import { SearchType, SearchRequest, SearchResult, UnifiedSearchResponse } from '@/app/types/search';

function buildSearchQuery(req: SearchRequest): string {
  const parts: string[] = [req.query];

  switch (req.type) {
    case 'locations':
      if (req.location) parts.push(`near ${req.location}`);
      parts.push('reviews open hours atmosphere');
      break;

    case 'games':
      if (req.num_people) parts.push(`for ${req.num_people} players`);
      if (req.setting) parts.push(req.setting);
      if (req.energy_level) {
        const energyMap: Record<string, string> = {
          chill: 'relaxed casual',
          medium: 'fun engaging',
          chaotic: 'wild hilarious high-energy',
          wild: 'extreme crazy party',
        };
        parts.push(energyMap[req.energy_level] || req.energy_level);
      }
      parts.push('party game rules how to play');
      break;

    case 'plugs':
      if (req.location) parts.push(`near ${req.location}`);
      if (req.urgent) parts.push('available now open today same-day');
      parts.push('service provider contact');
      break;

    default:
      if (req.location) parts.push(`near ${req.location}`);
  }

  return parts.join(' ');
}

function buildFirecrawlPayload(req: SearchRequest, searchQuery: string) {
  const payload: Record<string, unknown> = {
    query: searchQuery,
    limit: Math.min(req.limit || 5, 10),
  };

  if (req.location && req.type !== 'games') {
    payload.location = req.location;
  }

  if (req.type === 'games') {
    payload.scrapeOptions = {
      formats: ['markdown'],
    };
  }

  if (req.type === 'plugs' && req.urgent) {
    payload.tbs = 'qdr:w';
  }

  return payload;
}

function formatResults(type: SearchType, webResults: Array<Record<string, unknown>>): SearchResult[] {
  return webResults.map((item, index) => {
    const base: SearchResult = {
      position: index + 1,
      title: (item.title as string) || 'Unknown',
      url: (item.url as string) || '',
      description: (item.description as string) || '',
    };

    if (type === 'games') {
      return {
        ...base,
        name: base.title,
        rules_content: (item.markdown as string) || '',
      };
    }

    return base;
  });
}

// Simple in-memory cache for production-ready optimization
const cache = new Map<string, { data: UnifiedSearchResponse; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

export async function performFirecrawlSearch(req: SearchRequest): Promise<UnifiedSearchResponse> {
  const { query, type = 'locations' } = req;
  const cacheKey = `${type}:${query}:${req.location || ''}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[TCG Search] Cache hit for: ${cacheKey}`);
    return { ...cached.data, from_cache: true };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return { success: false, query, type, results: [], error: 'Search engine not configured' };
  }

  const searchQuery = buildSearchQuery(req);
  const payload = buildFirecrawlPayload(req, searchQuery);
  const timeoutMs = type === 'games' ? 20000 : 15000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false, query, type,
          results: [],
          error: 'I\'m getting rate limited — give me a moment and try again',
          retryable: true,
        };
      }
      return { success: false, query, type, results: [], error: 'Search hit a wall. Try rephrasing what you need.' };
    }

    const data = await response.json();

    if (!data.success || !data.data?.web?.length) {
      const emptyMessages: Record<SearchType, string> = {
        locations: `Couldn't find anything matching "${query}"${req.location ? ` near ${req.location}` : ''}. Try being more specific.`,
        games: `No games matched that. Try describing the energy.`,
        plugs: `Couldn't track down "${query}"${req.location ? ` near ${req.location}` : ''}. Try a broader service type.`,
      };

      return {
        success: true,
        results: [],
        empty: true,
        suggestion: emptyMessages[type] || emptyMessages.locations,
        query: searchQuery,
        type,
      };
    }

    const results = formatResults(type, data.data.web);
    const finalResponse: UnifiedSearchResponse = {
      success: true,
      results,
      count: results.length,
      type,
      query: searchQuery,
    };

    // Store in cache
    cache.set(cacheKey, { data: finalResponse, timestamp: Date.now() });

    return finalResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: true,
        results: [],
        partial: true,
        suggestion: 'That search is taking too long. Try something more specific.',
        query: searchQuery,
        type,
      };
    }
    return { success: false, query, type, results: [], error: 'Something went wrong on my end.' };
  }
}
