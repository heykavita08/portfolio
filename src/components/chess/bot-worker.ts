// Runs the bot off the main thread so the page stays smooth while it thinks.
import { chooseMove, type Level } from './bot.ts';
import type { State } from './engine.ts';

self.onmessage = (e: MessageEvent<{ id: number; state: State; history: string[]; level: Level }>) => {
  const { id, state, history, level } = e.data;
  self.postMessage({ id, move: chooseMove(state, history, level) });
};
