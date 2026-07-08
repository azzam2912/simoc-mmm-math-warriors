<script lang="ts">
	const games = [
		{
			href: '/warriors',
			icon: '⚔️',
			title: 'Maths Warriors',
			blurb:
				'The dice duel. Capture all six enemy dice with strength attacks and mind attacks — combine your dice with + − × ÷ to strike!'
		},
		{
			href: '/mmm',
			icon: '🧠',
			title: 'Math Master Mind',
			blurb:
				'The puzzle trainer. Use the four corner numbers and + − × ÷ to hit the centre target. Beat the clock, chase your best score!'
		}
	];
</script>

<header>
	<h1 class="fire-text">MATHS WARRIORS</h1>
	<p class="tagline display">Battle your way to Maths Supremacy</p>
	<p class="sub">SIMOC practice arena</p>
</header>

<main>
	{#each games as game (game.href)}
		<a class="card panel" href={game.href}>
			<span class="icon">{game.icon}</span>
			<h2>{game.title}</h2>
			<p>{game.blurb}</p>
			<span class="btn">Play</span>
		</a>
	{/each}
</main>

<style>
	header {
		text-align: center;
		margin: 3rem 0 2.5rem;
	}

	h1 {
		font-size: clamp(2.4rem, 8vw, 4.5rem);
		margin: 0;
	}

	.tagline {
		font-size: clamp(1rem, 3vw, 1.4rem);
		color: var(--fire-2);
		margin: 0.4rem 0 0;
	}

	.sub {
		color: var(--text-dim);
		margin: 0.4rem 0 0;
	}

	main {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: 1.5rem;
		max-width: 52rem;
		margin: 0 auto;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.6rem;
		padding: 2rem 1.6rem;
		color: inherit;
		text-decoration: none;
		transition:
			transform 120ms,
			border-color 120ms;
	}

	.card:hover {
		transform: translateY(-4px);
		border-color: var(--fire-1);
	}

	.icon {
		font-size: 3rem;
	}

	.card h2 {
		margin: 0;
		font-size: 1.5rem;
	}

	.card p {
		color: var(--text-dim);
		margin: 0 0 0.8rem;
	}
</style>
