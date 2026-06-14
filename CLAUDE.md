# CLAUDE.md

Guidance for working in this repository.

## What this is

**SumHero** is a static, client-side educational mini-game PWA for kids,
deployed via GitHub Pages at `sumhero.github.io`. There is no backend, no build
step, and no framework — plain HTML, CSS, and vanilla JavaScript loaded directly
via `<script>` tags. It was migrated from a backend-connected math game; all
auth, API, and result-storage code was intentionally removed (see
`.claude/plans/structured-snacking-nygaard.md`).

## Running locally

Open `index.html` directly, or serve the root over a static server (needed for
the service worker / PWA features), e.g. `python3 -m http.server`. There are no
dependencies to install and no tests to run; verification is done by playing
each game in the browser and checking the console for errors.

## Layout

```
index.html            App shell: all screens, loads every JS file in order
manifest.json         PWA manifest
sw.js                 Service worker — caches an explicit ASSETS list
css/game.css          All styles, including per-game layout classes
flags/                ~195 country flag SVGs (used by countries/capitals)
images/               PWA icons
js/
  translations.js     I18n object + TRANSLATIONS for en/fr/de/uk/ru + LANGUAGES
  sound.js            Sound.play('correct'|'wrong'|'victory')
  animation.js        Celebration / confetti / Lottie
  dice-renderer.js    DiceRenderer.render() — SVG dice
  game-list.js        GAMES registry, DIFFICULTY_LEVELS, GameList controller
  app.js              App controller: screen switching, init, translations
  <name>-game.js      One file per game (a self-contained object)
```

## Architecture

- **Screens**: `index.html` defines `.screen` divs (`screen-games`,
  `screen-game`, `screen-celebration`, etc.). `App.showScreen(name)` toggles the
  `.active` class. When leaving the game screen, `App.showScreen` strips per-game
  layout classes from `.game-body`.
- **Game registry**: `GAMES` in `js/game-list.js` lists each game
  (`type`, `nameKey`, `emoji`). `GameList.load()` renders the cards; the card
  click handler routes to the matching game object's `start(difficulty)`.
- **Difficulty**: stored in `localStorage` (`game_difficulty`), one of
  `easy` / `normal` / `hard`. Convention: `easy` 5 rounds, `normal` 10,
  `hard` 20.
- **Game object shape** (each `js/<name>-game.js`): `session`, `currentExercise`,
  `wrongAttempts`, `startTime`, and methods `start`, `generateExercises`,
  `showExercise`, `answer`, `updateProgress`, `completeGame`. Most games render
  a prompt into `#dice-container` and four/five buttons into `#choices-container`,
  applying a layout class (e.g. `geo-game-layout`, `time-game-layout`) to
  `.game-body`.
- **i18n**: every user-facing string goes through `I18n.t('key')`; add the key to
  all five language blocks in `js/translations.js` (en is the fallback).
- **Offline / PWA**: `sw.js` cache-first serves an explicit `ASSETS` list. Any new
  file must be added there, and `CACHE_VERSION` bumped so clients pick it up.

## Adding a new game

1. Create `js/<name>-game.js` with a game object following the shape above
   (mirror an existing one like `js/guess-time-game.js` or
   `js/countries-game.js`).
2. Register it in `GAMES` (`js/game-list.js`) and add a branch in the card click
   handler calling `YourGame.start(this.getDifficulty())`.
3. Add a `<script src="/js/<name>-game.js">` tag in `index.html`, before
   `app.js`.
4. Add the same path to the `ASSETS` array in `sw.js` and bump `CACHE_VERSION`.
5. Add the game-name translation key (and any new strings) to all five languages
   in `js/translations.js`.
6. Add any game-specific styles to `css/game.css`, including a `.game-body`
   layout class, and remember to strip that class in `App.showScreen` (`js/app.js`).
7. Verify by playing it in the browser at each difficulty, in both portrait and
   landscape.

## Conventions

- No frameworks, no bundler, no transpilation — keep it plain ES that runs
  directly in the browser. Match the existing style (2-space indent, single
  quotes, string-concatenated HTML).
- All globals are attached implicitly via top-level `const` and consumed by name;
  load order in `index.html` matters (`app.js` last).
- Wrong-answer pattern: mark the button `.wrong`, set `dataset.wrongChoice`,
  play `Sound.play('wrong')`, and let the player retry; advance on the correct
  choice.

## Workflow

- This repo is **not production**. After making edits, **automatically commit and
  push to `main`** (no PR, no branch, no asking) — the owner wants every change
  landed on `main` right away.
- When game assets (JS/CSS/HTML/sw) change, bump `CACHE_VERSION` in `sw.js` so
  clients pick up the update.
