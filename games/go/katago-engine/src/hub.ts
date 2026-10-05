/**
 * Thin player on top of the Web KaTrain browser port of KataGo (MIT).
 * The network is KataGo's public g170-b6c96 test model. It runs in the
 * player's browser; this site does not host an engine server.
 */
import { getKataGoEngineClient } from "./engine/katago/client";

const MODEL_URL = new URL(/* @vite-ignore */ "./models/katago-small.bin.gz", import.meta.url).href;

type ColorName = "black" | "white";
type Stone = ColorName | null;

export type KataPosition = {
  size: number;
  komi: number;
  toPlay: ColorName;
  board: Stone[][];
  history: Array<{ x: number; y: number; player: ColorName }>;
};

let ready: Promise<void> | null = null;

export function kataModelUrl(): string {
  return MODEL_URL;
}

export function ensureKataGo(): Promise<void> {
  const engine = getKataGoEngineClient();
  if (!ready) {
    ready = engine.init(MODEL_URL, "webgpu").catch((err: unknown) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export async function chooseMove(position: KataPosition): Promise<{ type: "play"; x: number; y: number } | { type: "pass" }> {
  await ensureKataGo();
  const analysis = await getKataGoEngineClient().analyze({
    analysisGroup: "interactive",
    modelUrl: MODEL_URL,
    backend: "webgpu",
    board: position.board,
    currentPlayer: position.toPlay,
    moveHistory: position.history,
    komi: position.komi,
    rules: "chinese",
    visits: 16,
    maxTimeMs: 8000,
    topK: 8,
    ownershipMode: "none",
    conservativePass: true,
  });
  const ranked = [...(analysis.moves ?? [])].sort(
    (a, b) => (b.playSelectionValue ?? b.visits ?? 0) - (a.playSelectionValue ?? a.visits ?? 0),
  );
  const best = ranked[0];
  if (!best || best.x < 0 || best.y < 0 || best.x >= position.size || best.y >= position.size) {
    return { type: "pass" };
  }
  return { type: "play", x: best.x, y: best.y };
}
