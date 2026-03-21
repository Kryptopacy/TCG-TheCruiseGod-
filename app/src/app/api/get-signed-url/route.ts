import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.NEXT_PUBLIC_AGENT_ID;

    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: 'ElevenLabs credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs signed URL error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get signed URL', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Signed URL generation failed:', error);
    return NextResponse.json(
      { error: 'Internal server error generating signed URL' },
      { status: 500 }
    );
  }
}
