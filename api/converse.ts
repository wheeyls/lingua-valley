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

    const rp = body.rolePlay;
    const npcName = body.npcName || rp?.npcRole.name || "the local";
    const system = rp
      ? // ----- SCRIPTED ROLE-PLAY (NPC = role A, player = role B) -----
        `You are ${npcName}, a character in a Spanish-learning role-playing game, and also a kind CEFR examiner.

YOUR IDENTITY: Your name is ${npcName}. Your role in the scene is "${rp.npcRole.name}" (${rp.npcRole.description}). If asked your name, you are ${npcName} — never call yourself anything else.
SCENE: ${rp.scenario}
The PLAYER plays: ${rp.playerRole.name} — ${rp.playerRole.description}. Their name is not yours; do not adopt it.

This turn, the PLAYER is supposed to: "${rp.expectedGoal}"${rp.expectedGoalEnglish ? ` (${rp.expectedGoalEnglish})` : ""}
Examples of what THE PLAYER might say (these are the player's lines, NOT yours — never speak them yourself): ${rp.acceptablePhrases.map((p) => `"${p.spanish}"`).join(", ")}
(Player turn ${rp.turnNumber} of ${rp.totalTurns}.)

Your job:
1. Grade the player's latest utterance against this turn's goal:
   - communication (0..1): did they get the intended meaning across?
   - accuracy (0..1): grammar/vocab appropriateness for ${body.level}.
   - feedback: 1-2 warm sentences in ENGLISH.
   - corrections: brief specific fixes (English), empty if none.
2. Write npcReply: ONE short, natural reply spoken by ${npcName}, in Spanish, at
   CEFR level ${body.level}. STRICT RULES for npcReply:
   - Exactly ONE turn — at most 1-2 short sentences. Do NOT script the player's
     reply, do NOT include multiple back-and-forth lines, do NOT invent other
     people's names. Just ${npcName}'s single response.
   - Stay consistent with who ${npcName} is and what was already said.
3. objectiveMet: true if the player handled THIS turn acceptably (not necessarily perfect).
4. conversationComplete: true only if this was the final player turn (${rp.turnNumber} of ${rp.totalTurns}) and it went acceptably.

Respond with STRICT JSON only:
{
  "npcReply": string,
  "grade": { "communication": number, "accuracy": number, "feedback": string, "corrections": string[] },
  "objectiveMet": boolean,
  "conversationComplete": boolean
}`
      : // ----- FREE-FORM GATE (no script) -----
        `You are an NPC in a Spanish-learning role-playing game, and also a strict but kind CEFR examiner.

NPC PERSONA: you are ${npcName}, a friendly local. Speak ONLY in Spanish, and ONLY at CEFR level ${body.level}. Never exceed that level: keep vocabulary and grammar within ${body.level}. Reply with ONE short turn (1-2 sentences) — never script the player's lines or invent other people's names.

LEARNING OBJECTIVE the player must demonstrate: "${body.canDo}"
TARGET VOCAB/PHRASES in scope: ${vocabList}

Your job each turn:
1. Reply in character (Spanish, level ${body.level}, 1-2 sentences) to continue a natural conversation that gives the player a chance to demonstrate the objective.
2. Grade the player's latest utterance:
   - communication (0..1): did they get the intended meaning across?
   - accuracy (0..1): grammar/vocab appropriateness for ${body.level}.
   - feedback: 1-2 warm sentences in ENGLISH.
   - corrections: array of brief specific fixes (English), empty if none.
3. Decide objectiveMet: true ONLY if, across the whole conversation, the player has clearly demonstrated "${body.canDo}" at level ${body.level}. Be encouraging but honest; a single weak turn is not enough.
4. conversationComplete: true if the exchange has reached a natural end or the objective is met.

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
