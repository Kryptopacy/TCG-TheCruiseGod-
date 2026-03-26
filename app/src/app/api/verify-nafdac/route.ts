import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { nafdac } = await request.json();

    if (!nafdac || typeof nafdac !== 'string') {
      return NextResponse.json({ error: 'No NAFDAC number provided' }, { status: 400 });
    }

    const clean = nafdac.trim().toUpperCase();
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ found: false, error: 'Verification service not configured' });
    }

    // Use Firecrawl /v1/scrape to load the NAFDAC verification page
    // topinfo.ng is the best publicly accessible NAFDAC lookup
    const targetUrl = `https://topinfo.ng/nafdac-verify/?numb=${encodeURIComponent(clean)}`;

    const fcResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000, // wait for any JS to render results
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!fcResponse.ok) {
      console.error('[verify-nafdac] Firecrawl error:', fcResponse.status);
      return NextResponse.json({ found: false, error: 'Verification service unavailable' });
    }

    const fcData = await fcResponse.json();
    const markdown: string = fcData.data?.markdown || fcData.markdown || '';

    if (!markdown) {
      return NextResponse.json({ found: false, nafdac: clean, message: 'No data returned from verification service' });
    }

    // ── Parse the markdown for product details ────────────────────────────────
    // topinfo.ng returns something like:
    // "Product Name: Hennessy V.S (Cognac)\nCompany: Jas Hennessy & Co\nStatus: REGISTERED\n..."
    const get = (label: string): string => {
      const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, 'i');
      return markdown.match(regex)?.[1]?.trim() || '';
    };

    const product = get('Product Name') || get('Product') || get('Name');
    const company = get('Company') || get('Manufacturer') || get('Applicant');
    const status = get('Status') || get('Registration Status');
    const category = get('Category') || get('Product Category');

    // Detect if the page says "not found" variants
    const notFoundSignals = ['not found', 'no result', 'invalid', 'not registered', 'does not exist'];
    const lowerMd = markdown.toLowerCase();
    const isNotFound = notFoundSignals.some(s => lowerMd.includes(s)) && !product;

    if (isNotFound) {
      return NextResponse.json({
        found: false,
        nafdac: clean,
        message: `NAFDAC number ${clean} is not in the registry. This product may be unregistered or counterfeit.`,
      });
    }

    const isRegistered = status.toLowerCase().includes('registered') || (!status && product);
    const verdict = isRegistered ? '✅ Registered' : status ? `⚠️ ${status}` : '⚠️ Status unclear';

    return NextResponse.json({
      found: true,
      nafdac: clean,
      product,
      company,
      status: status || 'Registered',
      category,
      verdict,
      summary: `NAFDAC ${clean} → "${product}" by ${company}. Status: ${verdict}${category ? ` (${category})` : ''}.`,
    });
  } catch (error) {
    console.error('[verify-nafdac] Error:', error);
    return NextResponse.json({ found: false, error: 'Verification failed' }, { status: 500 });
  }
}
