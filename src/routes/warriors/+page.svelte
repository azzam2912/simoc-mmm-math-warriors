<script lang="ts">
	import { scale } from 'svelte/transition';
	import Die from '$lib/components/Die.svelte';
	import ExpressionBuilder, {
		tokensToString,
		type ExprToken
	} from '$lib/components/ExpressionBuilder.svelte';
	import { chooseMove, type Difficulty } from '$lib/engine/warriors/ai';
	import { applyMove, legalMoves, newGame } from '$lib/engine/warriors/rules';
	import type { GameState, Move, PlayerId } from '$lib/engine/warriors/types';
	import { evaluateExpression } from '$lib/engine/mmm/validator';
	import { isInt } from '$lib/engine/rational';
	import { load, save } from '$lib/state/persist';

	type Mode = 'ai' | 'hotseat';

	let screen = $state<'setup' | 'game'>('setup');
	let mode = $state<Mode>(load<Mode>('warriors-mode', 'ai'));
	let difficulty = $state<Difficulty>(load<Difficulty>('warriors-difficulty', 'easy'));

	let game = $state<GameState>(newGame());
	let busy = $state(false);
	let selectedId = $state<string | null>(null);
	let mindTokens = $state<ExprToken[]>([]);
	let rollTicks = $state<Record<string, number>>({});
	let message = $state('');

	const HUMAN: PlayerId = 0;
	const names = $derived(
		mode === 'ai' ? ['You', 'Computer'] : ['Green player', 'Blue player']
	);

	const gameOver = $derived(game.winner !== null);
	const humanTurn = $derived(!gameOver && !busy && (mode === 'hotseat' || game.turn === HUMAN));
	const moves = $derived(gameOver ? [] : legalMoves(game));
	const mustPass = $derived(moves.length === 1 && moves[0].type === 'pass');
	const oneVsOne = $derived(game.dice[0].length === 1 && game.dice[1].length === 1);

	const myDice = $derived(game.dice[game.turn]);
	const theirDice = $derived(game.dice[1 - game.turn]);

	/** Opponent die ids capturable by the currently selected die. */
	const strengthTargets = $derived.by(() => {
		if (!selectedId) return new Set<string>();
		return new Set(
			moves
				.filter((m) => m.type === 'strength' && m.attackerId === selectedId)
				.map((m) => (m.type === 'strength' ? m.targetId : ''))
		);
	});

	/** Value of the mind-attack expression, when well-formed. */
	const mindEval = $derived.by(() => {
		if (mindTokens.length === 0) return null;
		const parsed = evaluateExpression(tokensToString(mindTokens));
		if ('error' in parsed) return { text: '…', value: null as number | null };
		const ok = isInt(parsed.value) && parsed.numbersUsed.length >= 2;
		return {
			text: isInt(parsed.value) ? String(parsed.value.n) : `${parsed.value.n}/${parsed.value.d}`,
			value: ok ? parsed.value.n : null
		};
	});

	const mindTargets = $derived.by(() => {
		const value = mindEval?.value;
		if (value == null) return new Set<string>();
		return new Set(theirDice.filter((d) => d.value === value).map((d) => d.id));
	});

	function startGame() {
		save('warriors-mode', mode);
		save('warriors-difficulty', difficulty);
		game = newGame();
		rollTicks = {};
		for (const side of game.dice) for (const die of side) bumpRoll(die.id);
		selectedId = null;
		mindTokens = [];
		busy = false;
		message = `${names[game.firstPlayer]} rolled the smallest dice and ${game.firstPlayer === 0 && mode === 'ai' ? 'go' : 'goes'} first!`;
		screen = 'game';
		maybeRunAi();
	}

	function bumpRoll(dieId: string) {
		rollTicks[dieId] = (rollTicks[dieId] ?? 0) + 1;
	}

	function describe(move: Move, actor: string): string {
		if (move.type === 'pass') return `${actor} had no legal move and passed.`;
		const defender = game.dice[1 - game.turn];
		const target = defender.find((d) => d.id === move.targetId);
		const targetLabel = target ? `d${target.sides} (${target.value})` : 'a die';
		if (move.type === 'strength') {
			const attacker = game.dice[game.turn].find((d) => d.id === move.attackerId);
			return `${actor}: strength attack with d${attacker?.sides} (${attacker?.value}) captures ${targetLabel}!`;
		}
		return `${actor}: mind attack ${move.expr} = ${target?.value} captures ${targetLabel}!`;
	}

	function doMove(move: Move) {
		message = describe(move, names[game.turn]);
		if (move.type === 'strength') bumpRoll(move.attackerId);
		if (move.type === 'mind') for (const id of move.attackerIds) bumpRoll(id);
		game = applyMove(game, move);
		selectedId = null;
		mindTokens = [];
		if (game.winner !== null) {
			message = `${names[game.winner]} win${game.winner === 0 && mode === 'ai' ? '' : 's'} the battle! 🏆`;
			return;
		}
		maybeRunAi();
	}

	function maybeRunAi() {
		if (mode !== 'ai' || game.turn === HUMAN || game.winner !== null) return;
		busy = true;
		setTimeout(() => {
			const move = chooseMove(game, difficulty);
			busy = false;
			doMove(move);
		}, 900);
	}

	function clickOwnDie(id: string) {
		if (!humanTurn) return;
		selectedId = selectedId === id ? null : id;
	}

	function clickOpponentDie(id: string) {
		if (!humanTurn) return;
		if (selectedId && strengthTargets.has(id)) {
			doMove({ type: 'strength', attackerId: selectedId, targetId: id });
			return;
		}
		if (mindTargets.has(id)) {
			const attackerIds = [
				...new Set(
					mindTokens.filter((t) => t.kind === 'chip').map((t) => (t.kind === 'chip' ? t.id : ''))
				)
			];
			doMove({
				type: 'mind',
				attackerIds,
				expr: tokensToString(mindTokens).replaceAll(' ', ''),
				targetId: id
			});
		}
	}

	function pass() {
		if (humanTurn && mustPass) doMove({ type: 'pass' });
	}

	function hint() {
		const mind = moves.find((m) => m.type === 'mind');
		const strength = moves.find((m) => m.type === 'strength');
		if (mind && mind.type === 'mind') {
			const target = theirDice.find((d) => d.id === mind.targetId);
			message = `Hint: mind attack ${mind.expr} = ${target?.value} can capture the d${target?.sides}!`;
		} else if (strength && strength.type === 'strength') {
			const attacker = myDice.find((d) => d.id === strength.attackerId);
			const target = theirDice.find((d) => d.id === strength.targetId);
			message = `Hint: your d${attacker?.sides} (${attacker?.value}) can capture the d${target?.sides} (${target?.value}).`;
		} else {
			message = 'Hint: no legal moves — you must pass.';
		}
	}

	// Rows are fixed: player 1 (blue) on top, player 0 (green) below.
	const topDice = $derived(game.dice[1]);
	const bottomDice = $derived(game.dice[0]);
</script>

<svelte:head>
	<title>Maths Warriors — dice duel</title>
</svelte:head>

{#if screen === 'setup'}
	<section class="setup panel">
		<h1 class="fire-text">Maths Warriors</h1>
		<p class="rules-blurb">
			Capture all six enemy dice. <strong>Strength attack:</strong> use one die equal to or bigger
			than an enemy die. <strong>Mind attack:</strong> combine two or more of your dice with + − × ÷
			to match an enemy die exactly. Attacking dice reroll after each capture. When it's one die
			against one, the player who moved first must win by more — a tie protects the defender!
		</p>
		<div class="options">
			<div class="group">
				<h3>Opponent</h3>
				<label><input type="radio" bind:group={mode} value="ai" /> Computer</label>
				<label><input type="radio" bind:group={mode} value="hotseat" /> 2 players, one screen</label>
			</div>
			{#if mode === 'ai'}
				<div class="group">
					<h3>Difficulty</h3>
					<label><input type="radio" bind:group={difficulty} value="easy" /> Easy</label>
					<label><input type="radio" bind:group={difficulty} value="medium" /> Medium</label>
					<label><input type="radio" bind:group={difficulty} value="hard" /> Hard</label>
				</div>
			{/if}
		</div>
		<button class="btn" onclick={startGame}>⚔️ Battle!</button>
	</section>
{:else}
	<section class="board">
		<div class="side" class:active={!gameOver && game.turn === 1}>
			<h3 class="side-label blue-label">
				{names[1]}
				{#if !gameOver && game.turn === 1}<span class="turn-tag">← turn</span>{/if}
			</h3>
			<div class="dice-row">
				{#each topDice as die (die.id)}
					<div out:scale={{ duration: 350, start: 1.6 }}>
						<Die
							sides={die.sides}
							value={die.value}
							color="blue"
							rollTick={rollTicks[die.id] ?? 0}
							highlight={game.turn === 0 &&
								humanTurn &&
								(strengthTargets.has(die.id) || mindTargets.has(die.id))}
							selected={game.turn === 1 && selectedId === die.id}
							disabled={gameOver || busy}
							onclick={() => (game.turn === 1 ? clickOwnDie(die.id) : clickOpponentDie(die.id))}
						/>
					</div>
				{/each}
			</div>
		</div>

		<div class="mid">
			<p class="message" class:thinking={busy}>
				{#if busy}🤔 {names[1]} is thinking…{:else}{message}{/if}
			</p>
			{#if oneVsOne && !gameOver}
				<p class="endgame-note">
					Endgame: {names[game.firstPlayer]} moved first, so a tie protects the other side.
				</p>
			{/if}
		</div>

		<div class="side" class:active={!gameOver && game.turn === 0}>
			<div class="dice-row">
				{#each bottomDice as die (die.id)}
					<div out:scale={{ duration: 350, start: 1.6 }}>
						<Die
							sides={die.sides}
							value={die.value}
							color="green"
							rollTick={rollTicks[die.id] ?? 0}
							highlight={game.turn === 1 &&
								humanTurn &&
								(strengthTargets.has(die.id) || mindTargets.has(die.id))}
							selected={game.turn === 0 && selectedId === die.id}
							disabled={gameOver || busy}
							onclick={() => (game.turn === 0 ? clickOwnDie(die.id) : clickOpponentDie(die.id))}
						/>
					</div>
				{/each}
			</div>
			<h3 class="side-label green-label">
				{names[0]}
				{#if !gameOver && game.turn === 0}<span class="turn-tag">← turn</span>{/if}
			</h3>
		</div>

		{#if humanTurn && myDice.length >= 2}
			<div class="mind-panel">
				<h3>🧠 Mind attack</h3>
				<ExpressionBuilder
					chips={myDice.map((d) => ({ id: d.id, value: d.value }))}
					bind:tokens={mindTokens}
					result={mindEval?.text ?? ''}
					resultOk={mindEval?.value != null && mindTargets.size > 0}
				/>
				{#if mindEval?.value != null}
					<p class="mind-status">
						{#if mindTargets.size > 0}
							Target locked — tap the glowing enemy die to strike!
						{:else}
							No enemy die shows {mindEval.value}. Adjust your expression.
						{/if}
					</p>
				{/if}
			</div>
		{/if}

		<div class="actions">
			<button class="btn secondary" onclick={hint} disabled={!humanTurn}>💡 Hint</button>
			<button class="btn secondary" onclick={pass} disabled={!humanTurn || !mustPass}>
				Pass {mustPass && humanTurn ? '(no legal moves)' : ''}
			</button>
			<button class="btn secondary" onclick={() => (screen = 'setup')}>New game</button>
		</div>

		{#if gameOver}
			<div class="game-over panel">
				<h2 class="fire-text">{message}</h2>
				<button class="btn" onclick={startGame}>Rematch</button>
				<button class="btn secondary" onclick={() => (screen = 'setup')}>Change setup</button>
			</div>
		{/if}
	</section>
{/if}

<style>
	.setup {
		max-width: 36rem;
		margin: 2rem auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		align-items: center;
		text-align: center;
	}

	.setup h1 {
		margin: 0;
		font-size: 2.2rem;
	}

	.rules-blurb {
		color: var(--text-dim);
		text-align: left;
		margin: 0;
	}

	.options {
		display: flex;
		gap: 3rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		text-align: left;
	}

	.group h3 {
		margin: 0 0 0.3rem;
		font-size: 1rem;
		color: var(--fire-2);
	}

	.group label {
		cursor: pointer;
	}

	.board {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		max-width: 46rem;
		margin: 0 auto;
	}

	.side {
		border-radius: var(--radius);
		padding: 0.5rem 0.8rem;
		transition: background 200ms;
	}

	.side.active {
		background: rgba(255, 196, 0, 0.06);
	}

	.side-label {
		margin: 0.2rem 0;
		font-size: 1rem;
	}

	.blue-label {
		color: var(--blue-1);
	}

	.green-label {
		color: var(--green-1);
	}

	.turn-tag {
		color: var(--fire-2);
		font-size: 0.85rem;
		margin-left: 0.5rem;
	}

	.dice-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 4.5rem;
	}

	.mid {
		text-align: center;
		min-height: 2.5rem;
	}

	.message {
		margin: 0;
		font-weight: 700;
		font-size: 1.05rem;
	}

	.thinking {
		color: var(--text-dim);
	}

	.endgame-note {
		margin: 0.2rem 0 0;
		color: var(--fire-2);
		font-size: 0.85rem;
	}

	.mind-panel h3 {
		margin: 0 0 0.4rem;
		font-size: 1rem;
	}

	.mind-status {
		margin: 0.4rem 0 0;
		font-size: 0.9rem;
		color: var(--text-dim);
	}

	.actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.game-over {
		position: fixed;
		inset: 0;
		margin: auto;
		width: min(26rem, 90vw);
		height: fit-content;
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		background: rgba(23, 8, 5, 0.95);
		box-shadow: 0 0 60px rgba(255, 94, 0, 0.35);
		z-index: 10;
	}

	.game-over h2 {
		margin: 0;
		font-size: 1.6rem;
	}
</style>
