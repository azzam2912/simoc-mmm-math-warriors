/** Exact fraction arithmetic. Always normalized: gcd(|n|, d) = 1, d > 0. */
export interface Rational {
	n: number;
	d: number;
}

function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b !== 0) {
		[a, b] = [b, a % b];
	}
	return a;
}

export function rat(n: number, d = 1): Rational {
	if (d === 0) throw new Error('zero denominator');
	if (d < 0) {
		n = -n;
		d = -d;
	}
	const g = gcd(n, d) || 1;
	return { n: n / g, d: d / g };
}

export function add(a: Rational, b: Rational): Rational {
	return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Rational, b: Rational): Rational {
	return rat(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Rational, b: Rational): Rational {
	return rat(a.n * b.n, a.d * b.d);
}

/** Returns null when dividing by zero. */
export function div(a: Rational, b: Rational): Rational | null {
	if (b.n === 0) return null;
	return rat(a.n * b.d, a.d * b.n);
}

export function eq(a: Rational, b: Rational): boolean {
	return a.n === b.n && a.d === b.d;
}

export function isInt(a: Rational): boolean {
	return a.d === 1;
}

export function key(a: Rational): string {
	return `${a.n}/${a.d}`;
}
