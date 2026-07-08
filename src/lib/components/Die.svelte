<script lang="ts">
	interface Props {
		sides: number;
		value: number;
		color: 'green' | 'blue';
		selected?: boolean;
		/** Legal-move glow (this die can be targeted / used right now). */
		highlight?: boolean;
		disabled?: boolean;
		/** Increment to trigger the roll animation (value should already be final). */
		rollTick?: number;
		onclick?: () => void;
	}

	let {
		sides,
		value,
		color,
		selected = false,
		highlight = false,
		disabled = false,
		rollTick = 0,
		onclick
	}: Props = $props();

	const SHAPES: Record<number, string> = {
		4: '50,10 94,88 6,88',
		8: '50,4 94,50 50,96 6,50',
		10: '50,4 90,38 72,94 28,94 10,38',
		12: '50,4 95,38 78,94 22,94 5,38',
		20: '50,3 91,26 91,74 50,97 9,74 9,26'
	};

	// d4 numbers sit low inside the triangle; everything else centres.
	const TEXT_Y: Record<number, number> = { 4: 68, 6: 55, 8: 55, 10: 52, 12: 52, 20: 55 };

	// svelte-ignore state_referenced_locally -- initial value only; effects keep it in sync
	let shown = $state(value);
	let rolling = $state(false);

	$effect(() => {
		if (rollTick === 0) {
			shown = value;
			return;
		}
		rolling = true;
		const interval = setInterval(() => {
			shown = 1 + Math.floor(Math.random() * sides);
		}, 70);
		const timer = setTimeout(() => {
			clearInterval(interval);
			shown = value;
			rolling = false;
		}, 550);
		return () => {
			clearInterval(interval);
			clearTimeout(timer);
			shown = value;
			rolling = false;
		};
	});

	// Keep the displayed value in sync when it changes without a roll trigger.
	$effect(() => {
		if (!rolling) shown = value;
	});
</script>

<button
	class="die {color}"
	class:selected
	class:highlight
	class:rolling
	{disabled}
	{onclick}
	aria-label="d{sides} showing {value}"
>
	<svg viewBox="0 0 100 100">
		{#if sides === 6}
			<rect x="8" y="8" width="84" height="84" rx="16" class="face" />
		{:else}
			<polygon points={SHAPES[sides]} class="face" />
		{/if}
		<text x="50" y={TEXT_Y[sides] ?? 55} text-anchor="middle" dominant-baseline="middle">
			{shown}
		</text>
	</svg>
	<span class="kind">d{sides}</span>
</button>

<style>
	.die {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		padding: 0.2rem;
		border-radius: 10px;
		transition: transform 100ms;
	}

	.die:not(:disabled):hover {
		transform: scale(1.08);
	}

	svg {
		width: clamp(3rem, 9vw, 4.2rem);
		height: clamp(3rem, 9vw, 4.2rem);
		overflow: visible;
	}

	.face {
		stroke-width: 4;
		stroke-linejoin: round;
	}

	.green .face {
		fill: var(--green-1);
		stroke: var(--green-2);
	}

	.blue .face {
		fill: var(--blue-1);
		stroke: var(--blue-2);
	}

	text {
		font-family: Nunito, sans-serif;
		font-weight: 900;
		font-size: 38px;
		fill: #fff;
		paint-order: stroke;
		stroke: rgba(0, 0, 0, 0.35);
		stroke-width: 3;
	}

	.kind {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-dim);
	}

	.selected svg {
		filter: drop-shadow(0 0 8px var(--fire-2)) drop-shadow(0 0 3px var(--fire-2));
	}

	.selected {
		outline: 2px solid var(--fire-2);
		outline-offset: 2px;
	}

	.highlight svg {
		filter: drop-shadow(0 0 9px #ff3b1f) drop-shadow(0 0 4px #ffc400);
	}

	.highlight .face {
		stroke: var(--fire-2);
	}

	.rolling svg {
		animation: shake 120ms infinite;
	}

	.die:disabled {
		cursor: default;
	}

	@keyframes shake {
		0% {
			transform: rotate(-8deg) translateX(-2px);
		}
		50% {
			transform: rotate(8deg) translateX(2px);
		}
		100% {
			transform: rotate(-8deg) translateX(-2px);
		}
	}
</style>
