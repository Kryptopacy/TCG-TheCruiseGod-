import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const TASK_PROMPTS: Record<string, string> = {
  bill_split: `You are a receipt analysis assistant. Analyze this receipt image and extract:
1. The total bill amount
2. Any subtotal, tax, and tip amounts separately if visible
3. Individual line items if readable (dish name + price)
4. The number of items on the receipt

Respond with a JSON object like:
{
  "total": 45.60,
  "subtotal": 38.00,
  "tax": 4.60,
  "tip": 0,
  "items": [{"name": "Jollof Rice", "price": 12.00}],
  "summary": "The total is $45.60. Split 4 ways that's $11.40 each."
}
Keep the summary conversational and fun — TCG will read it aloud.`,

  drink_check: `You are a drinks and spirits verification expert. Analyze this drink/bottle image and assess:
1. The brand and type of spirit/drink
2. Any visible authenticity markers (hologram, QR code, NAFDAC number, embossed glass, label quality)
3. Any red flags for counterfeiting (blurry label, misaligned text, wrong font, cheap cap)
4. Overall authenticity confidence

Respond with a JSON object like:
{
  "brand": "Hennessy VS",
  "type": "Cognac",
  "authenticityScore": 85,
  "verdict": "Looks Legit ✅",
  "flags": ["Hologram present", "Label printing quality good"],
  "redFlags": [],
  "summary": "This Hennessy looks legit — the hologram's clear and the label quality checks out. Pour up!"
}
Keep the summary short, punchy, and voiced by TCG.`,

  game_vision: `You are a game master assistant with expert knowledge of party and board games. Analyze this image and:
1. Identify what game is being played if possible
2. Describe the current game state (whose turn, scores, board position)
3. Suggest what should happen next

Respond with a JSON object like:
{
  "game": "UNO",
  "state": "Player has 3 cards left, current color is red",
  "suggestion": "Play the red skip card if you have it",
  "summary": "Looks like a close game of UNO! Whoever's down to 3 cards better watch out — say UNO!"
}`,

  general: `You are TCG, The Cruise God's vision assistant. Analyze this image and describe what you see in a helpful, fun, context-aware way. Focus on what's most relevant to a party or social setting. Be brief, punchy, and useful — max 2-3 sentences. Format your response as JSON: { "summary": "..." }`
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vision API key not configured. Add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, task = 'general', prompt } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Strip the data URL prefix to get pure base64
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeType = image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';

    const taskPrompt = TASK_PROMPTS[task] || TASK_PROMPTS.general;
    const finalPrompt = prompt
      ? `${taskPrompt}\n\nAdditional context from user: ${prompt}`
      : taskPrompt;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: finalPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Vision] Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Vision model failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: 'No response from vision model' }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If not valid JSON, wrap it
      parsed = { summary: rawText };
    }

    return NextResponse.json({
      success: true,
      task,
      result: parsed.summary || rawText,
      structured: parsed,
    });
  } catch (error) {
    console.error('[Vision] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
