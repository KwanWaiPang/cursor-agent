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

type KataAbortSignal = {
  readonly aborted: boolean;
  addAbortListener: (listener: () => void) => () => void;
};

export async function chooseMove(
  position: KataPosition,
  settings: {
    visits?: number;
    maxTimeMs?: number;
    rootPolicyTemperature?: number;
    signal?: KataAbortSignal;
  } = {},
): Promise<{ type: "play"; x: number; y: number } | { type: "pass" }> {
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
    visits: settings.visits ?? 16,
    maxTimeMs: settings.maxTimeMs ?? 8000,
    rootPolicyTemperature: settings.rootPolicyTemperature ?? 1,
    topK: 8,
    ownershipMode: "none",
    conservativePass: true,
    signal: settings.signal,
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

export type KataReviewMove = {
  x: number;
  y: number;
  pass: boolean;
  visits: number;
  pointsLost: number;
  relativePointsLost: number;
  winRate: number;
  scoreLead: number;
  order: number;
};

/** Plain analysis for teaching: point loss, candidate moves, and ownership. */
export type KataReview = {
  rootScoreLead: number;
  rootWinRate: number;
  territory: number[][];
  /** Policy prior, length size*size + 1. Pass is the last entry. Illegal points are -1. */
  policy: number[];
  moves: KataReviewMove[];
};

export async function reviewPosition(
  position: KataPosition,
  settings: {
    visits?: number;
    maxTimeMs?: number;
    rootPolicyTemperature?: number;
    topK?: number;
    signal?: KataAbortSignal;
  } = {},
): Promise<KataReview> {
  await ensureKataGo();
  const analysis = await getKataGoEngineClient().analyze({
    analysisGroup: "background",
    modelUrl: MODEL_URL,
    backend: "webgpu",
    board: position.board,
    currentPlayer: position.toPlay,
    moveHistory: position.history,
    komi: position.komi,
    rules: "chinese",
    visits: settings.visits ?? 16,
    maxTimeMs: settings.maxTimeMs ?? 2500,
    rootPolicyTemperature: settings.rootPolicyTemperature ?? 1,
    topK: settings.topK ?? 12,
    ownershipMode: "root",
    conservativePass: true,
    signal: settings.signal,
  });
  const flatOwnership = analysis.ownership;
  const territory: number[][] = [];
  for (let y = 0; y < position.size; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < position.size; x += 1) {
      row.push(Number(flatOwnership?.[y * position.size + x]) || 0);
    }
    territory.push(row);
  }
  const moves = (analysis.moves ?? []).map((move) => ({
    x: move.x,
    y: move.y,
    pass: move.x < 0 || move.y < 0,
    visits: move.visits || 0,
    pointsLost: Number(move.pointsLost) || 0,
    relativePointsLost: Number(move.relativePointsLost) || 0,
    winRate: Number(move.winRate) || 0,
    scoreLead: Number(move.scoreLead) || 0,
    order: move.order || 0,
  }));
  return {
    rootScoreLead: Number(analysis.rootScoreLead) || 0,
    rootWinRate: Number(analysis.rootWinRate) || 0,
    territory,
    policy: Array.from(analysis.policy ?? [], (value) => Number(value) || 0),
    moves,
  };
}
