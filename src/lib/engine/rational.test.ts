import { describe, expect, it } from 'vitest';
import { rat, add, sub, mul, div, eq, isInt, key } from './rational';

describe('rational', () => {
	it('normalizes sign and gcd', () => {
		expect(rat(4, 8)).toEqual({ n: 1, d: 2 });
		expect(rat(3, -6)).toEqual({ n: -1, d: 2 });
		expect(rat(-2, -4)).toEqual({ n: 1, d: 2 });
		expect(rat(0, 5)).toEqual({ n: 0, d: 1 });
	});

	it('throws on zero denominator', () => {
		expect(() => rat(1, 0)).toThrow();
	});

	it('adds, subtracts, multiplies', () => {
		expect(add(rat(1, 2), rat(1, 3))).toEqual(rat(5, 6));
		expect(sub(rat(1, 2), rat(2, 3))).toEqual(rat(-1, 6));
		expect(mul(rat(2, 3), rat(3, 4))).toEqual(rat(1, 2));
	});

	it('divides and returns null on zero divisor', () => {
		expect(div(rat(1, 2), rat(3, 4))).toEqual(rat(2, 3));
		expect(div(rat(1), rat(0))).toBeNull();
	});

	it('eq / isInt / key', () => {
		expect(eq(rat(2, 4), rat(1, 2))).toBe(true);
		expect(isInt(rat(6, 3))).toBe(true);
		expect(isInt(rat(1, 2))).toBe(false);
		expect(key(rat(-3, 6))).toBe('-1/2');
	});
});
