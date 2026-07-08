import { applyMove, legalMoves } from './rules';
import type { GameState, Move, Rng } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** The AI caps mind-attack expressions at 3 dice to keep search cheap. */
const AI_MAX_MIND_DICE = 3;

export function chooseMove(state: GameState, difficulty: Difficulty, rng: Rng = Math.random): Move {
	let moves = legalMoves(state, AI_MAX_MIND_DICE);
	// Passing is only legal when NO move exists, including 4+ dice mind
	// attacks the cheap search skips — recheck unrestricted before passing.
	if (moves.length === 1 && moves[0].type === 'pass') moves = legalMoves(state);
	if (moves.length === 1) return moves[0];
	switch (difficulty) {
		case 'easy':
			return moves[Math.floor(rng() * moves.length)];
		case 'medium':
			return greedy(state, moves);
		case 'hard':
			return expectimax(state, moves, rng);
	}
}

function dieById(state: GameState, playerIdx: 0 | 1, id: string) {
	return state.dice[playerIdx].find((d) => d.id === id)!;
}

/**
 * Capture the most dangerous target: highest current value, then biggest die.
 * Prefer strength over mind (fewer of our dice rerolled), and mind attacks
 * that consume fewer dice.
 */
function greedyScore(state: GameState, move: Move): number {
	if (move.type === 'pass') return -Infinity;
	const defender = (1 - state.turn) as 0 | 1;
	const target = dieById(state, defender, move.targetId);
	let score = target.value * 100 + target.sides * 10;
	if (move.type === 'strength') {
		const attacker = dieById(state, state.turn, move.attackerId);
		score += 5 - (attacker.value - target.value); // waste as little as possible
	} else {
		score -= move.attackerIds.length * 2;
	}
	return score;
}

function greedy(state: GameState, moves: Move[]): Move {
	let best = moves[0];
	let bestScore = -Infinity;
	for (const move of moves) {
		const score = greedyScore(state, move);
		if (score > bestScore) {
			bestScore = score;
			best = move;
		}
	}
	return best;
}

function evaluate(state: GameState, me: 0 | 1): number {
	const opp = (1 - me) as 0 | 1;
	if (state.winner === me) return 1e6;
	if (state.winner === opp) return -1e6;
	const sum = (idx: 0 | 1, f: (d: { sides: number; value: number }) => number) =>
		state.dice[idx].reduce((acc, d) => acc + f(d), 0);
	return (
		1000 * (state.dice[me].length - state.dice[opp].length) +
		(sum(me, (d) => d.sides) - sum(opp, (d) => d.sides)) +
		0.1 * (sum(me, (d) => d.value) - sum(opp, (d) => d.value))
	);
}

const SAMPLES = 12;

/**
 * Depth-2 expectimax: for each of my moves, average over sampled rerolls of
 * my attacking dice, letting the opponent reply greedily.
 */
function expectimax(state: GameState, moves: Move[], rng: Rng): Move {
	const me = state.turn;
	let best = moves[0];
	let bestMean = -Infinity;
	for (const move of moves) {
		let total = 0;
		const samples = move.type === 'pass' ? 1 : SAMPLES;
		for (let i = 0; i < samples; i++) {
			const after = applyMove(state, move, rng);
			if (after.winner !== null) {
				total += evaluate(after, me);
				continue;
			}
			const reply = greedy(after, legalMoves(after, AI_MAX_MIND_DICE));
			total += evaluate(applyMove(after, reply, rng), me);
		}
		const mean = total / samples;
		if (mean > bestMean) {
			bestMean = mean;
			best = move;
		}
	}
	return best;
}
