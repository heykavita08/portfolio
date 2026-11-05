// The chess bot. Each level searches ahead with alpha-beta and scores positions by material and piece
// placement; the lower levels look less far ahead and make deliberate mistakes.
import { apply, inCheck, legalMoves, positionKey, type Move, type State } from './engine.ts';

export type Level = 'easy' | 'medium' | 'hard';

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

// Piece placement bonuses from White's side, a8 first (Michniewicz's "simplified evaluation").
const PLACE: Record<string, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

/** Score in centipawns from the point of view of the side to move. */
function evaluate(s: State): number {
  let score = 0;
  s.board.forEach((p, sq) => {
    if (!p) return;
    const kind = p.toLowerCase();
    if (p === kind) score -= VALUE[kind] + PLACE[kind][sq ^ 56];
    else score += VALUE[kind] + PLACE[kind][sq];
  });
  return s.white ? score : -score;
}

const isLoud = (s: State, m: Move) => !!s.board[m.to] || !!m.ep || !!m.promo;

/** Likely-best moves first (captures of big pieces by small ones), which makes the search far faster. */
function ordered(s: State, moves: Move[]): Move[] {
  const rank = (m: Move) => {
    const victim = m.ep ? 100 : VALUE[s.board[m.to]?.toLowerCase() ?? ''] ?? 0;
    const attacker = VALUE[s.board[m.from]!.toLowerCase()] ?? 0;
    return (victim ? victim * 10 - attacker : 0) + (m.promo === 'q' ? 8000 : 0);
  };
  return moves.map((m) => [rank(m), m] as const).sort((a, b) => b[0] - a[0]).map(([, m]) => m);
}

class OutOfTime extends Error {}

interface Search { deadline: number; nodes: number }

function tick(c: Search) {
  if ((++c.nodes & 255) === 0 && Date.now() > c.deadline) throw new OutOfTime();
}

/** Follow captures to the end, so the bot doesn't stop looking halfway through an exchange. */
function quiesce(s: State, alpha: number, beta: number, ply: number, left: number, c: Search): number {
  tick(c);
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
  const stand = evaluate(s);
  if (stand >= beta || left === 0) return stand;
  if (stand > alpha) alpha = stand;
  for (const m of ordered(s, moves.filter((x) => isLoud(s, x)))) {
    const score = -quiesce(apply(s, m), -beta, -alpha, ply + 1, left - 1, c);
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(s: State, depth: number, alpha: number, beta: number, ply: number, c: Search): number {
  tick(c);
  if (s.halfmove >= 100) return 0;
  if (depth === 0) return quiesce(s, alpha, beta, ply, 4, c);
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
  let best = -Infinity;
  for (const m of ordered(s, moves)) {
    const score = -search(apply(s, m), depth - 1, -beta, -alpha, ply + 1, c);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

const noise = (size: number) => (Math.random() * 2 - 1) * size;
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

/**
 * Pick a move for the side to move.
 * Easy: one move ahead with big errors, and sometimes a random move.
 * Medium: two moves ahead plus captures, with small errors and the odd second-choice move.
 * Hard: searches as deep as it can within `ms` and plays its best move.
 */
export function chooseMove(s: State, history: string[], level: Level, ms = 900): Move | null {
  const moves = legalMoves(s);
  if (moves.length <= 1) return moves[0] ?? null;

  // A move that would repeat the position a third time ends the game as a draw.
  const repeats = (m: Move) => history.filter((k) => k === positionKey(apply(s, m))).length >= 2;
  const c: Search = { deadline: Date.now() + (level === 'hard' ? ms : 5000), nodes: 0 };

  if (level === 'easy') {
    if (Math.random() < 0.3) return pick(moves);
    return moves
      .map((m) => ({ m, score: -evaluate(apply(s, m)) + noise(120) }))
      .sort((a, b) => b.score - a.score)[0].m;
  }

  if (level === 'medium') {
    const scored = moves
      .map((m) => {
        const score = repeats(m) ? 0 : -search(apply(s, m), 1, -Infinity, Infinity, 1, c);
        return { m, score, mate: score > MATE / 2, played: score + noise(25) };
      })
      .sort((a, b) => b.played - a.played);
    const mate = scored.find((x) => x.mate);
    if (mate) return mate.m;
    return Math.random() < 0.1 ? pick(scored.slice(0, 3)).m : scored[0].m;
  }

  // Hard: deepen one level at a time, keeping the last search that finished.
  let order = ordered(s, moves.slice().sort(() => Math.random() - 0.5));
  let best = order[0];
  try {
    for (let depth = 1; depth <= 8; depth++) {
      let alpha = -Infinity;
      let top = order[0];
      const scores = new Map<Move, number>();
      for (const m of order) {
        const score = repeats(m) ? 0 : -search(apply(s, m), depth - 1, -Infinity, -alpha, 1, c);
        scores.set(m, score);
        if (score > alpha) { alpha = score; top = m; }
      }
      best = top;
      order = order.slice().sort((a, b) => scores.get(b)! - scores.get(a)!);
      if (alpha > MATE / 2) break; // a forced mate: no need to look further
    }
  } catch (e) {
    if (!(e instanceof OutOfTime)) throw e;
  }
  return best;
}
