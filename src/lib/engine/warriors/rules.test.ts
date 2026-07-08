import { describe, expect, it } from 'vitest';
import { reachableTargets } from '../expressions';
import { applyMove, initiative, legalMoves, newGame } from './rules';
import type { Die, DieSides, GameState, PlayerId } from './types';

function seeded(seed: number) {
	// Mulberry32
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function makeDice(p: number, values: Array<[DieSides, number]>): Die[] {
	return values.map(([sides, value], i) => ({ id: `p${p}-${i}-d${sides}`, sides, value }));
}

function makeState(
	a: Array<[DieSides, number]>,
	b: Array<[DieSides, number]>,
	turn: PlayerId,
	firstPlayer: PlayerId = turn
): GameState {
	return { dice: [makeDice(0, a), makeDice(1, b)], turn, firstPlayer, consecutivePasses: 0, winner: null };
}

describe('initiative', () => {
	it('smallest die goes first', () => {
		const a = makeDice(0, [[4, 2], [6, 5]]);
		const b = makeDice(1, [[4, 3], [6, 4]]);
		expect(initiative(a, b)).toBe(0);
	});

	it('ties broken by next smallest', () => {
		const a = makeDice(0, [[4, 2], [6, 6]]);
		const b = makeDice(1, [[4, 2], [6, 5]]);
		expect(initiative(a, b)).toBe(1);
	});

	it('full tie defaults to player 0', () => {
		const a = makeDice(0, [[4, 2], [6, 5]]);
		const b = makeDice(1, [[4, 2], [6, 5]]);
		expect(initiative(a, b)).toBe(0);
	});
});

describe('legalMoves', () => {
	it('strength requires >= target', () => {
		const state = makeState([[4, 3]], [[6, 3], [6, 4]], 0, 1);
		const strengths = legalMoves(state).filter((m) => m.type === 'strength');
		expect(strengths).toHaveLength(1);
		expect(strengths[0]).toMatchObject({ targetId: 'p1-0-d6' });
	});

	it('mind attacks match reachable expression targets', () => {
		const state = makeState(
			[
				[4, 2],
				[6, 3],
				[8, 4]
			],
			[[20, 14]],
			0
		);
		const minds = legalMoves(state).filter((m) => m.type === 'mind');
		expect(minds).toHaveLength(1); // (3+4)x2 = 14
		expect(minds[0]).toMatchObject({ type: 'mind', targetId: 'p1-0-d20' });
	});

	it('cross-checks against brute force on random states', () => {
		const rng = seeded(42);
		for (let trial = 0; trial < 100; trial++) {
			const state = newGame(rng);
			const moves = legalMoves(state);
			const mine = state.dice[state.turn];
			const theirs = state.dice[1 - state.turn];
			const targets = reachableTargets(mine.map((d) => d.value));
			for (const target of theirs) {
				const expectStrength = mine.some((a) => a.value >= target.value);
				const gotStrength = moves.some(
					(m) => m.type === 'strength' && m.targetId === target.id
				);
				expect(gotStrength).toBe(expectStrength);
				const gotMind = moves.some((m) => m.type === 'mind' && m.targetId === target.id);
				expect(gotMind).toBe(targets.has(target.value));
			}
		}
	});

	it('endgame 1v1: first player blocked on tie, second player allowed', () => {
		const first = makeState([[4, 3]], [[6, 3]], 0, 0);
		expect(legalMoves(first)).toEqual([{ type: 'pass' }]);
		const second = makeState([[4, 3]], [[6, 3]], 0, 1);
		expect(legalMoves(second).some((m) => m.type === 'strength')).toBe(true);
	});

	it('pass only when no legal move', () => {
		const state = makeState([[4, 1]], [[20, 19], [12, 12]], 0);
		expect(legalMoves(state)).toEqual([{ type: 'pass' }]);
	});
});

describe('applyMove', () => {
	it('captures target and rerolls only the attacking dice', () => {
		const rng = seeded(7);
		const state = makeState(
			[
				[4, 2],
				[6, 3],
				[8, 4]
			],
			[
				[20, 14],
				[6, 2]
			],
			0
		);
		const mind = legalMoves(state).find((m) => m.type === 'mind' && m.targetId === 'p1-0-d20')!;
		const after = applyMove(state, mind, rng);
		expect(after.dice[1].map((d) => d.id)).toEqual(['p1-1-d6']);
		expect(after.turn).toBe(1);
		const attackerIds = mind.type === 'mind' ? mind.attackerIds : [];
		for (const die of after.dice[0]) {
			const before = state.dice[0].find((d) => d.id === die.id)!;
			if (!attackerIds.includes(die.id)) expect(die.value).toBe(before.value);
			expect(die.value).toBeGreaterThanOrEqual(1);
			expect(die.value).toBeLessThanOrEqual(die.sides);
		}
	});

	it('declares winner when last die captured', () => {
		const state = makeState([[20, 19]], [[4, 3]], 0, 1);
		const move = legalMoves(state).find((m) => m.type === 'strength')!;
		expect(applyMove(state, move, seeded(1)).winner).toBe(0);
	});

	it('two consecutive passes ends the game defensively', () => {
		const state = makeState([[4, 1]], [[6, 6], [4, 4]], 0);
		const afterPass1 = applyMove(state, { type: 'pass' });
		const afterPass2 = applyMove(afterPass1, { type: 'pass' });
		expect(afterPass2.winner).toBe(1); // more dice wins
	});
});
