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

    // Give the LLM concrete constraints for the CEFR level, not just the label.
    const levelGuide: Record<string, string> = {
      A1: `LANGUAGE LEVEL: A1 (absolute beginner). Your Spanish MUST be extremely simple:
- Use ONLY the most basic, high-frequency words (hola, sí, no, bueno, gracias, por favor, me llamo, cómo estás, etc.)
- Very short sentences — 3-6 words max. No complex grammar.
- Present tense ONLY (except for fixed expressions like "mucho gusto").
- No subjunctive, no conditional, no compound tenses, no relative clauses.
- If you need a less common word, immediately add the English in parentheses.
- Think: what would a tourist phrasebook include? That's your ceiling.`,
      A2: `LANGUAGE LEVEL: A2 (elementary). Keep Spanish simple:
- Basic vocabulary related to daily life (food, family, directions, time, shopping).
- Short sentences, mostly present tense + simple past (fui, comí, hablé).
- No subjunctive, no conditional, no complex relative clauses.
- If using a word a beginner might not know, add English in parentheses.`,
      B1: `LANGUAGE LEVEL: B1 (intermediate). Moderate Spanish:
- Can use past tenses (preterite + imperfect), future with "ir a", basic conditionals.
- Longer sentences OK but avoid complex subordinate clauses.
- Can discuss plans, experiences, opinions with common vocabulary.`,
    };
    const levelConstraint = levelGuide[body.level] ?? `LANGUAGE LEVEL: ${body.level}. Stay within this CEFR level.`;

    const system = `You are ${npcName}, a warm, friendly character in a Spanish-learning game, AND a kind language coach.

YOUR IDENTITY: Your name is ${npcName}. Never adopt another name or use the player's name as your own.
${themeLine}
${levelConstraint}

This conversation is about: "${body.canDo}".
Useful vocab/phrases you should draw from (stick close to these): ${vocabList}

CRITICAL: The player is a BEGINNER learning Spanish. Your replies must be simple enough that they can understand every word. When in doubt, use SIMPLER words. Short is better than long. If the player seems confused, simplify further.

IMPORTANT: The player's utterance has already been cleaned by a transcription-correction
layer. Any remaining errors are REAL language mistakes, not speech-to-text artifacts.
Do NOT comment on pronunciation, transcription quality, or "what you said sounded like…"
— just evaluate the Spanish as written.

Each turn:
1. Grade the player's latest utterance:
   - communication (0..1): did they get their meaning across?
   - accuracy (0..1): grammar/vocab appropriateness for ${body.level}.
   - feedback: 1-2 warm, encouraging sentences in ENGLISH. Focus on what they did well and one concrete thing to try next time. Do NOT mention transcription or pronunciation issues.
   - corrections: brief specific fixes for REAL grammar/vocab mistakes only (English), empty array if none.
2. Write npcReply: exactly ONE short reply by ${npcName}, in Spanish, STRICTLY within the level constraints above. REACT to what the player said, then ask a simple follow-up. RULES:
   - One turn only. 1-2 very short sentences.
   - Do NOT write the player's reply or include multiple exchanges.
   - Do NOT invent other people's names.
   - Stay consistent with the conversation so far.
3. objectiveMet: true if the player has communicated reasonably well (be encouraging).
4. conversationComplete: true once the exchange has reached a natural, friendly end — typically after 3-5 back-and-forth turns. Don't drag on, but don't end after one line.
   CRITICAL: when you set conversationComplete to true, your npcReply MUST be a
   CLOSING statement (e.g. "¡Nos vemos!" / "¡Hasta luego!" / "¡Cuídate!") — NOT
   a question. The player will NOT get another turn after this, so do NOT leave a
   question hanging.

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
