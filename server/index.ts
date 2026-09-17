/**
 * Self-hosted entrypoint (Coolify), replacing Vercel's serverless functions +
 * static hosting. Each api/*.ts handler already uses a plain (req, res)
 * signature compatible with Express, so they're mounted unchanged.
 */
import express from "express";
import path from "node:path";

import activityComplete from "../api/activity-complete.js";
import checkpoint from "../api/checkpoint.js";
import claim from "../api/claim.js";
import cleanTranscription from "../api/clean-transcription.js";
import converse from "../api/converse.js";
import leaderboard from "../api/leaderboard.js";
import playerAction from "../api/player-action.js";
import speak from "../api/speak.js";
import stateLoad from "../api/state-load.js";
import transcribe from "../api/transcribe.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const DIST_DIR = path.join(process.cwd(), "dist");

// One shared JSON body limit covering every handler's own config (the
// largest, transcribe's base64 audio payload, needs 10mb).
app.use(express.json({ limit: "10mb" }));

// Handlers self-check req.method (including OPTIONS), so mount with `.all`.
const routes: Array<[string, express.RequestHandler]> = [
  ["/api/activity-complete", activityComplete as unknown as express.RequestHandler],
  ["/api/checkpoint", checkpoint as unknown as express.RequestHandler],
  ["/api/claim", claim as unknown as express.RequestHandler],
  ["/api/clean-transcription", cleanTranscription as unknown as express.RequestHandler],
  ["/api/converse", converse as unknown as express.RequestHandler],
  ["/api/leaderboard", leaderboard as unknown as express.RequestHandler],
  ["/api/player-action", playerAction as unknown as express.RequestHandler],
  ["/api/speak", speak as unknown as express.RequestHandler],
  ["/api/state-load", stateLoad as unknown as express.RequestHandler],
  ["/api/transcribe", transcribe as unknown as express.RequestHandler],
];
for (const [route, handler] of routes) {
  app.all(route, handler);
}

app.use(express.static(DIST_DIR));

// Same client-side rewrites as vercel.json's `rewrites` block.
for (const route of ["/organizations/*", "/leaderboard", "/reset-password"]) {
  app.get(route, (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

app.listen(PORT, () => {
  console.log(`lingua-valley listening on :${PORT}`);
});
