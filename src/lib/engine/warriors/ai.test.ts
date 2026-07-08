import { describe, expect, it } from 'vitest';
import { chooseMove, type Difficulty } from './ai';
import { applyMove, legalMoves, newGame } from './rules';
import type { PlayerId, Rng } from './types';

function seeded(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function playGame(diffFor: Record<PlayerId, Difficulty>, rng: Rng): PlayerId {
	let state = newGame(rng);
	for (let ply = 0; ply < 500 && state.winner === null; ply++) {
		const move = chooseMove(state, diffFor[state.turn], rng);
		state = applyMove(state, move, rng);
	}
	if (state.winner === null) throw new Error('game did not terminate');
	return state.winner;
}

describe('chooseMove', () => {
	it('always returns a legal move', () => {
		const rng = seeded(123);
		for (let trial = 0; trial < 100; trial++) {
			const state = newGame(rng);
			for (const difficulty of ['easy', 'medium', 'hard'] as const) {
				const move = chooseMove(state, difficulty, rng);
				expect(legalMoves(state)).toContainEqual(move);
			}
		}
	});

	it('hard beats easy in most games', () => {
		const rng = seeded(2026);
		let hardWins = 0;
		const games = 100;
		for (let g = 0; g < games; g++) {
			// Alternate which side is hard to cancel first-player advantage.
			const hardPlayer = (g % 2) as PlayerId;
			const winner = playGame(
				{ 0: hardPlayer === 0 ? 'hard' : 'easy', 1: hardPlayer === 1 ? 'hard' : 'easy' },
				rng
			);
			if (winner === hardPlayer) hardWins++;
		}
		expect(hardWins / games).toBeGreaterThanOrEqual(0.7);
	});
});
