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
That programme is now complete: all twelve new CP games shipped across four
checkpoints, and `GameEngine` was never modified after checkpoint 1 — every
game from checkpoint 2 onward fitted the seams it already had.

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
                       render/, data/, i18n/, tools/) plus
                       test/docs/claude-md.test.js
js/
  app.js               App controller: screen switching, init, translations
  sound.js             Sound.play('correct'|'wrong'|'victory')
  animation.js         Celebration / confetti / Lottie
  engine/
    game-engine.js       GameEngine: the shared session loop (see Architecture)
    unique.js            drawDistinct(count, draw, keyOf) — the shared
                          no-repeat exercise sampler (see Architecture)
    registry.js          GAMES list + DOMAINS, gamesByDomain() (filters out
                          empty domains; optional `(domains, games)` params
                          let a test inject a synthetic empty domain)
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
    ten-frame.js         TenFrameRenderer.render(filled, capacity) — SVG
                          ten-frames (capacity 5, 10, or 20 as two frames)
    base-ten.js          BaseTenRenderer.render(tens, units) — SVG ten-rods
                          and unit-cubes
    coins.js             CoinRenderer.render(denominations) — SVG euro coins
                          and notes (whole euros only: 1, 2, 5, 10, 20)
    shapes.js            ShapeRenderer.render(shape, options) — SVG square,
                          rectangle, triangle, circle and losange, with
                          rotation and scale baked into the coordinates
  data/
    countries.js         Country/capital data for the geography games
    number-words.js      numberToWords(n, lang) — 1–100 spelled out in all
                          five languages, French irregulars included
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
  game, grouped by `domain` via `gamesByDomain()`, which pairs each entry in
  `DOMAINS` with its games and **filters out any domain with no games**.
  That guard's test used to rely on `geometrie` being the one empty domain —
  until this checkpoint's `shapes` game filled it, making the assertion
  false. Its first replacement, "every returned group is non-empty" over the
  live registry, went vacuous instead: once all five real domains are
  populated, that's trivially true and no longer proves the filter does
  anything. `gamesByDomain()` therefore takes optional
  `(domains = DOMAINS, games = GAMES)` parameters purely so a test can
  construct its own synthetic empty domain and prove the filter still drops
  it, independent of whether the live registry happens to have one — those
  parameters are a load-bearing test seam, not dead code; do not remove them
  as unused. `GameList`'s click handler routes each card to either
  `game.start(difficulty)` (legacy games), a category/count picker, or
  `GameEngine.start(game, options)`.
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
    of the default button grid (used by `chess`, `uno`, `ordering`).
    - **`submit(value, btn)`'s second argument is optional, and that is what
      makes multi-tap interactions possible.** `ordering` (tap 3–5 numbers in
      sequence) accumulates taps in a closure and calls `submit(...)` exactly
      once per attempt with the whole ordering and **no `btn`**. With no
      button, `answer()` never enters `if (btn && btn.dataset.wrongChoice)`
      and never executes `btn.dataset.wrongChoice = '1'`, so the per-button
      wrong-answer latch — the thing that forced `memory` to go `legacy: true`,
      because a latched tile could never be tapped correctly afterwards — is
      never reached. Passing a button here would not hang `ordering` the way it
      hung `memory` (a sequencing game decides for itself which taps it
      accepts), but it would silently under-count: the game's own reset cannot
      clear the engine's private `dataset.wrongChoice`, so every repeat wrong
      tap of that tile after the first returns before `wrongAttempts++`. In exchange the
      game owns what the engine skips when there is no button: the `.wrong`
      and `.correct` classes, and clearing its own tap state so the child can
      retry. The engine still counts the attempt and plays the sound.
    - A game taking this route needs no `isCorrect` if it makes
      `correctAnswer` a single comparable value — `ordering` joins the required
      sequence with commas (`'2,5,9'`) and submits the tapped sequence the same
      way, so the engine's default `value === exercise.correctAnswer` is
      already an exact ordering comparison.
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
  - `speak` on an individual *exercise* — plain text the engine reads aloud
    through `Speech` on show, plus a 🔊 replay button appended to the prompt.
    A game opts in purely by setting this string; there is no game-level flag.
    Used by `word_problems`, and deliberately **not** by `number_words`, where
    speaking the word would read out the answer.
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
- **Session distinctness — `drawDistinct`**: a `generate()` must not hand the
  child the same exercise twice in one session. Fifteen of the twenty
  engine-driven games used to; `dice_recognition` normal repeated one three or
  more times in 97% of sessions and `money` hard in 92.5%. Every game that
  draws its rounds independently now wraps the round body in
  `drawDistinct(count, draw, keyOf)` (`js/engine/unique.js`) — a **bounded
  rejection sampler**. `draw(i)` builds a whole candidate exercise and closes
  over `ctx.rng`; `keyOf(exercise)` returns a **string** naming that
  exercise's identity.
  - **The key is usually not `correctAnswer`.** It is wrong for most games and
    harmful in several: `parity` has two possible answers, `compare` three,
    and `chess`'s answer is a *set* of squares. Each game names its own key —
    `subtraction` uses `minuend-subtrahend`, `money` uses the purse
    composition in count mode and the price in pay mode, `shapes` includes the
    mode *and* the rotation. `dice_recognition` and `guess_time` are the two
    reviewed exceptions where the answer genuinely *is* the identity — a die
    face and a formatted `HH:MM` time each have exactly one exercise per
    value — so keying on `correctAnswer` there is correct, not an oversight.
    There is no useful engine-level default, which is why this is not a
    purely central fix.
  - **Exhaustion is normal, not exceptional.** `dice_recognition` hard has five
    faces over twenty rounds. When a round burns its 40-try budget the used-set
    is cleared and **re-seeded with the exercise just emitted**, so a refill can
    never place a repeat next to its previous occurrence. Behaviour degrades to
    "cycle the space evenly, never twice in a row", and the loop is bounded so
    it cannot hang.
  - **`DRAW_TRIES` is 40 and is load-bearing.** Big enough to complete a
    permutation of 20; small enough that the constant-rng determinism tests do
    not burn a 500-try budget every round; and `40 × 3` is a multiple of the
    12-value cycling rng in `test/games/chess.test.js`, which is what keeps
    that test's mutation argument valid — **this was measured, not assumed**:
    the underlying property is parity (any *even* budget of 20/30/40/50 catches
    the mutant; odd budgets of 39/41/45 let it escape), not the "multiple of
    12" arithmetic the plan first proposed, which was independently wrong
    twice before landing on the parity explanation. 30 or 50 leave it green on
    broken code.
  - **The sampler is never given the engine's job.** `js/engine/game-engine.js`
    is untouched. The tempting "over-generate `count * 3` and filter" design
    breaks index-dependent generators (`number_words` alternates its irregular
    French band on even `i`, `count_objects` cycles emoji on `i`), still cannot
    guarantee the count when the space is too small, and triples render cost.
  - **Seven games are deliberately exempt** and are not a mistake: `memory`
    and `double_crash` are `legacy: true` (own loop / no exercise concept);
    `dice_addition`, `countries` and `capitals` already deduplicate for the
    whole session; `count_objects` already scores 0% because its emoji cycle
    makes every field distinct; `ordering`'s `pickDistinct` has a deterministic
    top-up that must not be disturbed.
    `test/engine/unique-coverage.test.js` holds that list as an independent,
    duplicated literal (not derived from the games) and fails if a new
    engine-driven game appears in `js/engine/registry.js` without either
    calling `drawDistinct` or being added to the exempt list with a reason —
    that guard, not this paragraph, is what stops a future game 23 from
    silently reintroducing the bug.
  - **`shapes` hard is a deliberate, documented exception to "no repeated
    answer."** Its key includes the rotation and scale, so the same shape
    *name* can still be the correct answer four or five times across twenty
    rounds, adjacently — measured at ~99.5% of hard sessions showing at least
    one adjacent same-name pair. This was judged **not a bug**: recognising a
    shape through rotation is the band's taught content, each occurrence is a
    genuinely different image (never the same exercise twice, key-wise), and
    with only four hard-band names, forcing "never the same name twice in a
    row" would behave like the rejected `parity`/`compare` case — the last
    three rounds would start narrowing which name comes next, which is worse
    pedagogy than an occasional repeated word. No secondary guard was added.
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
    loop for one game. Try the `renderChoices` route first, though:
    `ordering` looked like the next `legacy` candidate — a sequencing
    interaction where `memory`'s wrong-tap latch should have applied — and
    turned out to fit unchanged, because a custom renderer that submits once
    per attempt without a `btn` never reaches the latch at all. Only two
    games remain legacy.
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
   `generate(difficulty, ctx)` that draws its rounds through
   `drawDistinct(count, draw, keyOf)` (see "Session distinctness" above) — or
   add the game to the exempt list in `test/engine/unique-coverage.test.js`
   with a reason. Mirror `js/games/tens-units.js`.
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
