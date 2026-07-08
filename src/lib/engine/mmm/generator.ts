import { targetsUsingAll } from '../expressions';
import type { DifficultyPreset } from './difficulty';

export interface Puzzle {
	corners: number[];
	target: number;
	/** One valid expression using all four corners, for "show solution". */
	solution: string;
}

type Rng = () => number;

function drawCorner(preset: DifficultyPreset, rng: Rng): number {
	if (preset.timesTableBias && rng() < 0.6) {
		return 2 + Math.floor(rng() * 11); // 2..12
	}
	return preset.cornerMin + Math.floor(rng() * (preset.cornerMax - preset.cornerMin + 1));
}

function isTrivial(corners: number[], target: number): boolean {
	for (let i = 0; i < corners.length; i++) {
		for (let j = 0; j < corners.length; j++) {
			if (i === j) continue;
			if (corners[i] + corners[j] === target || corners[i] - corners[j] === target) return true;
		}
	}
	return false;
}

export function generatePuzzle(preset: DifficultyPreset, rng: Rng = Math.random): Puzzle {
	// Redraw loop: each attempt draws 4 corners and looks for admissible
	// targets reachable using all four. Very few redraws needed in practice.
	for (let attempt = 0; attempt < 200; attempt++) {
		const corners = Array.from({ length: 4 }, () => drawCorner(preset, rng));
		const all = targetsUsingAll(corners);
		const admissible: Array<[number, string]> = [];
		for (const [target, expr] of all) {
			if (target < preset.targetMin || target > preset.targetMax) continue;
			if (preset.rejectTrivial && isTrivial(corners, target)) continue;
			if (preset.requireMulDiv && !/[×÷]/.test(expr)) continue;
			admissible.push([target, expr]);
		}
		if (admissible.length === 0) continue;
		// Weight toward mid-range targets: sort by distance from the range
		// midpoint and pick from the closer half.
		const mid = (preset.targetMin + preset.targetMax) / 2;
		admissible.sort((a, b) => Math.abs(a[0] - mid) - Math.abs(b[0] - mid));
		const pool = admissible.slice(0, Math.max(1, Math.ceil(admissible.length / 2)));
		const [target, solution] = pool[Math.floor(rng() * pool.length)];
		return { corners, target, solution };
	}
	throw new Error('could not generate a solvable puzzle');
}
