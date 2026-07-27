# CLAUDE.md

Guidance for working in this repository.

## What this is

**SumHero** is a static, client-side educational mini-game PWA for kids,
deployed via GitHub Pages at `sumhero.github.io`. There is no backend and no
bundler — plain ES modules loaded directly by the browser via
`<script type="module">`. It was migrated from a backend-connected math game;
all auth, API, and result-storage code was intentionally removed (see
`.claude/plans/structured-snacking-nygaard.md`), and later from ten
copy-pasted games onto a shared `GameEngine` (see
`.claude/superpowers/specs/2026-07-26-gameengine-and-cp-math-games-design.md`).

## Running locally

Open `index.html` directly, or serve the root over a static server (needed for
the service worker / PWA features), e.g. `python3 -m http.server`. Install dev
dependencies once with `npm install` (Vitest + jsdom; the runtime itself has no
dependencies). Run `npm test` before committing — it must stay green.
Verification is tests plus playing the changed game in the browser and
checking the console for errors.

## Layout

```
index.html            App shell: all screens, loads js/app.js as a module
manifest.json         PWA manifest
sw.js                 GENERATED — do not hand-edit, see "Offline / PWA" below
sw-template.js        Service-worker source template, edited by hand instead
css/game.css          All styles, including per-game layout classes
flags/                ~195 country flag SVGs (used by countries/capitals)
images/               PWA icons
tools/build-sw.js     Regenerates sw.js from sw-template.js + a directory scan
test/                 Vitest suite, mirrors the js/ tree (engine/, games/,
                       i18n/, tools/) plus test/docs/claude-md.test.js
js/
  app.js               App controller: screen switching, init, translations
  sound.js             Sound.play('correct'|'wrong'|'victory')
  animation.js         Celebration / confetti / Lottie
  engine/
    game-engine.js       GameEngine: the shared session loop (see Architecture)
    registry.js          GAMES list + DOMAINS, gamesByDomain()
    game-list.js         GameList controller: renders cards, routes clicks,
                          difficulty/category/count pickers, settings screen
    screens.js           showScreen(), setLayoutClass(), onScreenChange()
    results.js           loadResults()/saveResult() — localStorage history
    speech.js            Speech.speak()/cancel() — spoken prompts (TTS)
  games/
    <id>.js              One file per game (see "Adding a new game" below)
  render/
    dice.js              DiceRenderer.render() — SVG dice
    clock.js             ClockRenderer.render() — SVG clock face
  data/
    countries.js         Country/capital data for the geography games
  i18n/
    i18n.js              I18n.t(key, params) + language get/set
    translations.js      TRANSLATIONS for en/fr/de/uk/ru + LANGUAGES (en is
                          the fallback)
```

## Architecture

- **Screens**: `index.html` defines `.screen` divs (`screen-games`,
  `screen-game`, `screen-celebration`, etc.). `showScreen(name)`
  (`js/engine/screens.js`) toggles the `.active` class. Leaving the game
  screen clears any layout class via `setLayoutClass(null)` and, for the two
  legacy games, by removing their classes explicitly (see below).
- **Game registry**: `GAMES` in `js/engine/registry.js` lists every game
  object. `GameList.load()` (`js/engine/game-list.js`) renders one card per
  game, grouped by `domain` (`js/engine/registry.js`'s `DOMAINS`), and its
  click handler routes each card to either `game.start(difficulty)` (legacy
  games), a category/count picker, or `GameEngine.start(game, options)`.
- **Difficulty**: stored in `localStorage` (`game_difficulty`), one of
  `easy` / `normal` / `hard`. Convention: `easy` 5 rounds, `normal` 10,
  `hard` 20 (a game can opt out with `rounds: 'ask'`, which shows a count
  picker instead — see `dice_addition`).
- **The GameEngine contract**: a game (`js/games/<id>.js`) is a plain object,
  not a class, with an `id`, `nameKey`, `emoji`, `domain`, `rounds`
  (`{ easy, normal, hard }` or `'ask'`), and a pure `generate(difficulty, ctx)`
  that returns an array of exercise objects (each exercise carries at least
  `correctAnswer` and either `promptHtml`/`choices`, or whatever a custom
  `renderPrompt`/`renderChoices` expects). `GameEngine`
  (`js/engine/game-engine.js`) owns everything else: building `ctx`, the
  session loop (`showExercise` → `answer` → advance/`completeGame`), the
  default choice rendering, scoring (`wrongAttempts`), the celebration
  screen, spoken prompts (`Speech`), and saving the result
  (`js/engine/results.js`). This is what let eight of the ten original games
  drop their duplicated `answer()`/`updateProgress()`/`completeGame()`.
- **Optional seams on a game object** (all checked in `game-engine.js`; only
  define one if the default doesn't fit):
  - `renderPrompt(el, exercise, submit)` — custom prompt rendering instead of
    `exercise.promptHtml` (used by `chess`).
  - `renderChoices(el, exercise, submit)` — custom choice rendering instead
    of the default button grid (used by `chess`, `uno`).
  - `isCorrect(value, exercise)` — custom correctness check instead of
    `value === exercise.correctAnswer` (used by `chess`).
  - `layoutClass` — a class `GameEngine.start` applies to `.game-body` for
    the whole game (e.g. `geo-game-layout`, `time-game-layout`).
  - `choiceClass` — extra class added to every default choice button (e.g.
    `geo-choice-btn`, `time-choice-btn`).
  - `correctClass` — class applied to the tapped correct-answer button
    instead of the default `correct` (used by `chess`).
  - `bodyClass` on an individual *exercise* — a class applied only while that
    exercise is showing, e.g. `guess_time`'s day/night theming.
  - `setup: 'category'` — routes through the category picker
    (`GameList.showCategoryPicker`) before `GameEngine.start`, passing
    `ctx.category` (used by `count_objects`).
  - `legacy: true` — opts the game out of `GameEngine` entirely; see below.
- **The `ctx` contract and the purity rule**: `GameEngine.buildContext`
  builds `ctx = { rng, t, lang, count, category }` and passes it as the
  second argument to `generate(difficulty, ctx)`. A game's `generate` must be
  **pure**: no `Math.random`, no `I18n`, no DOM access, no `Date`.
  - `ctx.rng` is the only source of randomness — normally `Math.random`, but
    tests inject a seeded rng, so `generate` must call `ctx.rng()` and never
    `Math.random()` directly.
  - `ctx.t` is the only source of translated strings — `(key, params) =>
    I18n.t(key, params)` — so `generate` must call `ctx.t(...)` and never
    `I18n` directly.
  - `ctx.lang` is the active language code, for anything language-dependent
    that isn't a plain translation lookup.
  - `ctx.count` is the already-resolved round count for the chosen
    difficulty (`GameEngine.resolveCount` reads `game.rounds[difficulty]`, or
    passes through the picker's choice when `rounds === 'ask'`) — `generate`
    must use `ctx.count` and never read `game.rounds` itself, or a picker
    game and a fixed-rounds game would silently diverge.
  - `ctx.category` is set only for `setup: 'category'` games.
  This one convention — no hidden inputs besides `ctx` — is what makes every
  migrated game's `generate()` unit-testable with a plain seeded call, no DOM
  and no mocking.
- **The legacy escape hatch**: two games are `legacy: true` and keep their own
  session loop instead of going through `GameEngine` — `memory`
  (`js/games/memory.js`) and `double_crash` (`js/games/double-crash.js`).
  `GameList.load()`'s click handler special-cases `game.legacy` and calls
  `game.start(difficulty)` directly instead of `GameEngine.start(game, ...)`.
  - `double_crash` (Crash Roulette) has no exercises, no difficulty, and no
    win/lose completion at all — it's a continuous betting session, so the
    engine's generate/answer/celebrate contract simply doesn't apply to it.
  - `memory` *does* fit the exercise-and-scoring shape, but
    `GameEngine.completeGame()` hardcodes a three-line stats block
    (exercises/wrongAttempts/time) and the rule
    `wrongAttempts === 0 → perfectScore`. `memory` needs a fourth "peeks
    used" stats line and a stricter perfect-score rule,
    `wrongAttempts === 0 && peeksUsed === 0` (peeking at the hidden tiles
    means the round wasn't solved from memory, so it shouldn't count as
    perfect). Neither is expressible on today's engine. The unblocking route
    — not yet built — is an optional `extraStats`/`titleKey` seam on
    `completeGame()` plus a per-game `advanceDelayMs` (memory's tile-match
    delays differ from the default 600ms), **not** a change to `answer()`,
    which memory's tile-matching interaction (two-tile matching, not
    single-choice) doesn't fit anyway.
  - If a future game doesn't fit the engine either, the documented fallback
    is the same: mark it `legacy: true` rather than distorting the shared
    loop for one game.
- **i18n**: every user-facing string goes through `I18n.t('key')`
  (`js/i18n/i18n.js`); add the key to all five language blocks in
  `js/i18n/translations.js` (en is the fallback).
- **Offline / PWA**: `sw.js` is **generated** — never hand-edit it, and never
  hand-bump `CACHE_VERSION`. Run `npm run build:sw` (`tools/build-sw.js`),
  which scans `js/`, `css/`, `images/`, and `flags/`
  for the asset list and computes the next `CACHE_VERSION` itself (same day →
  bump the counter, new day → reset to `01`). A hand-edit to `sw.js` will be
  silently overwritten the next time the build runs.

## Adding a new game

Adding a game touches more than one file — do all of these, then verify:

1. Create `js/games/<id>.js` exporting a game object with a pure
   `generate(difficulty, ctx)`. Mirror `js/games/dice-addition.js`.
2. Add it to `GAMES` in `js/engine/registry.js` (import + one line in the
   array) with a `domain` matching one of `DOMAINS`.
3. Add the game-name (`nameKey`) translation key — and any new exercise
   strings — to **all five** language blocks in `js/i18n/translations.js`.
4. Write `test/games/<id>.test.js` asserting the answer range per
   difficulty, that `choices` contains `correctAnswer`, and that a seeded rng
   is stable. See "Testing discipline" below before trusting a new test.
5. Add any game-specific styles to `css/game.css`, including a `.game-body`
   layout class if the default layout doesn't fit.
6. Run `npm test`, then `npm run build:sw` to regenerate `sw.js` with the new
   file and a fresh `CACHE_VERSION`.

Verify by playing it in the browser at each difficulty, in both portrait and
landscape.

## Conventions

- No frameworks, no bundler, no transpilation — keep it plain ES that runs
  directly in the browser. Match the existing style (2-space indent, single
  quotes, string-concatenated HTML).
- Modules are explicit: every file that needs something else `import`s it;
  there are no implicit globals. `index.html` loads only `js/app.js` as a
  `type="module"` script — everything else is pulled in by the `import`
  graph, so there is no manual load-order to maintain.
- Wrong-answer pattern: mark the button `.wrong`, set `dataset.wrongChoice`,
  play `Sound.play('wrong')`, and let the player retry; advance on the correct
  choice.
- **Testing discipline** (learned the hard way during the GameEngine
  migration — this cost two fix rounds and shipped three games with an
  unshuffled-answer hole that let a child win by always tapping the leftmost
  button):
  - Prove a new test can fail before trusting it: break the code it names,
    confirm the test goes red, then restore the code and confirm `git diff`
    is empty.
  - If a test depends on randomness, either seed the rng and assert an exact
    result, or run the mutation **10 times** and require red on all ten — a
    guard that only sometimes catches its mutation is worse than no guard.
  - Prefer asserting the property over the implementation: assert that a
    shuffled correct answer *moves position* across repeated calls, not that
    it lands at one specific index — otherwise any future refactor of draw
    order will false-fail a test that was never actually checking for
    shuffling.

## Workflow

- This repo is **not production**. After making edits, **automatically commit
  and push to `main`** (no PR, no branch, no asking) — the owner wants every
  change landed on `main` right away. Run `npm test` first; do not push a red
  suite.
- Multi-task work (anything following a plan in `.claude/superpowers/plans/`
  or `.claude/superpowers/specs/`) runs on a branch in a worktree and merges
  to `main` once green, so `main` never holds a half-migrated app. Single
  small edits still go straight to `main`.
