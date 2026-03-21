import { NextRequest, NextResponse } from 'next/server';
import { performFirecrawlSearch } from '@/app/lib/firecrawl';
import { SearchRequest } from '@/app/types/search';

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const result = await performFirecrawlSearch({
      ...body,
      type: 'plugs', // Force type for this endpoint
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: result.retryable },
        { status: result.error?.includes('configured') ? 500 : 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[TCG Search-Plugs] API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
