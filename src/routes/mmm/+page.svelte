<script lang="ts">
	import ExpressionBuilder, {
		tokensToString,
		type ExprToken
	} from '$lib/components/ExpressionBuilder.svelte';
	import { DIVISIONS, PRESETS, type Division } from '$lib/engine/mmm/difficulty';
	import { generatePuzzle, type Puzzle } from '$lib/engine/mmm/generator';
	import { validate } from '$lib/engine/mmm/validator';
	import { load, save } from '$lib/state/persist';
	import { onDestroy } from 'svelte';

	const SET_LENGTHS = [5, 10, 20];

	interface QuestionResult {
		target: number;
		corners: number[];
		outcome: 'correct' | 'gave-up' | 'timeout';
		answer?: string;
		seconds: number;
	}

	let screen = $state<'setup' | 'play' | 'results'>('setup');
	let division = $state<Division>(load<Division>('mmm-division', 'upper-primary'));
	let setLength = $state(load<number>('mmm-set-length', 10));
	let requireAllFour = $state(load<boolean>('mmm-all-four', false));

	let puzzle = $state<Puzzle | null>(null);
	let questionIndex = $state(0);
	let tokens = $state<ExprToken[]>([]);
	let feedback = $state('');
	let feedbackKind = $state<'good' | 'bad' | ''>('');
	let revealed = $state(false);
	let secondsLeft = $state(0);
	let secondsSpent = $state(0);
	let results = $state<QuestionResult[]>([]);
	let bestScores = $state(load<Record<string, number>>('mmm-best', {}));
	let timer: ReturnType<typeof setInterval> | undefined;

	const preset = $derived(PRESETS[division]);
	const score = $derived(results.filter((r) => r.outcome === 'correct').length);
	const bestKey = $derived(`${division}:${setLength}${requireAllFour ? ':all4' : ''}`);

	const chips = $derived(
		puzzle ? puzzle.corners.map((value, i) => ({ id: `c${i}`, value })) : []
	);

	function startSet() {
		save('mmm-division', division);
		save('mmm-set-length', setLength);
		save('mmm-all-four', requireAllFour);
		results = [];
		questionIndex = 0;
		screen = 'play';
		nextPuzzle();
	}

	function nextPuzzle() {
		puzzle = generatePuzzle(preset);
		tokens = [];
		feedback = '';
		feedbackKind = '';
		revealed = false;
		secondsSpent = 0;
		secondsLeft = preset.secondsPerQuestion;
		clearInterval(timer);
		timer = setInterval(() => {
			secondsLeft--;
			secondsSpent++;
			if (secondsLeft <= 0) finishQuestion('timeout');
		}, 1000);
	}

	function finishQuestion(outcome: QuestionResult['outcome'], answer?: string) {
		if (!puzzle) return;
		clearInterval(timer);
		results = [
			...results,
			{
				target: puzzle.target,
				corners: puzzle.corners,
				outcome,
				answer,
				seconds: secondsSpent
			}
		];
		if (outcome === 'timeout') {
			feedback = `Time's up! One solution: ${puzzle.solution} = ${puzzle.target}`;
			feedbackKind = 'bad';
			revealed = true;
		}
	}

	const answered = $derived(results.length > questionIndex);

	function submit() {
		if (!puzzle || answered) return;
		const expr = tokensToString(tokens);
		const result = validate(expr, puzzle.corners, puzzle.target, { requireAllFour });
		if (result.ok) {
			feedback = `Correct! ${expr} = ${puzzle.target} 🎉`;
			feedbackKind = 'good';
			finishQuestion('correct', expr);
		} else {
			feedback = `Not quite: ${result.error}`;
			feedbackKind = 'bad';
		}
	}

	function giveUp() {
		if (!puzzle || answered) return;
		feedback = `One solution: ${puzzle.solution} = ${puzzle.target}`;
		feedbackKind = 'bad';
		revealed = true;
		finishQuestion('gave-up');
	}

	function advance() {
		questionIndex++;
		if (questionIndex >= setLength) {
			clearInterval(timer);
			if (score > (bestScores[bestKey] ?? -1)) {
				bestScores = { ...bestScores, [bestKey]: score };
				save('mmm-best', bestScores);
			}
			screen = 'results';
		} else {
			nextPuzzle();
		}
	}

	onDestroy(() => clearInterval(timer));
</script>

<svelte:head>
	<title>Math Master Mind — puzzle trainer</title>
</svelte:head>

{#if screen === 'setup'}
	<section class="setup panel">
		<h1 class="fire-text">Math Master Mind</h1>
		<p class="rules-blurb">
			Use the four corner numbers and + − × ÷ to build an expression equal to the centre target.
			Each corner may be used once. Beat the clock!
		</p>
		<div class="options">
			<div class="group">
				<h3>Division</h3>
				{#each DIVISIONS as d (d)}
					<label>
						<input type="radio" bind:group={division} value={d} />
						{PRESETS[d].label} <span class="dim">({PRESETS[d].grades})</span>
					</label>
				{/each}
			</div>
			<div class="group">
				<h3>Questions</h3>
				{#each SET_LENGTHS as n (n)}
					<label><input type="radio" bind:group={setLength} value={n} /> {n} questions</label>
				{/each}
				<h3 class="mt">Challenge</h3>
				<label>
					<input type="checkbox" bind:checked={requireAllFour} /> Must use all 4 numbers
				</label>
			</div>
		</div>
		{#if bestScores[bestKey] !== undefined}
			<p class="best">Your best: {bestScores[bestKey]}/{setLength}</p>
		{/if}
		<button class="btn" onclick={startSet}>🧠 Start!</button>
	</section>
{:else if screen === 'play' && puzzle}
	<section class="play">
		<div class="status">
			<span>Question {questionIndex + 1}/{setLength}</span>
			<span>Score {score}</span>
			<span class="clock" class:low={secondsLeft <= 10 && !answered}>
				⏱ {answered ? '—' : `${secondsLeft}s`}
			</span>
		</div>

		<div class="card-grid panel">
			{#each puzzle.corners as corner, i (i)}
				<span class="corner corner-{i}">{corner}</span>
			{/each}
			<span class="target display">{puzzle.target}</span>
		</div>

		<ExpressionBuilder {chips} bind:tokens />

		<p class="feedback {feedbackKind}">{feedback}</p>

		<div class="actions">
			{#if answered}
				<button class="btn" onclick={advance}>
					{questionIndex + 1 >= setLength ? 'See results' : 'Next question →'}
				</button>
			{:else}
				<button class="btn" onclick={submit} disabled={tokens.length === 0}>Submit</button>
				<button class="btn secondary" onclick={giveUp}>Give up</button>
			{/if}
			<button class="btn secondary" onclick={() => (screen = 'setup')}>Quit</button>
		</div>
		{#if revealed}
			<p class="dim note">Study the solution, then hit next!</p>
		{/if}
	</section>
{:else if screen === 'results'}
	<section class="setup panel">
		<h1 class="fire-text">Set complete!</h1>
		<p class="final display">
			{score}/{setLength}
			{#if score === (bestScores[bestKey] ?? -1)}🏅 New best!{/if}
		</p>
		<ul class="review">
			{#each results as r, i (i)}
				<li>
					<span class="outcome">
						{r.outcome === 'correct' ? '✅' : r.outcome === 'timeout' ? '⏱' : '🏳️'}
					</span>
					[{r.corners.join(', ')}] → {r.target}
					{#if r.answer}<span class="dim">— {r.answer} ({r.seconds}s)</span>{/if}
				</li>
			{/each}
		</ul>
		<div class="actions">
			<button class="btn" onclick={startSet}>Play again</button>
			<button class="btn secondary" onclick={() => (screen = 'setup')}>Change settings</button>
		</div>
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

	.group h3.mt {
		margin-top: 0.8rem;
	}

	.group label {
		cursor: pointer;
	}

	.dim {
		color: var(--text-dim);
		font-size: 0.85em;
	}

	.best {
		margin: 0;
		color: var(--fire-2);
		font-weight: 700;
	}

	.play {
		max-width: 34rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.status {
		display: flex;
		justify-content: space-between;
		font-weight: 700;
	}

	.clock.low {
		color: #ff5a3c;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}

	.card-grid {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		place-items: start;
		aspect-ratio: 2 / 1;
		padding: 1rem;
	}

	.corner {
		font-size: clamp(1.4rem, 5vw, 2rem);
		font-weight: 900;
		color: var(--text);
	}

	.corner-1,
	.corner-3 {
		justify-self: end;
	}

	.corner-2,
	.corner-3 {
		align-self: end;
	}

	.target {
		position: absolute;
		inset: 0;
		margin: auto;
		width: fit-content;
		height: fit-content;
		padding: 0.5rem 1.4rem;
		font-size: clamp(1.8rem, 6vw, 2.6rem);
		background: linear-gradient(180deg, var(--fire-2), var(--fire-3));
		color: #2b0d00;
		border-radius: 12px;
		box-shadow: 0 0 24px rgba(255, 94, 0, 0.5);
	}

	.feedback {
		min-height: 1.4rem;
		margin: 0;
		font-weight: 700;
	}

	.feedback.good {
		color: #58e07c;
	}

	.feedback.bad {
		color: #ff8a70;
	}

	.actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.note {
		text-align: center;
		margin: 0;
	}

	.final {
		font-size: 2.4rem;
		margin: 0;
		color: var(--fire-2);
	}

	.review {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		text-align: left;
		max-height: 40vh;
		overflow-y: auto;
	}

	.outcome {
		margin-right: 0.4rem;
	}
</style>
