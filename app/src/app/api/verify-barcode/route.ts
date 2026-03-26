import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { barcode } = await request.json();

    if (!barcode || typeof barcode !== 'string') {
      return NextResponse.json({ error: 'No barcode provided' }, { status: 400 });
    }

    // Sanitise — keep only digits
    const clean = barcode.replace(/\D/g, '');
    if (clean.length < 8) {
      return NextResponse.json({ found: false, error: 'Barcode too short to look up' });
    }

    // Open Food Facts — free, no auth, global product database
    const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,brands,countries_tags,categories_tags,quantity,image_front_small_url`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'TCG-TheCruiseGod/1.0 (contact@thecruisegod.com)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ found: false, error: 'Lookup service unavailable' });
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({
        found: false,
        barcode: clean,
        message: `No product found for barcode ${clean}. It may be a local/regional product not in the global database.`,
      });
    }

    const p = data.product;
    const name = p.product_name || 'Unknown Product';
    const brand = p.brands || 'Unknown Brand';
    const countries = (p.countries_tags as string[] | undefined)
      ?.map((c: string) => c.replace('en:', '').replace(/-/g, ' '))
      .join(', ') || 'Unknown';
    const quantity = p.quantity || '';

    return NextResponse.json({
      found: true,
      barcode: clean,
      name,
      brand,
      quantity,
      countries,
      summary: `Barcode ${clean} → ${brand} "${name}"${quantity ? ` (${quantity})` : ''}. Sold in: ${countries}.`,
    });
  } catch (error) {
    console.error('[verify-barcode] Error:', error);
    return NextResponse.json({ found: false, error: 'Lookup failed' }, { status: 500 });
  }
}
