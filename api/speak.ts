import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClient, MODELS, setCommonHeaders } from "./_lib/openai.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/speak
 * Body: { text: string, voice?: string }
 * Returns: audio/mpeg bytes (the NPC speaking Spanish).
 *
 * Used for NPC voices. The garbling of over-level speech happens on the
 * client (we only request TTS for text the player is meant to hear clearly,
 * or we can pass already-garbled text to make it sound unintelligible).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { text, voice } = req.body as { text?: string; voice?: string };
    if (!text) return res.status(400).json({ error: "Missing text" });

    const client = getClient();
    const speech = await client.audio.speech.create({
      model: MODELS.tts,
      voice: (voice as never) ?? ("alloy" as never),
      input: text,
      // Spanish reads more naturally a touch slower for learners.
      speed: 0.95,
    });

    const arrayBuffer = await speech.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("speak error:", message);
    return res.status(500).json({ error: "TTS failed", detail: message });
  }
}
