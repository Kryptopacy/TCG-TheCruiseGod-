import { NextRequest, NextResponse } from 'next/server';
import { performFirecrawlSearch } from '@/app/lib/firecrawl';
import { SearchRequest } from '@/app/types/search';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimitAuth = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 d'),
});

const ratelimitAnon = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    // Choose correct ratelimiter based on auth status
    const ratelimiter = user ? ratelimitAuth : ratelimitAnon;
    const identifier = user ? user.id : (request.headers.get('x-forwarded-for') || 'anonymous');
    
    const { success, limit, remaining, reset } = await ratelimiter.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': remaining.toString(), 'X-RateLimit-Reset': reset.toString() } }
      );
    }

    const body: SearchRequest = await request.json();
    const result = await performFirecrawlSearch({
      ...body,
      type: 'locations', // Force type for this endpoint
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: result.retryable },
        { status: result.error?.includes('configured') ? 500 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[TCG Search] API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
