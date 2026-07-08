import { describe, expect, it } from 'vitest';
import { reachableTargets, solve, targetsUsingAll } from './expressions';

function evalExpr(expr: string): number {
	// Test-only sanity evaluator for solver output (fully parenthesized).
	return new Function(`return (${expr.replaceAll('×', '*').replaceAll('÷', '/')})`)() as number;
}

describe('solve / reachableTargets', () => {
	it('reaches classic combinations', () => {
		const targets = reachableTargets([2, 3, 4]);
		expect(targets.has(14)).toBe(true); // (3+4)x2
		expect(targets.has(2)).toBe(true); // (2x3)-4
		expect(targets.has(24)).toBe(true); // 2x3x4
		expect(targets.has(1)).toBe(true); // 3-2
		expect(targets.has(23)).toBe(false); // unreachable from 2,3,4
	});

	it('reaches division-dependent targets: 8x3/2 = 12', () => {
		expect(reachableTargets([8, 2, 3]).get(12)).toBeDefined();
	});

	it('reaches a die value via extra dice: 4x(3/3) = 4', () => {
		const targets = reachableTargets([4, 3, 3], 2);
		expect(targets.has(4)).toBe(true);
	});

	it('respects minUsed', () => {
		// With minUsed=2, a bare single die value must come from a combination.
		const targets = reachableTargets([5, 1], 2);
		expect(targets.get(5)?.mask).toBe(0b11); // 5x1 or 5/1, not the lone 5
	});

	it('respects maxUsed', () => {
		// 2x3x4 = 24 needs three values; capped at 2 it is unreachable.
		expect(reachableTargets([2, 3, 4], 2, 2).has(24)).toBe(false);
	});

	it('every stored expression evaluates to its claimed value', () => {
		const reach = solve([4, 6, 8, 10, 12, 20].map(() => 1 + Math.floor(Math.random() * 10)));
		for (const perMask of reach.values()) {
			for (const [value, expr] of perMask) {
				expect(evalExpr(expr)).toBe(value);
			}
		}
	});

	it('solves 6 dice quickly', () => {
		const start = performance.now();
		solve([3, 5, 2, 9, 11, 17]);
		solve([20, 19, 18, 12, 11, 10]);
		expect(performance.now() - start).toBeLessThan(500);
	});
});

describe('targetsUsingAll', () => {
	it('only reports full-mask positive integers', () => {
		const all = targetsUsingAll([2, 3, 4]);
		expect(all.has(24)).toBe(true); // 2x3x4
		expect(all.has(9)).toBe(true); // 2+3+4
		for (const expr of all.values()) {
			expect(expr).toMatch(/2/);
			expect(expr).toMatch(/3/);
			expect(expr).toMatch(/4/);
		}
	});
});
