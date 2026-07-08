<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Maths Warriors — SIMOC Practice</title>
</svelte:head>

<div class="shell">
	{#if page.url.pathname !== '/'}
		<nav>
			<a href="/" class="home-link display">⌂ Home</a>
		</nav>
	{/if}
	{@render children()}
</div>

<style>
	.shell {
		max-width: 68rem;
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
	}

	nav {
		margin-bottom: 0.5rem;
	}

	.home-link {
		color: var(--text-dim);
		text-decoration: none;
		font-size: 0.95rem;
	}

	.home-link:hover {
		color: var(--text);
	}
</style>
