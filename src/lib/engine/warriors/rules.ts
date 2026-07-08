import { reachableTargets } from '../expressions';
import {
	DIE_SET,
	type Die,
	type GameState,
	type Move,
	type PlayerId,
	type Rng
} from './types';

export function rollDie(sides: number, rng: Rng): number {
	return 1 + Math.floor(rng() * sides);
}

export function newGame(rng: Rng = Math.random): GameState {
	const dice = [0, 1].map((p) =>
		DIE_SET.map((sides) => ({
			id: `p${p}-d${sides}`,
			sides,
			value: rollDie(sides, rng)
		}))
	) as [Die[], Die[]];

	const firstPlayer = initiative(dice[0], dice[1]);
	return { dice, turn: firstPlayer, firstPlayer, consecutivePasses: 0, winner: null };
}

/**
 * Sort each side's values ascending and compare lexicographically; the side
 * with the smaller sequence goes first. Full tie defaults to player 0.
 */
export function initiative(a: Die[], b: Die[]): PlayerId {
	const av = a.map((d) => d.value).sort((x, y) => x - y);
	const bv = b.map((d) => d.value).sort((x, y) => x - y);
	for (let i = 0; i < av.length; i++) {
		if (av[i] !== bv[i]) return av[i] < bv[i] ? 0 : 1;
	}
	return 0;
}

/** In the 1v1 endgame the game's first player needs strictly greater to capture. */
function strengthCaptures(state: GameState, attackerValue: number, targetValue: number): boolean {
	const oneVsOne = state.dice[0].length === 1 && state.dice[1].length === 1;
	if (oneVsOne && state.turn === state.firstPlayer) return attackerValue > targetValue;
	return attackerValue >= targetValue;
}

/**
 * `maxMindDice` limits how many dice a mind-attack expression may combine —
 * the AI passes 3 to keep search cheap; the UI uses the unrestricted default.
 * Moves under a limit are always a subset of the unrestricted moves.
 */
export function legalMoves(state: GameState, maxMindDice = Infinity): Move[] {
	if (state.winner !== null) return [];
	const mine = state.dice[state.turn];
	const theirs = state.dice[1 - state.turn];
	const moves: Move[] = [];

	for (const target of theirs) {
		for (const attacker of mine) {
			if (strengthCaptures(state, attacker.value, target.value)) {
				moves.push({ type: 'strength', attackerId: attacker.id, targetId: target.id });
			}
		}
	}

	if (mine.length >= 2) {
		const targets = reachableTargets(
			mine.map((d) => d.value),
			2,
			Math.min(mine.length, maxMindDice)
		);
		for (const target of theirs) {
			const hit = targets.get(target.value);
			if (!hit) continue;
			const attackerIds = mine.filter((_, i) => hit.mask & (1 << i)).map((d) => d.id);
			moves.push({ type: 'mind', attackerIds, expr: hit.expr, targetId: target.id });
		}
	}

	if (moves.length === 0) moves.push({ type: 'pass' });
	return moves;
}

export function applyMove(state: GameState, move: Move, rng: Rng = Math.random): GameState {
	const next: GameState = {
		dice: [state.dice[0].map((d) => ({ ...d })), state.dice[1].map((d) => ({ ...d }))],
		turn: (1 - state.turn) as PlayerId,
		firstPlayer: state.firstPlayer,
		consecutivePasses: 0,
		winner: null
	};

	if (move.type === 'pass') {
		next.consecutivePasses = state.consecutivePasses + 1;
		// Defensive: mutual deadlock should be impossible, but never hang the game.
		if (next.consecutivePasses >= 2) {
			next.winner =
				next.dice[0].length === next.dice[1].length
					? ((1 - state.firstPlayer) as PlayerId)
					: next.dice[0].length > next.dice[1].length
						? 0
						: 1;
		}
		return next;
	}

	const attackerIds = move.type === 'strength' ? [move.attackerId] : move.attackerIds;
	const defender = (1 - state.turn) as PlayerId;
	next.dice[defender] = next.dice[defender].filter((d) => d.id !== move.targetId);
	for (const die of next.dice[state.turn]) {
		if (attackerIds.includes(die.id)) die.value = rollDie(die.sides, rng);
	}
	if (next.dice[defender].length === 0) next.winner = state.turn;
	return next;
}
