/**
 * Thin client for the serverless /api endpoints.
 * Centralizes fetch logic so scenes stay focused on presentation.
 */

import type {
  ConverseRequest,
  ConverseResponse,
  TranscribeResponse,
} from "../domain/conversation";

const BASE = "/api";

export async function transcribe(
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const res = await fetch(`${BASE}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, mimeType }),
  });
  if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
  const data = (await res.json()) as TranscribeResponse;
  return data.text;
}

export async function converse(req: ConverseRequest): Promise<ConverseResponse> {
  const res = await fetch(`${BASE}/converse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`converse failed: ${res.status}`);
  return (await res.json()) as ConverseResponse;
}

export interface CleanResult {
  cleaned: string;
  corrected: boolean;
}

/**
 * Clean a raw Whisper transcription — fix speech-to-text artifacts (misheard
 * words, English insertions, garbled text) so the grader evaluates what the
 * player MEANT, not what Whisper misheard. Non-fatal: returns the raw text on
 * failure.
 */
export async function cleanTranscription(
  raw: string,
  context?: string,
  level?: string,
): Promise<CleanResult> {
  try {
    const res = await fetch(`${BASE}/clean-transcription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, context, level }),
    });
    if (!res.ok) return { cleaned: raw, corrected: false };
    return (await res.json()) as CleanResult;
  } catch {
    return { cleaned: raw, corrected: false };
  }
}

export async function speak(text: string, voice?: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(`speak failed: ${res.status}`);
  return await res.arrayBuffer();
}

/** Whether the AI backend is reachable (used to gate the voice UI gracefully). */
export async function backendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/converse`, { method: "OPTIONS" });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
