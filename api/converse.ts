import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getClient, MODELS, setCommonHeaders } from "./_lib/openai.js";
import type {
  ConverseRequest,
  ConverseResponse,
} from "../src/domain/conversation.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

/**
 * POST /api/converse
 * Body: ConverseRequest
 * Returns: ConverseResponse
 *
 * GPT-4o plays the NPC AND acts as a CEFR examiner. It must:
 *  - stay strictly within the conversation's CEFR level when speaking,
 *  - grade the player's latest utterance on communication + accuracy,
 *  - decide if the objective has been demonstrated well enough to open the gate.
 *
 * We use response_format json_object and validate the shape before returning.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCommonHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as ConverseRequest;
    if (!body?.playerUtterance || !body?.objectiveId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const vocabList = body.vocab.map((v) => `${v.es} (${v.en})`).join(", ");
    const historyText = body.history
      .map((t) => `${t.role === "npc" ? "NPC" : "Player"}: ${t.text}`)
      .join("\n");

    const npcName = body.npcName || "the local";
    const themeLine = body.theme
      ? `SCENE / THEME: ${body.theme}\n`
      : "";
    const system = `You are ${npcName}, a warm, natural Spanish speaker in a language-learning game, AND a kind CEFR examiner.

YOUR IDENTITY: Your name is ${npcName}. If asked, you are ${npcName} — never adopt another name, and never use the player's name as your own. Speak the way a real, friendly local would (not like a textbook).
${themeLine}Speak ONLY in Spanish, and ONLY at CEFR level ${body.level} — keep vocabulary and grammar within ${body.level}.

This conversation is loosely about: "${body.canDo}".
Useful vocab/phrases in scope (you don't have to use them all): ${vocabList}

Each turn:
1. Grade the player's latest utterance:
   - communication (0..1): did they get their meaning across?
   - accuracy (0..1): grammar/vocab appropriateness for ${body.level}.
   - feedback: 1-2 warm, encouraging sentences in ENGLISH about what they did well / could improve.
   - corrections: brief specific fixes (English), empty if none.
2. Write npcReply: exactly ONE short, natural reply spoken by ${npcName}, in Spanish, 1-2 short sentences. REACT to what the player ACTUALLY said, then keep the conversation flowing naturally (e.g. ask a follow-up). STRICT RULES:
   - One turn only. Do NOT write the player's reply, do NOT include multiple back-and-forth lines, do NOT invent other people's names.
   - Stay consistent with who ${npcName} is and what was already said.
3. objectiveMet: true if, across the conversation so far, the player has communicated reasonably well at ${body.level} (be encouraging; they don't need to be perfect).
4. conversationComplete: true once the exchange has reached a natural, friendly end (you've greeted, chatted a little, and it's wrapping up) — typically after a few back-and-forth turns. Don't drag it on forever, but don't end abruptly after one line.

Respond with STRICT JSON only:
{
  "npcReply": string,
  "grade": { "communication": number, "accuracy": number, "feedback": string, "corrections": string[] },
  "objectiveMet": boolean,
  "conversationComplete": boolean
}`;

    const user = `Conversation so far:\n${historyText || "(none yet)"}\n\nPlayer just said (transcribed from speech): "${body.playerUtterance}"`;

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODELS.chat,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<ConverseResponse>;

    // Validate + clamp so a malformed model response can't break the client.
    const response: ConverseResponse = {
      npcReply: typeof parsed.npcReply === "string" ? parsed.npcReply : "…",
      grade: {
        communication: clamp01(parsed.grade?.communication),
        accuracy: clamp01(parsed.grade?.accuracy),
        feedback:
          typeof parsed.grade?.feedback === "string"
            ? parsed.grade.feedback
            : "",
        corrections: Array.isArray(parsed.grade?.corrections)
          ? parsed.grade!.corrections.filter((c) => typeof c === "string")
          : [],
      },
      objectiveMet: Boolean(parsed.objectiveMet),
      conversationComplete: Boolean(parsed.conversationComplete),
    };

    return res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("converse error:", message);
    return res.status(500).json({ error: "Conversation failed", detail: message });
  }
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(1, x));
}
