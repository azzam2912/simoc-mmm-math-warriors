import { describe, expect, it } from 'vitest';
import { DIVISIONS, PRESETS } from './difficulty';
import { generatePuzzle } from './generator';
import { validate } from './validator';

function seeded(seed: number) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe('generatePuzzle', () => {
	for (const division of DIVISIONS) {
		it(`${division}: 300 puzzles are in range and self-validating`, () => {
			const preset = PRESETS[division];
			const rng = seeded(99);
			for (let i = 0; i < 300; i++) {
				const puzzle = generatePuzzle(preset, rng);
				expect(puzzle.corners).toHaveLength(4);
				for (const c of puzzle.corners) {
					expect(c).toBeGreaterThanOrEqual(Math.min(preset.cornerMin, 2));
					expect(c).toBeLessThanOrEqual(preset.cornerMax);
				}
				expect(puzzle.target).toBeGreaterThanOrEqual(preset.targetMin);
				expect(puzzle.target).toBeLessThanOrEqual(preset.targetMax);
				if (preset.requireMulDiv) expect(puzzle.solution).toMatch(/[×÷]/);
				// The stored solution must pass the validator (cross-validates
				// solver expression strings against the parser).
				const result = validate(puzzle.solution, puzzle.corners, puzzle.target, {
					requireAllFour: true
				});
				expect(result.ok, `${puzzle.solution} for ${JSON.stringify(puzzle)}`).toBe(true);
			}
		});
	}
});

describe('validate', () => {
	const corners = [5, 3, 4, 2];
	const target = 16;

	it('accepts SIMOC example solutions', () => {
		expect(validate('(5+3)×2', corners, target).ok).toBe(true);
		expect(validate('(5+3)+4×2', corners, target).ok).toBe(true);
		expect(validate('(5-3)×4×2', corners, target).ok).toBe(true);
	});

	it('accepts ascii operators and spaces', () => {
		expect(validate(' (5 + 3) * 2 ', corners, target).ok).toBe(true);
		expect(validate('4/2*(5+3)', corners, target).ok).toBe(true);
	});

	it('rejects reused corners', () => {
		const r = validate('4×4', corners, target);
		expect(r.ok).toBe(false);
		expect(r.error).toMatch(/not an available corner/);
	});

	it('rejects numbers that are not corners', () => {
		expect(validate('8×2', corners, target).ok).toBe(false);
	});

	it('handles duplicate corners as a multiset', () => {
		expect(validate('4×4', [4, 4, 1, 1], 16).ok).toBe(true);
		expect(validate('4×4×4', [4, 4, 1, 1], 64).ok).toBe(false);
	});

	it('rejects wrong totals with a helpful message', () => {
		const r = validate('5+3', corners, target);
		expect(r.ok).toBe(false);
		expect(r.error).toMatch(/equals 8, not 16/);
	});

	it('rejects malformed input', () => {
		expect(validate('5+', corners, target).ok).toBe(false);
		expect(validate('(5+3', corners, target).ok).toBe(false);
		expect(validate('5 3', corners, target).ok).toBe(false);
		expect(validate('hello', corners, target).ok).toBe(false);
		expect(validate('', corners, target).ok).toBe(false);
	});

	it('rejects single-number and division-by-zero expressions', () => {
		expect(validate('16', [16, 1, 1, 1], 16).ok).toBe(false);
		expect(validate('5÷(3-3)', [5, 3, 3, 1], 1).ok).toBe(false);
	});

	it('enforces requireAllFour when set', () => {
		expect(validate('(5+3)×2', corners, target, { requireAllFour: true }).ok).toBe(false);
		expect(validate('(5+3)×2+4-4', [5, 3, 2, 4], 16).ok).toBe(false); // 4 not reusable
		expect(validate('(5-3)×4×2', [5, 3, 2, 4], 16, { requireAllFour: true }).ok).toBe(true);
	});
});
