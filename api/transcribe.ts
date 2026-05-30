import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toFile } from "openai";
import { getClient, MODELS, setCommonHeaders } from "./_lib/openai.js";

export const config = {
  api: {
    // We accept a base64 audio payload in JSON; bump the body limit.
    bodyParser: { sizeLimit: "10mb" },
  },
};

/**
 * POST /api/transcribe
 * Body: { audioBase64: string, mimeType?: string }
 * Returns: { text: string }
 *
 * Transcribes the player's spoken Spanish via Whisper. We force language "es"
 * so the model expects Spanish (better accuracy for learner speech).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { audioBase64, mimeType } = req.body as {
      audioBase64?: string;
      mimeType?: string;
    };
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audioBase64" });
    }

    const buffer = Buffer.from(audioBase64, "base64");
    const ext = (mimeType ?? "audio/webm").includes("mp4") ? "mp4" : "webm";
    const file = await toFile(buffer, `speech.${ext}`, {
      type: mimeType ?? "audio/webm",
    });

    const client = getClient();
    const result = await client.audio.transcriptions.create({
      file,
      model: MODELS.transcribe,
      language: "es",
    });

    return res.status(200).json({ text: result.text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("transcribe error:", message);
    return res.status(500).json({ error: "Transcription failed", detail: message });
  }
}
