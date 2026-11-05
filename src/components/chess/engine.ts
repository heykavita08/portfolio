// Chess rules for the footer game: legal moves (castling, en passant, promotion), check, checkmate,
// stalemate and the automatic draws. Squares are 0-63: 0 is a8, 7 is h8, 56 is a1, 63 is h1.
// Pieces are FEN letters: uppercase white, lowercase black.

export type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Promo = 'q' | 'r' | 'b' | 'n';

export interface State {
  board: (Piece | null)[];
  white: boolean; // white to move
  castling: string; // any of KQkq
  ep: number | null; // en passant target square
  halfmove: number; // since the last pawn move or capture
  fullmove: number;
}

export interface Move {
  from: number;
  to: number;
  promo?: Promo;
  ep?: boolean;
  castle?: 'K' | 'Q';
}

export type Outcome =
  | { over: false; check: boolean }
  | { over: true; reason: 'checkmate'; winner: 'white' | 'black' }
  | { over: true; reason: 'stalemate' | 'repetition' | 'fifty' | 'material'; winner: null };

const START = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR';
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const LINE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ALL = [...DIAG, ...LINE];

const isWhite = (p: Piece) => p === p.toUpperCase();
const on = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export const squareName = (sq: number) => 'abcdefgh'[sq & 7] + (8 - (sq >> 3));

export function initial(): State {
  return {
    board: [...START].map((ch) => (ch === ' ' ? null : (ch as Piece))),
    white: true,
    castling: 'KQkq',
    ep: null,
    halfmove: 0,
    fullmove: 1,
  };
}

/** Is `sq` attacked by the given side? */
export function attacked(board: State['board'], sq: number, byWhite: boolean): boolean {
  const r = sq >> 3, c = sq & 7;
  const at = (rr: number, cc: number) => (on(rr, cc) ? board[rr * 8 + cc] : null);
  const own = (ch: string) => (byWhite ? ch.toUpperCase() : ch) as Piece;

  // White pawns attack up the board (towards row 0), so they sit one row below the target.
  const pr = byWhite ? r + 1 : r - 1;
  if (at(pr, c - 1) === own('p') || at(pr, c + 1) === own('p')) return true;
  for (const [dr, dc] of KNIGHT) if (at(r + dr, c + dc) === own('n')) return true;
  for (const [dr, dc] of ALL) if (at(r + dr, c + dc) === own('k')) return true;

  const ray = (dirs: number[][], a: Piece, b: Piece) => {
    for (const [dr, dc] of dirs) {
      for (let rr = r + dr, cc = c + dc; on(rr, cc); rr += dr, cc += dc) {
        const p = board[rr * 8 + cc];
        if (p) {
          if (p === a || p === b) return true;
          break;
        }
      }
    }
    return false;
  };
  return ray(DIAG, own('b'), own('q')) || ray(LINE, own('r'), own('q'));
}

export function inCheck(s: State, white = s.white): boolean {
  const king = s.board.indexOf(white ? 'K' : 'k');
  return king >= 0 && attacked(s.board, king, !white);
}

function pseudoMoves(s: State, from: number, out: Move[]) {
  const p = s.board[from];
  if (!p || isWhite(p) !== s.white) return;
  const r = from >> 3, c = from & 7;
  const kind = p.toLowerCase();
  const enemy = (t: Piece | null) => t !== null && isWhite(t) !== s.white;

  if (kind === 'p') {
    const dir = s.white ? -1 : 1;
    const startRow = s.white ? 6 : 1;
    const lastRow = s.white ? 0 : 7;
    const push = (to: number, extra: Partial<Move> = {}) => {
      if (to >> 3 === lastRow) for (const promo of ['q', 'r', 'b', 'n'] as Promo[]) out.push({ from, to, promo });
      else out.push({ from, to, ...extra });
    };
    if (on(r + dir, c) && !s.board[(r + dir) * 8 + c]) {
      push((r + dir) * 8 + c);
      if (r === startRow && !s.board[(r + 2 * dir) * 8 + c]) out.push({ from, to: (r + 2 * dir) * 8 + c });
    }
    for (const dc of [-1, 1]) {
      if (!on(r + dir, c + dc)) continue;
      const to = (r + dir) * 8 + c + dc;
      if (enemy(s.board[to])) push(to);
      else if (to === s.ep) out.push({ from, to, ep: true });
    }
    return;
  }

  if (kind === 'n' || kind === 'k') {
    for (const [dr, dc] of kind === 'n' ? KNIGHT : ALL) {
      if (!on(r + dr, c + dc)) continue;
      const to = (r + dr) * 8 + c + dc;
      if (!s.board[to] || enemy(s.board[to])) out.push({ from, to });
    }
    if (kind === 'k') {
      const home = s.white ? 60 : 4;
      if (from === home && !attacked(s.board, home, !s.white)) {
        const [k, q] = s.white ? ['K', 'Q'] : ['k', 'q'];
        if (s.castling.includes(k) && !s.board[home + 1] && !s.board[home + 2] && !attacked(s.board, home + 1, !s.white)) {
          out.push({ from, to: home + 2, castle: 'K' });
        }
        if (s.castling.includes(q) && !s.board[home - 1] && !s.board[home - 2] && !s.board[home - 3] && !attacked(s.board, home - 1, !s.white)) {
          out.push({ from, to: home - 2, castle: 'Q' });
        }
      }
    }
    return;
  }

  const dirs = kind === 'b' ? DIAG : kind === 'r' ? LINE : ALL;
  for (const [dr, dc] of dirs) {
    for (let rr = r + dr, cc = c + dc; on(rr, cc); rr += dr, cc += dc) {
      const to = rr * 8 + cc;
      if (s.board[to]) {
        if (enemy(s.board[to])) out.push({ from, to });
        break;
      }
      out.push({ from, to });
    }
  }
}

export function apply(s: State, m: Move): State {
  const board = s.board.slice();
  const p = board[m.from]!;
  const captured = board[m.to] ?? null;
  board[m.from] = null;
  board[m.to] = m.promo ? ((s.white ? m.promo.toUpperCase() : m.promo) as Piece) : p;
  if (m.ep) board[m.to + (s.white ? 8 : -8)] = null;
  if (m.castle) {
    const [rookFrom, rookTo] = m.castle === 'K' ? [m.to + 1, m.to - 1] : [m.to - 2, m.to + 1];
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }

  // A king or rook leaving its square, or a rook captured on it, ends those castling rights.
  const LOST: Record<number, string> = { 60: 'KQ', 63: 'K', 56: 'Q', 4: 'kq', 7: 'k', 0: 'q' };
  const lost = (LOST[m.from] ?? '') + (LOST[m.to] ?? '');
  const castling = [...s.castling].filter((ch) => !lost.includes(ch)).join('');

  const pawn = p.toLowerCase() === 'p';
  return {
    board,
    white: !s.white,
    castling,
    ep: pawn && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null,
    halfmove: pawn || captured || m.ep ? 0 : s.halfmove + 1,
    fullmove: s.fullmove + (s.white ? 0 : 1),
  };
}

export function legalMoves(s: State, from?: number): Move[] {
  const pseudo: Move[] = [];
  if (from !== undefined) pseudoMoves(s, from, pseudo);
  else for (let sq = 0; sq < 64; sq++) pseudoMoves(s, sq, pseudo);
  return pseudo.filter((m) => !inCheck(apply(s, m), s.white));
}

/** Identifies a position for the repetition rule. */
export function positionKey(s: State): string {
  // An en passant square only matters if a capture there is actually legal.
  const ep = s.ep !== null && legalMoves(s).some((m) => m.ep) ? s.ep : '-';
  return `${s.board.map((p) => p ?? '.').join('')}|${s.white ? 'w' : 'b'}|${s.castling}|${ep}`;
}

function insufficientMaterial(board: State['board']): boolean {
  const rest = board.filter((p): p is Piece => p !== null && p.toLowerCase() !== 'k');
  if (rest.length === 0) return true;
  return rest.length === 1 && 'bn'.includes(rest[0].toLowerCase());
}

/** `history` holds the position keys of the game so far, including the current position. */
export function outcome(s: State, history: string[]): Outcome {
  const check = inCheck(s);
  if (legalMoves(s).length === 0) {
    return check
      ? { over: true, reason: 'checkmate', winner: s.white ? 'black' : 'white' }
      : { over: true, reason: 'stalemate', winner: null };
  }
  if (insufficientMaterial(s.board)) return { over: true, reason: 'material', winner: null };
  if (s.halfmove >= 100) return { over: true, reason: 'fifty', winner: null };
  const key = positionKey(s);
  if (history.filter((h) => h === key).length >= 3) return { over: true, reason: 'repetition', winner: null };
  return { over: false, check };
}

/** Standard algebraic notation for a legal move, e.g. Nbd7, exd5, O-O, e8=Q+. */
export function san(s: State, m: Move): string {
  const p = s.board[m.from]!;
  const kind = p.toLowerCase();
  let text: string;
  if (m.castle) {
    text = m.castle === 'K' ? 'O-O' : 'O-O-O';
  } else {
    const capture = !!s.board[m.to] || !!m.ep;
    const name = squareName(m.to);
    if (kind === 'p') {
      text = (capture ? squareName(m.from)[0] + 'x' : '') + name + (m.promo ? '=' + m.promo.toUpperCase() : '');
    } else {
      const rivals = legalMoves(s).filter((o) => o.to === m.to && o.from !== m.from && s.board[o.from] === p);
      let which = '';
      if (rivals.length) {
        const here = squareName(m.from);
        const sameFile = rivals.some((o) => (o.from & 7) === (m.from & 7));
        const sameRank = rivals.some((o) => o.from >> 3 === m.from >> 3);
        which = !sameFile ? here[0] : !sameRank ? here[1] : here;
      }
      text = kind.toUpperCase() + which + (capture ? 'x' : '') + name;
    }
  }
  const next = apply(s, m);
  if (inCheck(next)) text += legalMoves(next).length ? '+' : '#';
  return text;
}
