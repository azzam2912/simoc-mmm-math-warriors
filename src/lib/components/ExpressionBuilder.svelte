<script lang="ts" module>
	export type ExprToken =
		| { kind: 'chip'; id: string; value: number }
		| { kind: 'op'; op: '+' | '−' | '×' | '÷' }
		| { kind: 'lparen' }
		| { kind: 'rparen' };

	export function tokensToString(tokens: ExprToken[]): string {
		return tokens
			.map((t) => {
				if (t.kind === 'chip') return String(t.value);
				if (t.kind === 'op') return t.op === '−' ? '-' : t.op;
				return t.kind === 'lparen' ? '(' : ')';
			})
			.join(' ');
	}
</script>

<script lang="ts">
	interface Chip {
		id: string;
		value: number;
	}

	interface Props {
		chips: Chip[];
		tokens: ExprToken[];
		/** Extra content rendered on the result slot (e.g. "= 14"). */
		result?: string;
		resultOk?: boolean;
	}

	let { chips, tokens = $bindable(), result = '', resultOk = false }: Props = $props();

	const usedIds = $derived(
		new Set(tokens.filter((t) => t.kind === 'chip').map((t) => t.id))
	);

	function push(token: ExprToken) {
		tokens = [...tokens, token];
	}

	function backspace() {
		tokens = tokens.slice(0, -1);
	}

	const OPS = ['+', '−', '×', '÷'] as const;
</script>

<div class="builder panel">
	<div class="strip">
		{#if tokens.length === 0}
			<span class="hint">Tap numbers and operators to build an expression…</span>
		{:else}
			{#each tokens as token, i (i)}
				<span class="token" class:num={token.kind === 'chip'}>
					{#if token.kind === 'chip'}{token.value}{:else if token.kind === 'op'}{token.op}{:else if token.kind === 'lparen'}({:else}){/if}
				</span>
			{/each}
			{#if result}
				<span class="result" class:ok={resultOk}>= {result}</span>
			{/if}
		{/if}
	</div>
	<div class="controls">
		<div class="chips">
			{#each chips as chip (chip.id)}
				<button
					class="chip"
					disabled={usedIds.has(chip.id)}
					onclick={() => push({ kind: 'chip', id: chip.id, value: chip.value })}
				>
					{chip.value}
				</button>
			{/each}
		</div>
		<div class="ops">
			{#each OPS as op (op)}
				<button class="op" onclick={() => push({ kind: 'op', op })}>{op}</button>
			{/each}
			<button class="op" onclick={() => push({ kind: 'lparen' })}>(</button>
			<button class="op" onclick={() => push({ kind: 'rparen' })}>)</button>
			<button class="op edit" onclick={backspace} disabled={tokens.length === 0}>⌫</button>
			<button class="op edit" onclick={() => (tokens = [])} disabled={tokens.length === 0}>
				Clear
			</button>
		</div>
	</div>
</div>

<style>
	.builder {
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.strip {
		min-height: 2.6rem;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem;
		padding: 0.35rem 0.6rem;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.35);
		font-size: 1.25rem;
		font-weight: 700;
	}

	.hint {
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--text-dim);
	}

	.token.num {
		color: var(--fire-2);
	}

	.result {
		margin-left: 0.5rem;
		color: var(--text-dim);
	}

	.result.ok {
		color: #58e07c;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		justify-content: space-between;
	}

	.chips,
	.ops {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.chip,
	.op {
		min-width: 2.4rem;
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 900;
		transition: transform 80ms;
	}

	.chip {
		background: linear-gradient(180deg, var(--fire-2), var(--fire-1));
		color: #2b0d00;
	}

	.op {
		background: var(--bg-panel-strong);
		color: var(--text);
	}

	.op.edit {
		font-size: 0.9rem;
	}

	.chip:not(:disabled):hover,
	.op:not(:disabled):hover {
		transform: scale(1.1);
	}

	.chip:disabled,
	.op:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
