import { NextRequest, NextResponse } from 'next/server';

const TASK_PROMPTS: Record<string, string> = {
  bill_split: `You are a receipt analysis assistant. Analyze this receipt image and extract:
1. The currency symbol or code visible on the receipt (e.g. $, ₦, £, €, AED, GHS, KES). If none is visible, infer from context or use a generic symbol.
2. The total bill amount as a number
3. Any subtotal, tax, and tip amounts separately if visible
4. Individual line items if readable (dish name + price)
5. The number of items on the receipt

Respond with a JSON object like:
{
  "currency": "₦",
  "total": 45600,
  "subtotal": 38000,
  "tax": 4600,
  "tip": 0,
  "items": [{"name": "Jollof Rice", "price": 12000}],
  "summary": "The total is ₦45,600. Split 4 ways that's ₦11,400 each."
}
Always use the detected currency symbol in the summary. Keep the summary conversational and fun — TCG will read it aloud.`,

  drink_check: `You are a drink authenticity expert using OCR and visual analysis. Your primary goal is to extract machine-readable data from the bottle before doing any visual assessment.

**Step 1 — OCR Data Extraction (highest priority):**
- Read and transcribe any visible barcode number (EAN-13, UPC-A, etc.)
- Extract the full NAFDAC registration number if present (Nigerian regulatory body)
- Extract any batch code, lot number, or serial number visible on the label or bottle
- Extract any QR code data text (e.g. a URL or code string)

**Step 2 — Visual Authenticity Assessment:**
- Brand and type of spirit/drink
- Label quality (print resolution, alignment, font consistency)
- Physical security features (hologram, embossed glass, tamper seal, cap quality)
- Red flags for counterfeiting (blurry text, wrong font, thin/cheap label, stripped cap)

Respond with a JSON object like:
{
  "brand": "Hennessy VS",
  "type": "Cognac",
  "ocr": {
    "barcode": "3245995961018",
    "nafdac": "A7-0066L",
    "batchCode": "L23F097",
    "qrData": null
  },
  "authenticityScore": 88,
  "verdict": "Likely Authentic ✅",
  "flags": ["NAFDAC number present", "Barcode readable", "Hologram intact"],
  "redFlags": [],
  "summary": "NAFDAC number A7-0066L spotted and barcode reads 3245995961018. Label quality looks solid — this one checks out. Pour up!"
}
If a field cannot be read, set it to null. Keep the summary short, punchy, and voiced by TCG.`,

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
