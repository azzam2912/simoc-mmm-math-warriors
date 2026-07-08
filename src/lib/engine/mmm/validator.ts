import { type Rational, rat, add, sub, mul, div, isInt } from '../rational';

export interface ValidationResult {
	ok: boolean;
	/** Human-readable reason when ok is false. */
	error?: string;
	value?: Rational;
}

interface ParseState {
	tokens: Token[];
	pos: number;
	numbersUsed: number[];
}

type Token =
	| { kind: 'num'; value: number }
	| { kind: 'op'; op: '+' | '-' | '×' | '÷' }
	| { kind: 'lparen' }
	| { kind: 'rparen' };

function tokenize(input: string): Token[] | string {
	const tokens: Token[] = [];
	let i = 0;
	while (i < input.length) {
		const ch = input[i];
		if (ch === ' ' || ch === '\t') {
			i++;
		} else if (/[0-9]/.test(ch)) {
			let j = i;
			while (j < input.length && /[0-9]/.test(input[j])) j++;
			tokens.push({ kind: 'num', value: parseInt(input.slice(i, j), 10) });
			i = j;
		} else if (ch === '+') {
			tokens.push({ kind: 'op', op: '+' });
			i++;
		} else if (ch === '-' || ch === '−') {
			tokens.push({ kind: 'op', op: '-' });
			i++;
		} else if (ch === '×' || ch === '*' || ch === 'x' || ch === 'X') {
			tokens.push({ kind: 'op', op: '×' });
			i++;
		} else if (ch === '÷' || ch === '/') {
			tokens.push({ kind: 'op', op: '÷' });
			i++;
		} else if (ch === '(') {
			tokens.push({ kind: 'lparen' });
			i++;
		} else if (ch === ')') {
			tokens.push({ kind: 'rparen' });
			i++;
		} else {
			return `unexpected character "${ch}"`;
		}
	}
	return tokens;
}

// Grammar: expr → term (('+'|'-') term)* ; term → factor (('×'|'÷') factor)* ;
// factor → number | '(' expr ')'
function parseExpr(s: ParseState): Rational | string {
	let left = parseTerm(s);
	if (typeof left === 'string') return left;
	while (s.pos < s.tokens.length) {
		const t = s.tokens[s.pos];
		if (t.kind !== 'op' || (t.op !== '+' && t.op !== '-')) break;
		s.pos++;
		const right = parseTerm(s);
		if (typeof right === 'string') return right;
		left = t.op === '+' ? add(left, right) : sub(left, right);
	}
	return left;
}

function parseTerm(s: ParseState): Rational | string {
	let left = parseFactor(s);
	if (typeof left === 'string') return left;
	while (s.pos < s.tokens.length) {
		const t = s.tokens[s.pos];
		if (t.kind !== 'op' || (t.op !== '×' && t.op !== '÷')) break;
		s.pos++;
		const right = parseFactor(s);
		if (typeof right === 'string') return right;
		if (t.op === '×') {
			left = mul(left, right);
		} else {
			const q = div(left, right);
			if (q === null) return 'division by zero';
			left = q;
		}
	}
	return left;
}

function parseFactor(s: ParseState): Rational | string {
	const t = s.tokens[s.pos];
	if (!t) return 'unexpected end of expression';
	if (t.kind === 'num') {
		s.pos++;
		s.numbersUsed.push(t.value);
		return rat(t.value);
	}
	if (t.kind === 'lparen') {
		s.pos++;
		const inner = parseExpr(s);
		if (typeof inner === 'string') return inner;
		const close = s.tokens[s.pos];
		if (!close || close.kind !== 'rparen') return 'missing closing parenthesis';
		s.pos++;
		return inner;
	}
	return 'expected a number or "("';
}

export interface EvalResult {
	value: Rational;
	numbersUsed: number[];
}

/** Parse and evaluate a bare expression; returns an error string when malformed. */
export function evaluateExpression(input: string): EvalResult | { error: string } {
	const tokens = tokenize(input.trim());
	if (typeof tokens === 'string') return { error: tokens };
	if (tokens.length === 0) return { error: 'empty expression' };
	const s: ParseState = { tokens, pos: 0, numbersUsed: [] };
	const value = parseExpr(s);
	if (typeof value === 'string') return { error: value };
	if (s.pos !== tokens.length) return { error: 'unexpected trailing input' };
	return { value, numbersUsed: s.numbersUsed };
}

export interface ValidateOptions {
	requireAllFour?: boolean;
}

/**
 * Checks that `input` is a well-formed expression over the puzzle corners
 * (each corner used at most once, at least 2 numbers) equal to `target`.
 */
export function validate(
	input: string,
	corners: number[],
	target: number,
	options: ValidateOptions = {}
): ValidationResult {
	const parsed = evaluateExpression(input);
	if ('error' in parsed) return { ok: false, error: parsed.error };
	const { value, numbersUsed } = parsed;

	// Multiset consumption of corners — handles duplicate corner numbers.
	const remaining = [...corners];
	for (const used of numbersUsed) {
		const idx = remaining.indexOf(used);
		if (idx === -1) return { ok: false, error: `${used} is not an available corner number` };
		remaining.splice(idx, 1);
	}

	if (numbersUsed.length < 2) return { ok: false, error: 'use at least 2 corner numbers' };
	if (options.requireAllFour && remaining.length > 0) {
		return { ok: false, error: 'use all 4 corner numbers' };
	}
	if (!isInt(value) || value.n !== target) {
		const shown = isInt(value) ? String(value.n) : `${value.n}/${value.d}`;
		return { ok: false, error: `expression equals ${shown}, not ${target}`, value };
	}
	return { ok: true, value };
}
