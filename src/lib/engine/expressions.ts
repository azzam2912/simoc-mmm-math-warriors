/**
 * Countdown-style subset-combine solver, shared by Maths Warriors mind
 * attacks and the MMM puzzle generator.
 *
 * For a list of input values, computes every integer reachable by combining
 * any subset of them with +, -, x, / (each value used at most once), keeping
 * one representative expression string per (subset, value).
 *
 * Intermediates are restricted to non-negative integers (subtraction both
 * orders, division only when exact) and capped in magnitude — the standard
 * Countdown pruning. This misses exotic fractional-intermediate expressions
 * (e.g. 8÷(2÷3)) but their targets are almost always reachable another way
 * (8×3÷2), and it keeps 6-value solves in the low milliseconds.
 */

/** Intermediates above this can't plausibly help reach game-sized targets. */
const MAGNITUDE_CAP = 5000;

export type ReachMap = Map<number, Map<number, string>>;

function popcount(x: number): number {
	let c = 0;
	while (x) {
		x &= x - 1;
		c++;
	}
	return c;
}

/** Reachable integers for every subset (bitmask) of `values` up to `maxUsed` values. */
export function solve(values: number[], maxUsed = values.length): ReachMap {
	const n = values.length;
	const reach: ReachMap = new Map();

	for (let i = 0; i < n; i++) {
		reach.set(1 << i, new Map([[values[i], String(values[i])]]));
	}

	const masks: number[] = [];
	for (let m = 1; m < 1 << n; m++) {
		const pc = popcount(m);
		if (pc >= 2 && pc <= maxUsed) masks.push(m);
	}
	masks.sort((a, b) => popcount(a) - popcount(b));

	for (const mask of masks) {
		const out = new Map<number, string>();
		// Enumerate unordered split pairs {s, mask^s}; s > mask^s dedupes.
		for (let s = (mask - 1) & mask; s > 0; s = (s - 1) & mask) {
			const t = mask ^ s;
			if (s < t) continue;
			const rs = reach.get(s);
			const rt = reach.get(t);
			if (!rs || !rt) continue;
			for (const [a, ea] of rs) {
				for (const [b, eb] of rt) {
					const sum = a + b;
					if (sum <= MAGNITUDE_CAP && !out.has(sum)) out.set(sum, `(${ea}+${eb})`);
					const prod = a * b;
					if (prod <= MAGNITUDE_CAP && !out.has(prod)) out.set(prod, `(${ea}×${eb})`);
					if (a >= b && !out.has(a - b)) out.set(a - b, `(${ea}-${eb})`);
					if (b >= a && !out.has(b - a)) out.set(b - a, `(${eb}-${ea})`);
					if (b !== 0 && a % b === 0 && !out.has(a / b)) out.set(a / b, `(${ea}÷${eb})`);
					if (a !== 0 && b % a === 0 && !out.has(b / a)) out.set(b / a, `(${eb}÷${ea})`);
				}
			}
		}
		reach.set(mask, out);
	}

	return reach;
}

export interface TargetHit {
	mask: number;
	expr: string;
}

/**
 * All non-negative integers reachable using between `minUsed` and `maxUsed`
 * of the inputs. For each target keeps the hit using the fewest values.
 */
export function reachableTargets(
	values: number[],
	minUsed = 2,
	maxUsed = values.length
): Map<number, TargetHit> {
	const reach = solve(values, maxUsed);
	const out = new Map<number, TargetHit>();
	const masks = [...reach.keys()].sort((a, b) => popcount(a) - popcount(b));
	for (const mask of masks) {
		const pc = popcount(mask);
		if (pc < minUsed || pc > maxUsed) continue;
		for (const [value, expr] of reach.get(mask)!) {
			if (!out.has(value)) out.set(value, { mask, expr });
		}
	}
	return out;
}

/** Positive integers reachable using ALL inputs (full mask only). */
export function targetsUsingAll(values: number[]): Map<number, string> {
	const reach = solve(values);
	const full = reach.get((1 << values.length) - 1);
	const out = new Map<number, string>();
	if (!full) return out;
	for (const [value, expr] of full) {
		if (value > 0) out.set(value, expr);
	}
	return out;
}
