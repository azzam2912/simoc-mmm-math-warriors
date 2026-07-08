# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A fully client-side SvelteKit (Svelte 5, TypeScript) practice app for the SIMOC math competition, with two games:

- **Maths Warriors** (`/warriors`) — turn-based dice duel: each side has d4–d20 dice; capture enemy dice via *strength attacks* (your die value ≥ target) or *mind attacks* (an expression over 2+ of your dice with + − × ÷ equal to the target die). Vs-AI (easy/medium/hard) and local 2-player hot-seat.
- **Math Master Mind** (`/mmm`) — puzzle trainer: build an expression from 4 corner numbers to hit a center target, timed, with per-division difficulty presets.

No backend. Static output via `adapter-static` (configured in `vite.config.ts`, not `svelte.config.js`); every route prerenders with `trailingSlash: 'always'` (see `src/routes/+layout.ts`) so deep links work on any static host.

## Commands

- `npm run dev` — dev server
- `npm test` — vitest suite (all engine logic; ~2s)
- `npx vitest run src/lib/engine/mmm` — run one suite by path
- `npm run check` — svelte-check / TS
- `npm run build && npm run preview` — static build + serve

## Architecture

Strict engine/UI split:

- `src/lib/engine/` — pure, framework-free TS; fully unit-tested; all randomness goes through an injectable `Rng` (`() => number`) so tests can seed it.
- `src/routes/*/+page.svelte` — each game page owns its UI state with Svelte 5 runes and calls engine functions. There is no store layer; `src/lib/state/persist.ts` is just localStorage load/save.

### Engine core: `expressions.ts` (shared by both games)

Countdown-style bitmask solver: for each subset (bitmask) of input values, the map of reachable **integers** → one representative expression string. Deliberate restrictions keep it milliseconds-fast (the naive rational version took minutes — do not regress this):

- integer-only intermediates: subtraction kept only when ≥ 0, division only when exact, magnitude capped (`MAGNITUDE_CAP`)
- consequences: exotic fraction-intermediate expressions (e.g. `8÷(2÷3)`) aren't auto-found, and that's accepted
- `reachableTargets(values, minUsed, maxUsed)` feeds Warriors mind attacks/hints; `targetsUsingAll` feeds the MMM generator

The **player-facing** validator (`engine/mmm/validator.ts`) is independent of the solver: a recursive-descent parser evaluating in exact rationals (`engine/rational.ts`), so any correct human expression is accepted even if the solver wouldn't have generated it. It consumes corner numbers as a multiset (handles duplicates). Its `evaluateExpression` also live-evaluates the Warriors mind-attack builder.

### Warriors specifics (`engine/warriors/`)

- `rules.ts`: `legalMoves(state, maxMindDice)` — the `maxMindDice` cap exists purely for AI speed; the UI calls it uncapped. Rule subtleties encoded here: initiative by lexicographic compare of sorted values; the 1v1 endgame tie rule (the game's *first* player needs strictly `>`); two consecutive passes force a winner (defensive, deadlock should be impossible).
- `ai.ts`: easy = random, medium = greedy, hard = depth-2 expectimax over sampled rerolls with greedy opponent model. AI caps mind attacks at 3 dice but re-checks the uncapped move list before passing (passing is only legal with zero moves).
- Moves reference dice by `id`; `applyMove` rerolls exactly the attacking dice.

### MMM generation (`engine/mmm/generator.ts`)

Draw 4 corners → collect all targets reachable *using all four* → filter by division preset (`difficulty.ts`: ranges, triviality rejection, ×/÷ requirement) → pick mid-range-weighted. The stored `solution` string is shown on give-up; a test asserts every generated solution passes the validator (solver ↔ parser cross-check).

### UI notes

- `ExpressionBuilder.svelte` is shared between MMM answers and Warriors mind attacks; chips are consumed **by id** (module exports `ExprToken`, `tokensToString`).
- `Die.svelte` triggers its roll animation via an incrementing `rollTick` prop, not by watching `value`.
- Warriors interaction: tap own die → legal strength targets glow; build an expression → enemy dice matching its value glow; tap a glowing die to strike. Legality for strength comes from `legalMoves` membership; mind attacks trust the live evaluation (≥2 dice, integer match).
