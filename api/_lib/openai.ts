import OpenAI from "openai";

/** Shared OpenAI client for all serverless functions. Key stays server-side. */
export function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

/** Models in one place so they're easy to tune. */
export const MODELS = {
  chat: "gpt-4o",
  transcribe: "whisper-1",
  tts: "gpt-4o-mini-tts",
} as const;

/** Tiny CORS/JSON helpers so each handler stays focused. */
export function setCommonHeaders(res: {
  setHeader: (k: string, v: string) => void;
}): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
