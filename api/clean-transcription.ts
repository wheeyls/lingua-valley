import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClient, MODELS, setCommonHeaders } from "./_lib/openai.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/clean-transcription
 * Body: { raw: string, context?: string, level?: string }
 * Returns: { cleaned: string, corrected: boolean }
 *
 * A lightweight LLM pass that fixes speech-to-text artifacts before the main
 * conversation grader sees the utterance. The player is speaking Spanish at a
 * beginner level; Whisper often mishears words, inserts English, or garbles
 * pronunciation into grammatically nonsensical text. This step infers what the
 * player MEANT to say and returns a cleaned version.
 *
 * The main grader then evaluates the cleaned utterance, so feedback addresses
 * real Spanish mistakes — not transcription noise.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { raw, context, level } = req.body as {
      raw?: string;
      context?: string;
      level?: string;
    };
    if (!raw) return res.status(400).json({ error: "Missing raw transcription" });

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODELS.chat,
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a transcription cleanup assistant for a Spanish-learning app.

The player is a BEGINNER (${level ?? "A1"}) speaking Spanish into a microphone. The speech-to-text
system (Whisper) often makes mistakes:
- Mishears Spanish words into similar-sounding but wrong words
- Inserts random English words
- Garbles pronunciation into grammatically nonsensical text
- Splits or merges words incorrectly

Your job: given the raw transcription and the conversation context, figure out
what the player MOST LIKELY MEANT TO SAY in Spanish and return a cleaned version.

Rules:
- Fix obvious transcription errors (wrong words that sound similar to the right ones)
- Keep the player's intended meaning — don't upgrade their grammar or vocabulary
- If they used a simple/incorrect form, keep it simple/incorrect (that's a real mistake for the grader to catch)
- Only fix what is clearly a TRANSCRIPTION artifact, not a language learning mistake
- If the raw text seems fine as-is, return it unchanged
- Output ONLY the cleaned Spanish text

Respond with JSON: { "cleaned": "...", "corrected": true/false }`,
        },
        {
          role: "user",
          content: `Conversation context: ${context ?? "(greeting)"}\n\nRaw transcription: "${raw}"`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as { cleaned?: string; corrected?: boolean };

    return res.status(200).json({
      cleaned: typeof parsed.cleaned === "string" ? parsed.cleaned : raw,
      corrected: Boolean(parsed.corrected),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("clean-transcription error:", message);
    // On failure, pass through the raw transcription — cleanup is a bonus.
    return res.status(200).json({
      cleaned: (req.body as { raw?: string })?.raw ?? "",
      corrected: false,
    });
  }
}
