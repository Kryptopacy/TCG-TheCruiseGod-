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

import { Redis } from '@upstash/redis'
import { createClient } from '@supabase/supabase-js'

const CACHE_TTL_SECONDS = 60 * 15; // 15 minutes temp cache for Redis fallback

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! // Or service key if bypassing RLS
);

export async function performFirecrawlSearch(req: SearchRequest): Promise<UnifiedSearchResponse> {
  const { query, type = 'locations' } = req;
  const searchQuery = buildSearchQuery(req);
  const locationKey = req.location?.trim().toLowerCase() || null;
  const queryKey = searchQuery.trim().toLowerCase();

  const tableName = type === 'games' ? 'tcg_games' : type === 'locations' ? 'tcg_locations' : 'tcg_plugs';

  try {
    // 1. Check Persistent Database (Supabase) FIRST
    let dbQuery = supabase.from(tableName).select('*').eq('query_key', queryKey);
    if (locationKey && type !== 'games') {
      dbQuery = dbQuery.eq('location_key', locationKey);
    }
    
    const { data: dbMatches, error: dbError } = await dbQuery.limit(5);

    if (!dbError && dbMatches && dbMatches.length > 0) {
      // TTL Check: 7 days for locations/plugs
      if (type !== 'games' && dbMatches[0].created_at) {
        const ageMs = Date.now() - new Date(dbMatches[0].created_at).getTime();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        if (ageMs > SEVEN_DAYS_MS) {
          console.log(`[TCG Search] ⚠️ Stale data (>7 days) for: ${queryKey}. Triggering re-scrape.`);
          await supabase.from(tableName).delete().eq('query_key', queryKey);
          throw new Error('stale_cache'); // Fall through to Redis / Firecrawl
        }
      }

      console.log(`[TCG Search] ✨ Supabase Permanent DB hit for: ${queryKey}`);
      
      const results: SearchResult[] = dbMatches.map((row, idx) => {
        const base: SearchResult = {
          position: idx + 1,
          title: row.title,
          url: row.url || '',
          description: row.description || '',
        };
        if (type === 'games') {
          return { ...base, name: row.title, rules_content: row.rules_content || '' };
        }
        return base;
      });

      return {
        success: true,
        results,
        count: results.length,
        type,
        query: searchQuery,
        from_cache: true // signals it was fast/free
      };
    }
  } catch (err) {
    console.warn('[TCG Search] DB check failed, falling back to network:', err);
  }

  // 2. Temp Redis cache check (if DB missed or failed)
  const cacheKey = `tcg:${type}:${query}:${req.location || ''}`;
  const cached = await redis.get<UnifiedSearchResponse>(cacheKey);
  if (cached) {
    console.log(`[TCG Search] Redis Cache hit for: ${cacheKey}`);
    return { ...cached, from_cache: true };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    return { success: false, query, type, results: [], error: 'Search engine not configured' };
  }

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

    // Store in Persistent Database IN BACKGROUND
    (async () => {
      try {
        const insertData = results.map(r => {
          if (type === 'games') {
            return {
              query_key: queryKey,
              title: r.title || r.name,
              description: r.description,
              url: r.url,
              rules_content: r.rules_content
            };
          }
          return {
            query_key: queryKey,
            location_key: locationKey,
            title: r.title,
            description: r.description,
            url: r.url
          };
        });

        if (insertData.length > 0) {
          const { error } = await supabase.from(tableName).upsert(insertData, {
            onConflict: type === 'games' ? 'query_key,title' : 'query_key,location_key,title',
            ignoreDuplicates: true,
          });
          if (error) console.error(`[DB Insert Error] ${tableName}:`, error);
          else console.log(`[DB Insert] Saved ${insertData.length} records to ${tableName}`);
        }
      } catch (err) {
        console.error('[DB Insert Catch Error]:', err);
      }
    })();

    // Store in Upstash Redis cache (15 min TTL) as secondary
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, finalResponse);

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
