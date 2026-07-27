# GameEngine extraction + 12 CP math games

**Date:** 2026-07-26
**Status:** Approved design, ready for planning

## Problem

SumHero has ten games: `dice_addition`, `count_objects`, `dice_recognition`,
`uno`, `countries`, `capitals`, `guess_time`, `memory`, `chess`, and
`double_crash`. Nine of them re-implement the same session loop — `answer()`,
`updateProgress()`, `completeGame()` — costing roughly 90 duplicated lines per
game. Adding games multiplies that duplication, and any scoring bug must be
fixed once per game.

Separately, the app's math coverage stops well short of the French CP
programme. Missing: subtraction, compléments à 10, doubles et moitiés,
comparison, number sequences, dizaines/unités beyond 12, monnaie, l'heure,
formes géométriques, and word problems.

## Goal

Extract a shared `GameEngine`, migrate nine of the ten existing games onto it,
then add 12 new games covering the CP programme. Target user: one six-year-old
in CP, playing on a phone or tablet, offline-capable.

### `double_crash` is exempt

`double_crash` (Crash Roulette, 1046 lines) has no exercises, no difficulty, no
wrong-attempt count, and no completion or celebration. It is a continuous
betting session that borrows `screen-game` and renders into `#dice-container`.
The engine's contract — generate exercises, answer, advance, celebrate — does
not apply to it.

It stays on its own loop, registered as `{ id: 'double_crash', legacy: true }`.
The game list renders its card like any other; the click handler calls
`DoubleCrashGame.start()` instead of `GameEngine.start()`. This is the single
permitted exception, and `registry.js` documents it as such.

## Decisions

These were settled during brainstorming and are not open questions:

| Decision | Choice |
|---|---|
| Testing | Vitest + jsdom |
| Read-aloud | Engine-level `speak`, opt-in per game |
| French accents | Fix all existing strings, write new ones accented |
| Game list | Grouped by CP domain |
| Engine shape | Declarative generator with optional render hooks |
| Module system | Convert to ES modules |
| Results | Persisted to `localStorage` |

## Architecture

### Module system

Convert from globals-plus-ordered-`<script>`-tags to ES modules. `index.html`
drops to a single `<script type="module" src="/js/app.js">`. This is what makes
Vitest practical — without it, every test would have to `readFileSync` and
`eval` source files to reach their globals. GitHub Pages serves over HTTPS, so
native modules work with no bundler.

### File layout

```
js/
  app.js                    entry point
  engine/game-engine.js     session loop, scoring, celebration, speech, persistence
  engine/registry.js        GAMES array
  engine/game-list.js       chooser UI, grouped by domain
  render/dice.js            existing DiceRenderer, moved
  render/clock.js           existing ClockRenderer, extracted from guess_time
  render/ten-frame.js       new
  render/base-ten.js        new
  render/coins.js           new
  render/shapes.js          new
  games/<id>.js             one per game, 22 total (21 on the engine + double_crash)
  i18n/translations.js      existing, accents fixed
test/
  engine/game-engine.test.js
  games/<id>.test.js
tools/build-sw.js           regenerates sw.js asset list
```

### Game contract

A game is a plain object. No class, no inheritance.

```js
export const ComplementsGame = {
  id: 'complements',
  nameKey: 'complements',
  emoji: '🤝',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },   // or 'ask' → 1–10 picker screen
  layoutClass: 'ten-frame-layout',             // optional, applied to .game-body
  setup: 'category',                           // optional pre-screen

  generate(difficulty, ctx) {                  // PURE: no DOM, no Date, no globals
    const { rng, t, lang } = ctx;
    return [{
      promptHtml: TenFrame.render(7),
      speak: t('speakComplement', { n: 7 }),   // optional
      choices: [1, 2, 3, 4, 5],
      correctAnswer: 3,
    }];
  },

  renderPrompt(el, exercise) {},               // optional override
  renderChoices(el, exercise, submit) {},      // optional override
};
```

`generate` is pure in the sense that it reads nothing from module scope: the
RNG, the translation function, and the current language all arrive through
`ctx`. Tests construct `ctx` themselves — a seeded RNG for stable output, and a
stub `t` so generator assertions never depend on translation content.

`ctx` is `{ rng, t, lang }`:

- `rng` — `() => number` in `[0, 1)`, defaults to `Math.random` in production
- `t` — `(key, params?) => string`, the same translation lookup the UI uses
- `lang` — the active language code, for games whose *content* is
  language-specific (`number_words` needs per-language number words;
  `word_problems` needs per-language sentence templates)

### Engine responsibilities

Everything currently copy-pasted across the nine engine-driven game files:

- Session state and exercise advancement
- Progress bar and score display
- Wrong-answer handling: mark the button, re-shake on repeat tap, count the attempt
- Correct/wrong sounds, 600 ms advance delay
- Celebration screen, title thresholds, confetti, Lottie
- `speak` playback on show plus a 🔊 replay button, language following `I18n`
- Writing the result to `localStorage`
- Adding and removing `layoutClass` on `.game-body`

### Escape hatches

These games need custom interaction and will override `renderChoices`:

- **Plus grand, plus petit** — three buttons (`<`, `=`, `>`) instead of five
- **Ranger dans l'ordre** — tap numbers in sequence, submit on completion
- **Uno** — renders cards, not numerals
- **Chess** — renders a 3×3 board; a cell tap is the answer
- **Memory** — owns a tile board plus a timed memorise phase; a wrong tile tap
  calls `submit(wrongValue, btn)` so the engine still counts it

Countries and Capitals need only the lighter `choiceClass` field to keep their
`geo-choice-btn` styling — plain string choices work with the engine default.
All remaining games use the default multiple-choice rendering.

**Memory is the one stateful case.** Its memorise timers and `peek` feature live
entirely inside its `renderChoices`; the engine sees one exercise per board and
advances when the board is solved. If this proves awkward in practice, the
fallback is to give it `legacy: true` like `double_crash` rather than to
contort the engine.

### Dead code removed

- The `result` object built and discarded in every `completeGame()` — now persisted
- `auth-container` markup in `index.html`
- Orphaned translation keys in all five languages: `username`, `password`,
  `login`, `register`, `logout`, `offlineLogin`, `offlineRegister`,
  `pendingResults`, `resultsSynced`
- The hardcoded if/else dispatch in `game-list.js:77-89` → registry lookup
- The hardcoded layout-class cleanup in `app.js:66-75` → engine-managed

## Game catalogue

### 🔢 Nombres et calculs

| Game | id | Easy | Normal | Hard |
|---|---|---|---|---|
| Dice Addition *(existing)* | `dice_addition` | sums ≤ 8 | ≤ 10 | ≤ 12 |
| Count Objects *(existing)* | `count_objects` | 1–5 | 2–7 | 5–10 |
| Dice Recognition *(existing)* | `dice_recognition` | 1–4 | 1–5 | 2–6 |
| Compléments à 10 | `complements` | to 5 | to 10 | to 20, two ten-frames |
| Soustraction | `subtraction` | within 5 | within 10 | within 20 |
| Doubles et moitiés | `doubles` | doubles ≤ 5 | doubles ≤ 10 | doubles + moitiés ≤ 20 |
| Plus grand, plus petit | `compare` | collections ≤ 10 | numerals ≤ 20 | numerals ≤ 100 |
| Le nombre qui manque | `missing_number` | 1–20 | 1–100 | count by 2, 5, 10 |
| Dizaines et unités | `tens_units` | 10–39 | 10–99 | reverse: number → blocks |
| Les nombres en lettres | `number_words` | 1–10 | 1–20 | 1–100 |
| Petits problèmes | `word_problems` | add ≤ 10 | add/sub ≤ 20 | two-step |
| Pair ou impair | `parity` | ≤ 10, objects shown | ≤ 20 | ≤ 100 |
| Ranger dans l'ordre | `ordering` | 3 numbers ≤ 20 | 5 numbers ≤ 100 | 5, descending |

### 📏 Grandeurs et mesures

| Game | id | Easy | Normal | Hard |
|---|---|---|---|---|
| Guess Time *(existing)* | `guess_time` | whole hours | half hours | quarter hours |
| La monnaie | `money` | count ≤ 10 € | mixed coins and notes ≤ 20 € | pay an exact amount |

**No new clock game.** `guess_time` already ships a complete `ClockRenderer`
(SVG face, ticks, numerals, correctly-angled hands) and a full session loop.
Building a second "La pendule" would duplicate it and put two clock cards in
front of a six-year-old. Instead, `guess_time` is migrated onto the engine and
its difficulty ladder checked against the CP progression above — whole hours,
then half hours, then quarter hours. If it already scales that way, migration is
the only change.

The extracted `ClockRenderer` moves to `js/render/clock.js` so later games can
reuse it.

### 🔷 Espace et géométrie

| Game | id | Easy | Normal | Hard |
|---|---|---|---|---|
| Formes géométriques | `shapes` | name the shape | count sides and corners | spot it rotated and rescaled |

### 🃏 Logique

Uno, Memory, Chess, Crash Roulette *(all existing)*. Crash Roulette is the
`legacy: true` entry described above.

### 🌍 Découverte du monde

Countries, Capitals *(existing)*.

### Round counts and pre-screens

Every game uses `rounds: { easy: 5, normal: 10, hard: 20 }` except:

- `dice_addition` — `rounds: 'ask'`, preserving today's 1–10 exercise picker
- `count_objects` — `setup: 'category'`, preserving today's object-category screen

No other game gets a pre-screen. A six-year-old should reach the first question
in one tap.

### Notes on specific games

**Soustraction** renders the subtrahend as greyed, crossed-out emoji from the
existing `OBJECT_CATEGORIES` sets, so the operation is visible rather than
abstract.

**Les nombres en lettres** at hard difficulty covers `soixante-dix` through
`quatre-vingt-dix-neuf` — the irregular French pattern that CP pupils actually
stumble on. Word lists are per-language data, so the same game teaches German,
Ukrainian, or Russian number words when the language setting changes.

**Petits problèmes** uses the engine's `speak` support, since a CP pupil in
the first term cannot reliably decode a written sentence.

## Testing

**Per-game generator tests** assert:

- the correct number of exercises for the difficulty
- `correctAnswer` always within the documented range
- `choices` always contains `correctAnswer`
- no duplicate choices
- distractors plausible and in range
- seeded RNG produces stable output

**Engine tests** (jsdom) cover:

- a full playthrough to the celebration screen
- wrong-attempt counting, including the re-tap re-shake behaviour
- celebration title thresholds (`perfectScore` / `greatJob` / `wellDone`)
- `layoutClass` applied on start and removed on exit
- the `localStorage` result write

## Service worker

`sw.js` currently hardcodes 21 assets. The project is heading to roughly 35
files, and a missing entry means a blank screen offline. `tools/build-sw.js`
globs `js/` and `css/`, rewrites `ASSETS`, and bumps `CACHE_VERSION`. Run via
`npm run build:sw`.

## Internationalisation

Roughly 150 new UI strings across five languages (en, fr, de, uk, ru). French
written correctly accented; the existing French block is corrected in the same
pass (`Parametres` → `Paramètres`, `Difficulte` → `Difficulté`, `Bien joue` →
`Bien joué`, `Deconnexion` → `Déconnexion`, and the rest).

`I18n.t` gains optional parameter interpolation — `t('speakComplement', { n: 7 })`
against a `'Sept plus combien font {n} ?'`-style template — which the spoken
prompts need and the current key-only lookup cannot express.

`node_modules` is dev-only and gitignored. The deployed site remains static
files with no build step.

## Build order

Four checkpoints, each independently playable:

1. **Engine + migrate nine of the ten existing games.** No new features.
   `double_crash` stays legacy. Success criterion: every game behaves
   identically on a smaller codebase, and `CLAUDE.md` describes the new
   architecture rather than the old one.
2. **Tier 1** — `complements`, `subtraction`, `doubles`, `compare`,
   `missing_number`.
3. **Tier 2** — `tens_units`, `money`, `number_words`, `word_problems`.
4. **Tier 3** — `shapes`, `parity`, `ordering`.

Twelve new games, not thirteen: `clock` is dropped because `guess_time` already
covers it.

Execution uses a git worktree with a fresh subagent per task and review between
tasks. Each checkpoint gets its own implementation plan rather than one plan
covering all four — checkpoint 1 in particular will teach us things about the
engine that should inform how the later game plans are written.

## Out of scope

- Adaptive game surfacing based on past results. The engine persists results to
  `localStorage`, so this later becomes a UI-only change.
- Any backend or account system. The removed auth remnants are not replaced.
- Multiplication and division — CE1 material, not CP.

## Deviations from this design as built

- `memory` also stayed `legacy: true`, alongside `double_crash` — this design's
  "`double_crash` is exempt" section (and the build-order note above) only
  named `double_crash` as the sole exception, which is no longer accurate.
  `memory` fits the exercise/scoring shape but needs a fourth "peeks used"
  stats line and a stricter perfect-score rule
  (`wrongAttempts === 0 && peeksUsed === 0`) that `GameEngine.completeGame()`
  can't express yet. See `CLAUDE.md`'s "legacy escape hatch" section for the
  unblocking route.
