# GameEngine Extraction (Checkpoint 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `GameEngine` from nine duplicated game files, convert the app to ES modules, and migrate nine of the ten existing games onto the engine with no user-visible behaviour change. `double_crash` keeps its own loop as a documented `legacy` registry entry.

**Architecture:** A game becomes a plain object exposing a pure `generate(difficulty, ctx)` that returns exercise data, plus optional `renderPrompt`/`renderChoices` hooks for the games that aren't simple multiple-choice. The engine owns the session loop, scoring, celebration, speech, and result persistence. `showScreen` moves into its own module so the engine can call it without an import cycle.

**Tech Stack:** Vanilla ES modules, no bundler. Vitest + jsdom for tests. Node only as a dev dependency — the deployed site stays static files.

## Global Constraints

- **No bundler, no framework.** The site is served as static files from GitHub Pages.
- **`node_modules` is dev-only** and gitignored. Nothing in `js/` may import from it.
- **All five languages** stay in sync: `en`, `fr`, `de`, `uk`, `ru`. A new key means five entries.
- **Diacritics are mandatory** in `fr` and `de` strings. Never write `Parametres` for `Paramètres` or `zahlen` for `zählen`.
- **`generate()` is pure**: no DOM, no `Date`, no `Math.random`, no module-scope reads. Everything arrives via `ctx`.
- **Behaviour must not change in this checkpoint.** All ten games play identically when it lands. New games come in checkpoints 2–4.
- **`double_crash` internals are off limits.** Only its imports and registry fields change. Do not refactor 1046 lines of betting logic while extracting an engine.
- **The upstream baseline is `origin/main`, not a local checkout.** This plan was rewritten after discovering four games (`guess_time`, `memory`, `chess`, `double_crash`) that a stale working copy did not contain.
- **Every new file under `js/` or `css/` must reach `sw.js`** or the app breaks offline.

---

### Task 1: Test toolchain

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `test/smoke.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest in a jsdom environment over `test/**/*.test.js`.

- [ ] **Step 1: Write the failing test**

Create `test/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs in a jsdom environment with a real document', () => {
    document.body.innerHTML = '<div id="probe">ok</div>';
    expect(document.getElementById('probe').textContent).toBe('ok');
  });

  it('supports localStorage', () => {
    localStorage.setItem('probe', '1');
    expect(localStorage.getItem('probe')).toBe('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `npm ERR! Missing script: "test"` (no `package.json` yet).

- [ ] **Step 3: Create the toolchain**

Create `package.json`:

```json
{
  "name": "sumhero",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build:sw": "node tools/build-sw.js"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "vitest": "^3.0.0"
  }
}
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
    restoreMocks: true,
  },
});
```

Replace `.gitignore` with:

```
.idea/
.DS_Store
node_modules/
```

Then run: `npm install`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 2 tests in `test/smoke.test.js`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js test/smoke.test.js .gitignore
git commit -m "test: add Vitest + jsdom toolchain"
```

---

### Task 2: ES module lift-and-shift

Mechanical conversion only. No logic changes, no file moves, no renames. The app must behave identically after this task.

**Files:**
- Modify: every file in `js/` — add `export`, add `import`
- Modify: `index.html:99-111` — replace 13 script tags with one module entry
- Modify: `sw.js:1` — bump `CACHE_VERSION`
- Test: `test/modules.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: named exports `App`, `GameList`, `GAMES`, `DIFFICULTY_LEVELS`, `DiceGame`, `CountObjectsGame`, `OBJECT_CATEGORIES`, `UnoGame`, `DiceRecognitionGame`, `CountriesGame`, `CapitalsGame`, `DiceRenderer`, `Animation`, `Sound`, `I18n`, `TRANSLATIONS`, `LANGUAGES`, `getCountryPool`, `getCountryName`.

- [ ] **Step 1: Write the failing test**

Create `test/modules.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { I18n, TRANSLATIONS, LANGUAGES } from '../js/translations.js';
import { DiceRenderer } from '../js/dice-renderer.js';
import { GAMES } from '../js/game-list.js';

describe('ES module conversion', () => {
  it('exports the translation table for all five languages', () => {
    expect(Object.keys(TRANSLATIONS).sort()).toEqual(['de', 'en', 'fr', 'ru', 'uk']);
    expect(LANGUAGES.map(l => l.code).sort()).toEqual(['de', 'en', 'fr', 'ru', 'uk']);
  });

  it('exports a working I18n lookup', () => {
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('exports DiceRenderer producing an svg', () => {
    expect(DiceRenderer.render(3)).toContain('<svg');
  });

  it('exports the six existing games', () => {
    expect(GAMES.map(g => g.type)).toEqual([
      'dice_addition', 'count_objects', 'uno',
      'dice_recognition', 'countries', 'capitals',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/modules.test.js`
Expected: FAIL — `does not provide an export named 'I18n'`.

- [ ] **Step 3: Convert each file**

For every file in `js/`, prefix each top-level `const X = {` / `const X = [` declaration with `export`, and add the imports it needs at the top. The conversion table:

| File | Add `export` to | Add imports |
|---|---|---|
| `translations.js` | `TRANSLATIONS`, `LANGUAGES`, `I18n` | — |
| `sound.js` | `Sound` | — |
| `dice-renderer.js` | `DiceRenderer` | — |
| `animation.js` | `Animation` | — |
| `countries-data.js` | `COUNTRIES`, `getCountryPool`, `getCountryName` | `I18n` |
| `count-objects-game.js` | `OBJECT_CATEGORIES`, `CountObjectsGame` | `App`, `I18n`, `Sound`, `Animation` |
| `uno-game.js` | `UnoGame` | `App`, `I18n`, `Sound`, `Animation` |
| `dice-recognition-game.js` | `DiceRecognitionGame` | `App`, `I18n`, `Sound`, `Animation`, `DiceRenderer` |
| `countries-game.js` | `CountriesGame` | `App`, `I18n`, `Sound`, `Animation`, `getCountryPool`, `getCountryName` |
| `capitals-game.js` | `CapitalsGame` | `App`, `I18n`, `Sound`, `Animation`, `getCountryPool`, `getCountryName` |
| `dice-game.js` | `DiceGame` | `App`, `I18n`, `Sound`, `Animation`, `DiceRenderer` |
| `game-list.js` | `GAMES`, `DIFFICULTY_LEVELS`, `GameList` | `App`, `I18n`, `LANGUAGES`, and all six game objects, `OBJECT_CATEGORIES` |
| `app.js` | `App` | `GameList`, `Animation`, `I18n` |

Example — the head of `js/dice-game.js` becomes:

```js
import { App } from './app.js';
import { I18n } from './translations.js';
import { Sound } from './sound.js';
import { Animation } from './animation.js';
import { DiceRenderer } from './dice-renderer.js';

export const DiceGame = {
```

`app.js` and `game-list.js` import each other. This cycle is safe because every use is inside a function body that runs after load, not at module scope. Task 4 removes the cycle properly.

Replace `index.html:99-111` (the 13 `<script>` tags, keeping the service-worker registration block that follows) with:

```html
    <script type="module" src="/js/app.js"></script>
```

Bump `sw.js:1` to `const CACHE_VERSION = '2026072601';`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — smoke tests plus 4 module tests.

- [ ] **Step 5: Verify in a browser**

Run: `python3 -m http.server 8000`
Open `http://localhost:8000`, play one round of each of the six games. Confirm the game list renders, a game runs to the celebration screen, and the console is free of errors.

- [ ] **Step 6: Commit**

```bash
git add js/ index.html sw.js test/modules.test.js
git commit -m "refactor: convert to ES modules"
```

---

### Task 3: Split i18n and add parameter interpolation

**Files:**
- Create: `js/i18n/i18n.js`
- Create: `js/i18n/translations.js` (moved from `js/translations.js`)
- Delete: `js/translations.js`
- Modify: every file importing `I18n`, `TRANSLATIONS`, or `LANGUAGES`
- Modify: `sw.js`
- Test: `test/i18n/i18n.test.js`

**Interfaces:**
- Consumes: `TRANSLATIONS`, `LANGUAGES` from Task 2.
- Produces: `I18n.t(key, params?) => string`, `I18n.getLanguage()`, `I18n.setLanguage(code)`.

- [ ] **Step 1: Write the failing test**

Create `test/i18n/i18n.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { I18n } from '../../js/i18n/i18n.js';

describe('I18n.t', () => {
  beforeEach(() => {
    localStorage.clear();
    I18n.setLanguage('en');
  });

  it('looks up a plain key', () => {
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('returns the key itself when missing', () => {
    expect(I18n.t('noSuchKey')).toBe('noSuchKey');
  });

  it('falls back to English when the key is absent in the active language', () => {
    I18n.setLanguage('fr');
    expect(I18n.t('appName')).toBe('SumHero');
  });

  it('interpolates named parameters', () => {
    expect(I18n.format('Sept plus combien font {n} ?', { n: 10 }))
      .toBe('Sept plus combien font 10 ?');
  });

  it('interpolates every occurrence of a parameter', () => {
    expect(I18n.format('{a} et {a}', { a: 'x' })).toBe('x et x');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(I18n.format('{a} {b}', { a: '1' })).toBe('1 {b}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/i18n/i18n.test.js`
Expected: FAIL — cannot resolve `../../js/i18n/i18n.js`.

- [ ] **Step 3: Implement**

`git mv js/translations.js js/i18n/translations.js`, then strip the `I18n` object out of it so it exports only `TRANSLATIONS` and `LANGUAGES`.

Create `js/i18n/i18n.js`:

```js
import { TRANSLATIONS } from './translations.js';

const DEFAULT_LANGUAGE = 'en';

export const I18n = {
  getLanguage() {
    return localStorage.getItem('game_language') || DEFAULT_LANGUAGE;
  },

  setLanguage(code) {
    localStorage.setItem('game_language', code);
  },

  format(template, params) {
    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
  },

  t(key, params) {
    const lang = this.getLanguage();
    const template = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key])
      || TRANSLATIONS[DEFAULT_LANGUAGE][key]
      || key;

    return this.format(template, params);
  },
};
```

Update every `import { I18n } from './translations.js'` to `import { I18n } from './i18n/i18n.js'` (adjust the relative depth per file), and every `LANGUAGES` import to `./i18n/translations.js`.

In `sw.js`, replace `'/js/translations.js'` with `'/js/i18n/translations.js'` and `'/js/i18n/i18n.js'`, and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all suites.

- [ ] **Step 5: Commit**

```bash
git add js/ sw.js test/i18n/
git commit -m "feat: add i18n parameter interpolation"
```

---

### Task 4: Fix French and German diacritics

**Files:**
- Modify: `js/i18n/translations.js` — `fr` and `de` blocks
- Test: `test/i18n/diacritics.test.js`

**Interfaces:**
- Consumes: `TRANSLATIONS` from Task 3.
- Produces: nothing new — corrects existing values.

- [ ] **Step 1: Write the failing test**

Create `test/i18n/diacritics.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '../../js/i18n/translations.js';

describe('French orthography', () => {
  it('uses correct accents', () => {
    expect(TRANSLATIONS.fr.settings).toBe('Paramètres');
    expect(TRANSLATIONS.fr.difficulty).toBe('Difficulté');
    expect(TRANSLATIONS.fr.wellDone).toBe('Bien joué !');
    expect(TRANSLATIONS.fr.diceAddition).toBe('Addition de dés');
    expect(TRANSLATIONS.fr.diceRecognition).toBe('Dé');
  });

  it('has no unaccented remnants of accented words', () => {
    const values = Object.values(TRANSLATIONS.fr).join(' ');
    for (const wrong of ['Parametres', 'Difficulte', 'Bien joue', 'de des', 'resultats']) {
      expect(values).not.toContain(wrong);
    }
  });
});

describe('German orthography', () => {
  it('uses correct umlauts', () => {
    expect(TRANSLATIONS.de.countObjects).toBe('Objekte zählen');
    expect(TRANSLATIONS.de.chooseGame).toBe('Spiel wählen');
    expect(TRANSLATIONS.de.back).toBe('Zurück');
    expect(TRANSLATIONS.de.diceAddition).toBe('Würfel-Addition');
    expect(TRANSLATIONS.de.countries).toBe('Länder');
    expect(TRANSLATIONS.de.capitals).toBe('Hauptstädte');
  });

  it('does not say "pay for objects"', () => {
    expect(TRANSLATIONS.de.countObjects).not.toBe('Objekte zahlen');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/i18n/diacritics.test.js`
Expected: FAIL — `expected 'Parametres' to be 'Paramètres'`.

- [ ] **Step 3: Correct the `fr` block**

```
settings: 'Paramètres'          difficulty: 'Difficulté'
language: 'Langue'              logout: 'Déconnexion'
register: "S'inscrire"          chooseObjects: 'Choisir les objets'
wellDone: 'Bien joué !'         diceAddition: 'Addition de dés'
diceRecognition: 'Dé'           countObjects: 'Compter les objets'
enterCredentials: "Veuillez entrer le nom d'utilisateur et le mot de passe"
offlineLogin: 'Vous êtes hors ligne. Connectez-vous à Internet pour vous connecter.'
offlineRegister: 'Vous êtes hors ligne. Connectez-vous à Internet pour vous inscrire.'
pendingResults: 'résultats en attente'
resultsSynced: 'résultats synchronisés'
```

- [ ] **Step 4: Correct the `de` block**

```
chooseGame: 'Spiel wählen'      back: 'Zurück'
chooseObjects: 'Objekte wählen' diceAddition: 'Würfel-Addition'
diceRecognition: 'Würfel'       countObjects: 'Objekte zählen'
countries: 'Länder'             capitals: 'Hauptstädte'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/i18n/translations.js test/i18n/diacritics.test.js
git commit -m "fix: restore French accents and German umlauts"
```

---

### Task 5: Extract screens module

Breaks the `app.js` ↔ `game-list.js` import cycle before the engine is added.

**Files:**
- Create: `js/engine/screens.js`
- Modify: `js/app.js:52-80` — remove `showScreen`, delegate
- Modify: every caller of `App.showScreen`
- Modify: `sw.js`
- Test: `test/engine/screens.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `showScreen(name)`, `setLayoutClass(className|null)`, `onScreenChange(fn)`.

- [ ] **Step 1: Write the failing test**

Create `test/engine/screens.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showScreen, setLayoutClass, onScreenChange } from '../../js/engine/screens.js';

function mountScreens() {
  document.body.innerHTML = `
    <div id="screen-games" class="screen active"></div>
    <div id="screen-game" class="screen"><div class="game-body"></div></div>
  `;
}

describe('showScreen', () => {
  beforeEach(mountScreens);

  it('activates the target screen', () => {
    showScreen('game');
    expect(document.getElementById('screen-game').classList.contains('active')).toBe(true);
  });

  it('deactivates the previous screen', () => {
    showScreen('game');
    expect(document.getElementById('screen-games').classList.contains('active')).toBe(false);
  });

  it('notifies subscribers', () => {
    const spy = vi.fn();
    onScreenChange(spy);
    showScreen('game');
    expect(spy).toHaveBeenCalledWith('game');
  });
});

describe('setLayoutClass', () => {
  beforeEach(mountScreens);

  it('applies a class to the game body', () => {
    setLayoutClass('uno-game-body');
    expect(document.querySelector('.game-body').classList.contains('uno-game-body')).toBe(true);
  });

  it('removes the previous class when a new one is set', () => {
    setLayoutClass('uno-game-body');
    setLayoutClass('geo-game-layout');
    const body = document.querySelector('.game-body');
    expect(body.classList.contains('uno-game-body')).toBe(false);
    expect(body.classList.contains('geo-game-layout')).toBe(true);
  });

  it('clears the class when passed null', () => {
    setLayoutClass('uno-game-body');
    setLayoutClass(null);
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine/screens.test.js`
Expected: FAIL — cannot resolve `../../js/engine/screens.js`.

- [ ] **Step 3: Implement**

Create `js/engine/screens.js`:

```js
let activeLayoutClass = null;
const listeners = [];

export function onScreenChange(fn) {
  listeners.push(fn);
}

export function setLayoutClass(className) {
  const body = document.querySelector('.game-body');
  if (!body) return;

  if (activeLayoutClass) body.classList.remove(activeLayoutClass);
  if (className) body.classList.add(className);
  activeLayoutClass = className;
}

export function showScreen(name) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById('screen-' + name);
  if (!next) return;

  if (current && current !== next) {
    current.classList.add('screen-out');
    current.classList.remove('active');
    current.addEventListener('animationend', () => {
      current.classList.remove('screen-out');
    }, { once: true });
  }

  next.classList.add('active');

  if (name !== 'game') {
    setLayoutClass(null);
    const choices = document.getElementById('choices-container');
    if (choices) choices.style.gridTemplateColumns = '';
  }

  listeners.forEach(fn => fn(name));
}
```

In `js/app.js`, delete the `showScreen` method (`app.js:52-80`) and its hardcoded `classList.remove('uno-game-body')` block. Re-export for callers during migration:

```js
import { showScreen, onScreenChange } from './engine/screens.js';

export const App = {
  init() {
    onScreenChange(name => {
      if (name === 'games') GameList.load();
    });
    // ...rest unchanged
  },
  showScreen,
  // ...rest unchanged
};
```

Add `'/js/engine/screens.js'` to `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/ sw.js test/engine/screens.test.js
git commit -m "refactor: extract screens module"
```

---

### Task 6: Result persistence

**Files:**
- Create: `js/engine/results.js`
- Modify: `sw.js`
- Test: `test/engine/results.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `saveResult(result)`, `loadResults()`, `RESULTS_KEY`, `MAX_RESULTS`.

- [ ] **Step 1: Write the failing test**

Create `test/engine/results.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveResult, loadResults, RESULTS_KEY, MAX_RESULTS } from '../../js/engine/results.js';

const sample = {
  gameId: 'dice_addition',
  difficulty: 'easy',
  totalExercises: 5,
  wrongAttempts: 1,
  durationSeconds: 42,
  playedAt: '2026-07-26T12:00:00.000Z',
};

describe('results', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty list when nothing is stored', () => {
    expect(loadResults()).toEqual([]);
  });

  it('round-trips a saved result', () => {
    saveResult(sample);
    expect(loadResults()).toEqual([sample]);
  });

  it('appends newest last', () => {
    saveResult({ ...sample, wrongAttempts: 1 });
    saveResult({ ...sample, wrongAttempts: 2 });
    expect(loadResults().map(r => r.wrongAttempts)).toEqual([1, 2]);
  });

  it('caps stored results, dropping the oldest', () => {
    for (let i = 0; i < MAX_RESULTS + 10; i++) {
      saveResult({ ...sample, wrongAttempts: i });
    }
    const stored = loadResults();
    expect(stored).toHaveLength(MAX_RESULTS);
    expect(stored[0].wrongAttempts).toBe(10);
  });

  it('recovers from corrupt storage instead of throwing', () => {
    localStorage.setItem(RESULTS_KEY, 'not json');
    expect(loadResults()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine/results.test.js`
Expected: FAIL — cannot resolve `../../js/engine/results.js`.

- [ ] **Step 3: Implement**

Create `js/engine/results.js`:

```js
export const RESULTS_KEY = 'game_results';
export const MAX_RESULTS = 200;

export function loadResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESULTS_KEY));

    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveResult(result) {
  const results = loadResults();
  results.push(result);

  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(-MAX_RESULTS)));
  } catch (e) {
    // Storage full or unavailable — a lost result must never break a game.
  }
}
```

Add `'/js/engine/results.js'` to `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/engine/results.js sw.js test/engine/results.test.js
git commit -m "feat: persist game results to localStorage"
```

---

### Task 7: Speech module

**Files:**
- Create: `js/engine/speech.js`
- Modify: `sw.js`
- Test: `test/engine/speech.test.js`

**Interfaces:**
- Consumes: `I18n` from Task 3.
- Produces: `Speech.speak(text, lang)`, `Speech.cancel()`, `Speech.isAvailable()`, `Speech.LANG_TAGS`.

- [ ] **Step 1: Write the failing test**

Create `test/engine/speech.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Speech } from '../../js/engine/speech.js';

describe('Speech', () => {
  let spoken;

  beforeEach(() => {
    spoken = [];
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; }
    });
    vi.stubGlobal('speechSynthesis', {
      speak: u => spoken.push(u),
      cancel: () => spoken.push('cancel'),
    });
  });

  it('reports availability', () => {
    expect(Speech.isAvailable()).toBe(true);
  });

  it('speaks the given text', () => {
    Speech.speak('Sept plus trois ?', 'fr');
    expect(spoken[0].text).toBe('Sept plus trois ?');
  });

  it('maps the app language code to a BCP-47 tag', () => {
    Speech.speak('test', 'fr');
    expect(spoken[0].lang).toBe('fr-FR');
  });

  it('cancels any in-flight utterance before speaking', () => {
    Speech.speak('one', 'en');
    Speech.speak('two', 'en');
    expect(spoken.filter(s => s === 'cancel')).toHaveLength(2);
  });

  it('is a no-op when the API is missing', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(Speech.isAvailable()).toBe(false);
    expect(() => Speech.speak('x', 'en')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine/speech.test.js`
Expected: FAIL — cannot resolve `../../js/engine/speech.js`.

- [ ] **Step 3: Implement**

Create `js/engine/speech.js`:

```js
export const Speech = {
  LANG_TAGS: {
    en: 'en-GB',
    fr: 'fr-FR',
    de: 'de-DE',
    uk: 'uk-UA',
    ru: 'ru-RU',
  },

  isAvailable() {
    return typeof speechSynthesis !== 'undefined' && !!speechSynthesis;
  },

  cancel() {
    if (!this.isAvailable()) return;
    speechSynthesis.cancel();
  },

  speak(text, lang) {
    if (!this.isAvailable() || !text) return;

    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.LANG_TAGS[lang] || this.LANG_TAGS.en;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  },
};
```

Add `'/js/engine/speech.js'` to `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/engine/speech.js sw.js test/engine/speech.test.js
git commit -m "feat: add speech synthesis module"
```

---

### Task 8: GameEngine core

The heart of the checkpoint. Owns the session loop that six files currently duplicate.

**Files:**
- Create: `js/engine/game-engine.js`
- Modify: `sw.js`
- Test: `test/engine/game-engine.test.js`

**Interfaces:**
- Consumes: `showScreen`, `setLayoutClass` (Task 5); `saveResult` (Task 6); `Speech` (Task 7); `I18n` (Task 3); `Sound`, `Animation` (Task 2).
- Produces: `GameEngine.start(game, options)`, `GameEngine.resolveCount(game, difficulty, requested)`, `GameEngine.buildContext(difficulty, options)`, `GameEngine.isCorrect(value, exercise)`, `GameEngine.applyBodyClass(className)`, and the overridable seams `GameEngine.now`, `GameEngine.advanceDelayMs`.

  A game object is:

  ```
  {
    id, nameKey, emoji, domain, rounds,
    layoutClass?,     // class on .game-body for the whole game
    choiceClass?,     // extra class on each default-rendered choice button
    correctClass?,    // class marking a right answer, default 'correct'
    setup?,           // 'category' to show the object-category pre-screen
    legacy?,          // true = not engine-driven; game list calls its own start()
    generate(difficulty, ctx),
    isCorrect?(value, exercise),          // default: value === exercise.correctAnswer
    renderPrompt?(el, exercise, submit),
    renderChoices?(el, exercise, submit),
  }
  ```

  An exercise is `{ promptHtml?, speak?, bodyClass?, choices, correctAnswer }`. A
  choice is a number, a string, or `{ html, value }`. A game using `isCorrect`
  need not set `correctAnswer` at all.

- [ ] **Step 1: Write the failing test**

Create `test/engine/game-engine.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../../js/engine/game-engine.js';
import { showScreen } from '../../js/engine/screens.js';
import { loadResults } from '../../js/engine/results.js';

function mountDom() {
  document.body.innerHTML = `
    <div id="screen-games" class="screen active"></div>
    <div id="screen-game" class="screen">
      <div id="progress-fill"></div>
      <div id="game-score"></div>
      <div class="game-body">
        <div id="dice-container"></div>
        <div id="choices-container"></div>
      </div>
    </div>
    <div id="screen-celebration" class="screen">
      <div id="dancing-animals"></div>
      <h2 id="celebration-title"></h2>
      <div id="celebration-stats"></div>
      <div id="confetti-container"></div>
    </div>
  `;
}

const stubGame = {
  id: 'stub',
  nameKey: 'stub',
  emoji: '🧪',
  domain: 'nombres',
  rounds: { easy: 2, normal: 3, hard: 4 },
  generate(difficulty, ctx) {
    return Array.from({ length: ctx.count }, (_, i) => ({
      promptHtml: `<p>q${i}</p>`,
      choices: [1, 2, 3],
      correctAnswer: 2,
    }));
  },
};

function clickChoice(value) {
  const btn = [...document.querySelectorAll('.choice-btn')]
    .find(b => b.dataset.value === String(value));
  btn.click();

  return btn;
}

describe('GameEngine', () => {
  beforeEach(() => {
    mountDom();
    localStorage.clear();
    GameEngine.advanceDelayMs = 0;
    GameEngine.now = () => 1000;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves round count from the difficulty', () => {
    expect(GameEngine.resolveCount(stubGame, 'normal')).toBe(3);
  });

  it('honours a requested count when rounds is "ask"', () => {
    expect(GameEngine.resolveCount({ ...stubGame, rounds: 'ask' }, 'easy', 7)).toBe(7);
  });

  it('renders the first exercise and its choices', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    expect(document.getElementById('dice-container').innerHTML).toContain('q0');
    expect(document.querySelectorAll('.choice-btn')).toHaveLength(3);
  });

  it('shows the game screen', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    expect(document.getElementById('screen-game').classList.contains('active')).toBe(true);
  });

  it('marks a correct answer and advances', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(2);
    expect(btn.classList.contains('correct')).toBe(true);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q1');
  });

  it('marks a wrong answer and stays on the exercise', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(1);
    expect(btn.classList.contains('wrong')).toBe(true);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q0');
  });

  it('counts each distinct wrong choice once', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(1);
    clickChoice(1);
    clickChoice(3);
    expect(GameEngine.wrongAttempts).toBe(2);
  });

  it('re-triggers the shake on a repeated wrong tap', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(1);
    btn.classList.remove('wrong');
    clickChoice(1);
    expect(btn.classList.contains('wrong')).toBe(true);
  });

  it('updates the score display', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2);
    vi.runAllTimers();
    expect(document.getElementById('game-score').textContent).toBe('1 / 2');
  });

  it('reaches the celebration screen after the last exercise', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2);
    vi.runAllTimers();
    clickChoice(2);
    vi.runAllTimers();
    expect(document.getElementById('screen-celebration').classList.contains('active')).toBe(true);
  });

  it('titles a flawless run "perfectScore"', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2); vi.runAllTimers();
    clickChoice(2); vi.runAllTimers();
    expect(document.getElementById('celebration-title').textContent).toBe('Perfect Score!');
  });

  it('titles a run with many errors "wellDone"', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(1); clickChoice(3); clickChoice(2); vi.runAllTimers();
    clickChoice(1); clickChoice(3); clickChoice(2); vi.runAllTimers();
    expect(document.getElementById('celebration-title').textContent).toBe('Well Done!');
  });

  it('persists the result', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2); vi.runAllTimers();
    clickChoice(2); vi.runAllTimers();
    expect(loadResults()).toHaveLength(1);
    expect(loadResults()[0]).toMatchObject({
      gameId: 'stub', difficulty: 'easy', totalExercises: 2, wrongAttempts: 0,
    });
  });

  it('adds a game-declared choice class to every button', () => {
    GameEngine.start({ ...stubGame, choiceClass: 'geo-choice-btn' }, { difficulty: 'easy' });
    for (const btn of document.querySelectorAll('.choice-btn')) {
      expect(btn.classList.contains('geo-choice-btn')).toBe(true);
    }
  });

  it('keeps string choices as strings when submitted', () => {
    let received = null;
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '', choices: ['France', 'Italie'], correctAnswer: 'France' }],
    }, { difficulty: 'easy' });
    document.querySelector('[data-value="France"]').click();
    received = GameEngine.wrongAttempts;
    expect(received).toBe(0);
  });

  it('applies the layout class when the game declares one', () => {
    GameEngine.start({ ...stubGame, layoutClass: 'stub-layout' }, { difficulty: 'easy' });
    expect(document.querySelector('.game-body').classList.contains('stub-layout')).toBe(true);
  });

  it('passes a seeded rng through the context', () => {
    const seen = [];
    GameEngine.start({
      ...stubGame,
      generate(difficulty, ctx) {
        seen.push(ctx.rng());

        return [{ promptHtml: '', choices: [1], correctAnswer: 1 }];
      },
    }, { difficulty: 'easy', rng: () => 0.5 });
    expect(seen).toEqual([0.5]);
  });

  it('accepts a game-supplied isCorrect predicate with many valid answers', () => {
    const manyAnswers = {
      ...stubGame,
      isCorrect: (value, ex) => ex.targets.includes(value),
      generate: () => [{ promptHtml: '', choices: ['1,2', '3,4', '9,9'], targets: ['1,2', '3,4'] }],
    };
    GameEngine.start(manyAnswers, { difficulty: 'easy' });

    document.querySelector('[data-value="3,4"]').click();
    expect(GameEngine.wrongAttempts).toBe(0);
  });

  it('counts a wrong answer under a custom isCorrect predicate', () => {
    GameEngine.start({
      ...stubGame,
      isCorrect: (value, ex) => ex.targets.includes(value),
      generate: () => [{ promptHtml: '', choices: ['1,2', '9,9'], targets: ['1,2'] }],
    }, { difficulty: 'easy' });

    document.querySelector('[data-value="9,9"]').click();
    expect(GameEngine.wrongAttempts).toBe(1);
  });

  it('honours a game-supplied correctClass', () => {
    GameEngine.start({ ...stubGame, correctClass: 'chess-correct' }, { difficulty: 'easy' });
    const btn = clickChoice(2);
    expect(btn.classList.contains('chess-correct')).toBe(true);
    expect(btn.classList.contains('correct')).toBe(false);
  });

  it('applies a per-exercise bodyClass', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' }],
    }, { difficulty: 'easy' });
    expect(document.body.classList.contains('time-theme-night')).toBe(true);
  });

  it('swaps the bodyClass between exercises rather than stacking them', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [
        { promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-day' },
        { promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' },
      ],
    }, { difficulty: 'easy' });

    document.querySelector('[data-value="1"]').click();
    vi.runAllTimers();

    expect(document.body.classList.contains('time-theme-day')).toBe(false);
    expect(document.body.classList.contains('time-theme-night')).toBe(true);
  });

  it('clears the bodyClass when leaving the game screen', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' }],
    }, { difficulty: 'easy' });

    showScreen('games');
    expect(document.body.classList.contains('time-theme-night')).toBe(false);
  });

  it('passes submit to renderPrompt so a game can wire its own board', () => {
    GameEngine.start({
      ...stubGame,
      renderPrompt(el, exercise, submit) {
        el.innerHTML = '<button id="cell">c</button>';
        el.querySelector('#cell').addEventListener('click', (e) => submit(2, e.target));
      },
      renderChoices(el) {
        el.innerHTML = '';
      },
    }, { difficulty: 'easy' });

    document.getElementById('cell').click();
    expect(GameEngine.wrongAttempts).toBe(0);
    expect(document.getElementById('choices-container').innerHTML).toBe('');
  });

  it('uses a game-supplied renderChoices hook', () => {
    GameEngine.start({
      ...stubGame,
      renderChoices(el, exercise, submit) {
        el.innerHTML = '<button id="custom">go</button>';
        el.querySelector('#custom').addEventListener('click', () => submit(2, el.firstChild));
      },
    }, { difficulty: 'easy' });
    expect(document.getElementById('custom')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine/game-engine.test.js`
Expected: FAIL — cannot resolve `../../js/engine/game-engine.js`.

- [ ] **Step 3: Implement**

Create `js/engine/game-engine.js`:

```js
import { showScreen, setLayoutClass, onScreenChange } from './screens.js';
import { saveResult } from './results.js';
import { Speech } from './speech.js';
import { I18n } from '../i18n/i18n.js';
import { Sound } from '../sound.js';
import { Animation } from '../animation.js';

export const GameEngine = {
  game: null,
  exercises: [],
  index: 0,
  wrongAttempts: 0,
  startTime: 0,
  difficulty: 'easy',
  activeBodyClass: null,

  now: () => Date.now(),
  advanceDelayMs: 600,

  resolveCount(game, difficulty, requested) {
    if (game.rounds === 'ask') return requested;

    return game.rounds[difficulty];
  },

  isCorrect(value, exercise) {
    if (this.game.isCorrect) return this.game.isCorrect(value, exercise);

    return value === exercise.correctAnswer;
  },

  applyBodyClass(className) {
    if (this.activeBodyClass) {
      document.body.classList.remove(this.activeBodyClass);
    }
    if (className) {
      document.body.classList.add(className);
    }
    this.activeBodyClass = className;
  },

  buildContext(difficulty, options) {
    return {
      rng: options.rng || Math.random,
      t: (key, params) => I18n.t(key, params),
      lang: I18n.getLanguage(),
      count: this.resolveCount(options.game, difficulty, options.count),
      category: options.category || null,
    };
  },

  start(game, options = {}) {
    const difficulty = options.difficulty || 'easy';
    const ctx = this.buildContext(difficulty, { ...options, game });

    this.game = game;
    this.difficulty = difficulty;
    this.exercises = game.generate(difficulty, ctx);
    this.index = 0;
    this.wrongAttempts = 0;
    this.startTime = this.now();

    showScreen('game');
    setLayoutClass(game.layoutClass || null);
    this.showExercise();
  },

  showExercise() {
    const exercise = this.exercises[this.index];
    if (!exercise) return;

    const submit = (value, btn) => this.answer(value, btn);

    this.applyBodyClass(exercise.bodyClass || null);

    const promptEl = document.getElementById('dice-container');
    if (this.game.renderPrompt) {
      this.game.renderPrompt(promptEl, exercise, submit);
    } else {
      promptEl.innerHTML = exercise.promptHtml || '';
    }

    const choicesEl = document.getElementById('choices-container');

    if (this.game.renderChoices) {
      this.game.renderChoices(choicesEl, exercise, submit);
    } else {
      this.renderDefaultChoices(choicesEl, exercise, submit);
    }

    if (exercise.speak) this.speakPrompt(exercise.speak);
    this.updateProgress();
  },

  renderDefaultChoices(el, exercise, submit) {
    const extra = this.game.choiceClass ? ' ' + this.game.choiceClass : '';

    el.innerHTML = exercise.choices.map(choice => {
      const value = typeof choice === 'object' ? choice.value : choice;
      const html = typeof choice === 'object' ? choice.html : choice;

      return '<button class="choice-btn' + extra + '" data-value="' + value + '">' +
        html +
      '</button>';
    }).join('');

    el.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        const value = raw !== '' && !isNaN(raw) ? Number(raw) : raw;
        submit(value, btn);
      });
    });
  },

  speakPrompt(text) {
    Speech.speak(text, I18n.getLanguage());

    const promptEl = document.getElementById('dice-container');
    const replay = document.createElement('button');
    replay.className = 'speak-btn';
    replay.type = 'button';
    replay.textContent = '🔊';
    replay.addEventListener('click', () => Speech.speak(text, I18n.getLanguage()));
    promptEl.appendChild(replay);
  },

  answer(value, btn) {
    if (btn && btn.dataset.wrongChoice) {
      btn.classList.remove('wrong');
      void btn.offsetWidth;
      btn.classList.add('wrong');
      Sound.play('wrong');

      return;
    }

    const exercise = this.exercises[this.index];

    if (this.isCorrect(value, exercise)) {
      if (btn) btn.classList.add(this.game.correctClass || 'correct');
      Sound.play('correct');
      Speech.cancel();

      const isLast = this.index === this.exercises.length - 1;
      setTimeout(() => {
        if (isLast) {
          this.completeGame();
        } else {
          this.index++;
          this.showExercise();
        }
      }, this.advanceDelayMs);

      return;
    }

    this.wrongAttempts++;
    if (btn) {
      btn.classList.add('wrong');
      btn.dataset.wrongChoice = '1';
    }
    Sound.play('wrong');
  },

  updateProgress() {
    const total = this.exercises.length;
    document.getElementById('progress-fill').style.width = (this.index / total * 100) + '%';
    document.getElementById('game-score').textContent = this.index + ' / ' + total;
  },

  completeGame() {
    const durationSeconds = Math.round((this.now() - this.startTime) / 1000);
    const total = this.exercises.length;

    saveResult({
      gameId: this.game.id,
      difficulty: this.difficulty,
      totalExercises: total,
      wrongAttempts: this.wrongAttempts,
      durationSeconds,
      playedAt: new Date(this.startTime).toISOString(),
    });

    document.getElementById('celebration-stats').innerHTML =
      I18n.t('exercises') + ': ' + total + '<br>' +
      I18n.t('wrongAttempts') + ': ' + this.wrongAttempts + '<br>' +
      I18n.t('time') + ': ' + durationSeconds + 's';

    let titleKey = 'wellDone';
    if (this.wrongAttempts === 0) titleKey = 'perfectScore';
    else if (this.wrongAttempts <= total) titleKey = 'greatJob';
    document.getElementById('celebration-title').textContent = I18n.t(titleKey);

    Animation.showCelebration(document.getElementById('dancing-animals'));
    Animation.showConfetti(document.getElementById('confetti-container'));
    Sound.play('victory');
    showScreen('celebration');
  },
};

onScreenChange(name => {
  if (name !== 'game' && name !== 'celebration') {
    GameEngine.applyBodyClass(null);
  }
});
```

Add `'/js/engine/game-engine.js'` to `sw.js` and bump `CACHE_VERSION`.

> The four optional fields `isCorrect`, `correctClass`, `bodyClass`, and the
> `submit` argument to `renderPrompt` exist for exactly two games. `chess` has a
> *set* of valid target cells rather than one answer, marks success with
> `.chess-correct`, and wires its click handlers on the board it paints into
> `#dice-container`. `guess_time` themes `document.body` day or night per
> exercise. Both were previously impossible to express, and the `onScreenChange`
> subscription fixes a pre-existing bug where the day/night theme survived
> leaving the game.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 17 engine tests plus all earlier suites.

- [ ] **Step 5: Commit**

```bash
git add js/engine/game-engine.js sw.js test/engine/game-engine.test.js
git commit -m "feat: add GameEngine session loop"
```

---

### Task 9: Registry and domain-grouped game list

**Files:**
- Create: `js/engine/registry.js`
- Modify: `js/game-list.js` → `js/engine/game-list.js`
- Modify: `css/game.css` — add `.game-group` styles
- Modify: `sw.js`
- Test: `test/engine/registry.test.js`

**Interfaces:**
- Consumes: `GameEngine` (Task 8), `I18n` (Task 3).
- Produces: `DOMAINS` (ordered array of `{ key, labelKey, emoji }`), `GAMES` (array of game objects), `gamesByDomain()`.

- [ ] **Step 1: Write the failing test**

Create `test/engine/registry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DOMAINS, GAMES, gamesByDomain } from '../../js/engine/registry.js';

describe('registry', () => {
  it('declares the five domains in display order', () => {
    expect(DOMAINS.map(d => d.key))
      .toEqual(['nombres', 'mesures', 'geometrie', 'logique', 'monde']);
  });

  it('registers all ten existing games', () => {
    expect(GAMES.map(g => g.id).sort()).toEqual([
      'capitals', 'chess', 'count_objects', 'countries', 'dice_addition',
      'dice_recognition', 'double_crash', 'guess_time', 'memory', 'uno',
    ]);
  });

  it('gives every game a domain that exists', () => {
    const keys = DOMAINS.map(d => d.key);
    for (const game of GAMES) {
      expect(keys).toContain(game.domain);
    }
  });

  it('gives every engine-driven game the fields the engine requires', () => {
    for (const game of GAMES.filter(g => !g.legacy)) {
      expect(typeof game.generate).toBe('function');
      expect(game.nameKey).toBeTruthy();
      expect(game.emoji).toBeTruthy();
    }
  });

  it('marks exactly one game legacy, and it supplies its own start()', () => {
    const legacy = GAMES.filter(g => g.legacy);
    expect(legacy.map(g => g.id)).toEqual(['double_crash']);
    expect(typeof legacy[0].start).toBe('function');
  });

  it('groups games under their domain, skipping empty domains', () => {
    const grouped = gamesByDomain();
    expect(grouped.map(g => g.domain.key))
      .toEqual(['nombres', 'mesures', 'logique', 'monde']);
    expect(grouped[0].games.map(g => g.id))
      .toEqual(['dice_addition', 'count_objects', 'dice_recognition']);
    expect(grouped[1].games.map(g => g.id)).toEqual(['guess_time']);
    expect(grouped[2].games.map(g => g.id))
      .toEqual(['uno', 'memory', 'chess', 'double_crash']);
  });

  it('leaves geometrie empty until Tier 3 adds shapes', () => {
    expect(gamesByDomain().map(g => g.domain.key)).not.toContain('geometrie');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/engine/registry.test.js`
Expected: FAIL — cannot resolve `../../js/engine/registry.js`.

- [ ] **Step 3: Implement**

Create `js/engine/registry.js`:

```js
import { DiceAdditionGame } from '../games/dice-addition.js';
import { CountObjectsGame } from '../games/count-objects.js';
import { DiceRecognitionGame } from '../games/dice-recognition.js';
import { UnoGame } from '../games/uno.js';
import { CountriesGame } from '../games/countries.js';
import { CapitalsGame } from '../games/capitals.js';
import { GuessTimeGame } from '../games/guess-time.js';
import { MemoryGame } from '../games/memory.js';
import { ChessGame } from '../games/chess.js';
import { DoubleCrashGame } from '../games/double-crash.js';

export const DOMAINS = [
  { key: 'nombres', labelKey: 'domainNombres', emoji: '🔢' },
  { key: 'mesures', labelKey: 'domainMesures', emoji: '📏' },
  { key: 'geometrie', labelKey: 'domainGeometrie', emoji: '🔷' },
  { key: 'logique', labelKey: 'domainLogique', emoji: '🃏' },
  { key: 'monde', labelKey: 'domainMonde', emoji: '🌍' },
];

export const GAMES = [
  DiceAdditionGame,
  CountObjectsGame,
  DiceRecognitionGame,
  GuessTimeGame,
  UnoGame,
  MemoryGame,
  ChessGame,
  DoubleCrashGame,
  CountriesGame,
  CapitalsGame,
];

export function gamesByDomain() {
  return DOMAINS
    .map(domain => ({ domain, games: GAMES.filter(g => g.domain === domain.key) }))
    .filter(group => group.games.length > 0);
}
```

Move `game-list.js` to `js/engine/game-list.js` and replace `load()` and the dispatch chain:

```js
load() {
  const container = document.getElementById('game-list');
  container.innerHTML = gamesByDomain().map(({ domain, games }) =>
    '<section class="game-group">' +
      '<h3 class="game-group-title">' + domain.emoji + ' ' + I18n.t(domain.labelKey) + '</h3>' +
      '<div class="game-group-cards">' +
        games.map(game =>
          '<div class="game-card" data-id="' + game.id + '">' +
            '<span class="game-card-emoji">' + game.emoji + '</span>' +
            '<span class="game-card-name">' + I18n.t(game.nameKey) + '</span>' +
          '</div>'
        ).join('') +
      '</div>' +
    '</section>'
  ).join('');

  container.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const game = GAMES.find(g => g.id === card.dataset.id);
      this.selectedGame = game;

      if (game.legacy) {
        game.start(this.getDifficulty());
      } else if (game.setup === 'category') {
        this.showCategoryPicker();
      } else if (game.rounds === 'ask') {
        this.showPicker();
      } else {
        GameEngine.start(game, { difficulty: this.getDifficulty() });
      }
    });
  });
},
```

`showCategoryPicker` calls `GameEngine.start(this.selectedGame, { difficulty, category })`; `showPicker` calls `GameEngine.start(this.selectedGame, { difficulty, count: i })`.

Add the five domain labels to all five language blocks in `js/i18n/translations.js`:

```js
// en
domainNombres: 'Numbers and calculation',
domainMesures: 'Sizes and measures',
domainGeometrie: 'Space and geometry',
domainLogique: 'Logic',
domainMonde: 'The world',

// fr
domainNombres: 'Nombres et calculs',
domainMesures: 'Grandeurs et mesures',
domainGeometrie: 'Espace et géométrie',
domainLogique: 'Logique',
domainMonde: 'Découverte du monde',

// de
domainNombres: 'Zahlen und Rechnen',
domainMesures: 'Größen und Messen',
domainGeometrie: 'Raum und Geometrie',
domainLogique: 'Logik',
domainMonde: 'Die Welt',

// uk
domainNombres: 'Числа та обчислення',
domainMesures: 'Величини та вимірювання',
domainGeometrie: 'Простір і геометрія',
domainLogique: 'Логіка',
domainMonde: 'Пізнання світу',

// ru
domainNombres: 'Числа и вычисления',
domainMesures: 'Величины и измерения',
domainGeometrie: 'Пространство и геометрия',
domainLogique: 'Логика',
domainMonde: 'Познание мира',
```

Add to `css/game.css`:

```css
.game-group {
    margin-bottom: 1.5rem;
}

.game-group-title {
    font-size: 1rem;
    font-weight: 600;
    opacity: 0.7;
    margin: 0 0 0.5rem 0.25rem;
}

.game-group-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
}
```

Update `sw.js` paths and bump `CACHE_VERSION`.

> This task does not pass its tests until Tasks 10–18 create the ten game modules it imports. Implement it now, leave it red, and expect green at Task 18. This is the one deliberate exception to the red-green rule in this plan.

- [ ] **Step 4: Commit**

```bash
git add js/ css/game.css sw.js test/engine/registry.test.js
git commit -m "feat: add game registry grouped by CP domain"
```

---

### Task 10: Migrate dice_addition

Proves the default multiple-choice path and `rounds: 'ask'`.

**Files:**
- Create: `js/games/dice-addition.js`
- Create: `js/render/dice.js` (moved from `js/dice-renderer.js`)
- Delete: `js/dice-game.js`, `js/dice-renderer.js`
- Test: `test/games/dice-addition.test.js`

**Interfaces:**
- Consumes: `GameEngine` context shape (Task 8), `DiceRenderer` (Task 2).
- Produces: `DiceAdditionGame` with `id: 'dice_addition'`, `rounds: 'ask'`.

- [ ] **Step 1: Write the failing test**

Create `test/games/dice-addition.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DiceAdditionGame } from '../../js/games/dice-addition.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const LIMITS = { easy: 4, normal: 5, hard: 6 };

describe('DiceAdditionGame', () => {
  it('is registered for the numbers domain', () => {
    expect(DiceAdditionGame.id).toBe('dice_addition');
    expect(DiceAdditionGame.domain).toBe('nombres');
    expect(DiceAdditionGame.rounds).toBe('ask');
  });

  it('generates exactly the requested number of exercises', () => {
    expect(DiceAdditionGame.generate('easy', ctx(7))).toHaveLength(7);
  });

  for (const [difficulty, max] of Object.entries(LIMITS)) {
    it(`keeps operands within 1..${max} on ${difficulty}`, () => {
      for (const ex of DiceAdditionGame.generate(difficulty, ctx(10))) {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(max);
        expect(ex.operand2).toBeLessThanOrEqual(max);
      }
    });
  }

  it('always includes the correct answer among the choices', () => {
    for (const ex of DiceAdditionGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('sets correctAnswer to the sum of the operands', () => {
    for (const ex of DiceAdditionGame.generate('hard', ctx(10))) {
      expect(ex.correctAnswer).toBe(ex.operand1 + ex.operand2);
    }
  });

  it('never repeats a choice within an exercise', () => {
    for (const ex of DiceAdditionGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('offers five choices', () => {
    for (const ex of DiceAdditionGame.generate('easy', ctx(5))) {
      expect(ex.choices).toHaveLength(5);
    }
  });

  it('orders operands ascending on easy and normal', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of DiceAdditionGame.generate(difficulty, ctx(10))) {
        expect(ex.operand1).toBeLessThanOrEqual(ex.operand2);
      }
    }
  });

  it('sorts easy exercises by increasing sum', () => {
    const sums = DiceAdditionGame.generate('easy', ctx(8)).map(e => e.correctAnswer);
    expect([...sums]).toEqual([...sums].sort((a, b) => a - b));
  });

  it('renders both dice in the prompt', () => {
    const ex = DiceAdditionGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('<svg');
    expect(ex.promptHtml).toContain('dice-plus');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = DiceAdditionGame.generate('normal', ctx(5, seeded));
    const b = DiceAdditionGame.generate('normal', ctx(5, seeded));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
  });

  it('does not repeat an operand pair within a session', () => {
    const keys = DiceAdditionGame.generate('hard', ctx(10))
      .map(e => e.operand1 + ':' + e.operand2);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/dice-addition.test.js`
Expected: FAIL — cannot resolve `../../js/games/dice-addition.js`.

- [ ] **Step 3: Implement**

`git mv js/dice-renderer.js js/render/dice.js` (contents unchanged beyond the existing `export`).

Create `js/games/dice-addition.js`:

```js
import { DiceRenderer } from '../render/dice.js';

const MAX_OPERAND = { easy: 4, normal: 5, hard: 6 };
const MAX_SUM = { easy: 8, normal: 10, hard: 12 };
const CHOICE_COUNT = 5;

export const DiceAdditionGame = {
  id: 'dice_addition',
  nameKey: 'diceAddition',
  emoji: '🎲',
  domain: 'nombres',
  rounds: 'ask',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const maxOperand = MAX_OPERAND[difficulty];
    const ordered = difficulty !== 'hard';

    const used = new Set();
    const exercises = [];

    for (let i = 0; i < count; i++) {
      let op1, op2, key;
      let guard = 0;
      do {
        op1 = Math.floor(rng() * maxOperand) + 1;
        op2 = Math.floor(rng() * maxOperand) + 1;
        if (ordered && op1 > op2) [op1, op2] = [op2, op1];
        key = op1 + ':' + op2;
        guard++;
      } while (used.has(key) && guard < 200);

      used.add(key);
      exercises.push({ operand1: op1, operand2: op2, correctAnswer: op1 + op2 });
    }

    if (difficulty === 'easy') {
      exercises.sort((a, b) => a.correctAnswer - b.correctAnswer || a.operand1 - b.operand1);
    }

    return exercises.map(ex => ({
      ...ex,
      promptHtml:
        '<div class="dice-with-number">' + DiceRenderer.render(ex.operand1) +
          '<span class="dice-number">' + ex.operand1 + '</span></div>' +
        '<span class="dice-plus">+</span>' +
        '<div class="dice-with-number">' + DiceRenderer.render(ex.operand2) +
          '<span class="dice-number">' + ex.operand2 + '</span></div>',
      choices: buildChoices(ex.correctAnswer, MAX_SUM[difficulty], rng),
    }));
  },
};

function buildChoices(correct, maxSum, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (maxSum - 1)) + 2;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
```

Delete `js/dice-game.js`. Update `sw.js` paths and bump `CACHE_VERSION`.

> The `guard` counters matter: with a fixed-value rng (as the determinism test uses), the naive `do/while` loops never terminate. Without them the test suite hangs rather than fails.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/dice-addition.test.js`
Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/dice-addition.js js/render/dice.js sw.js test/games/dice-addition.test.js
git rm js/dice-game.js
git commit -m "refactor: migrate dice addition onto GameEngine"
```

---

### Task 11: Migrate count_objects

Proves `setup: 'category'` and `renderPrompt`.

**Files:**
- Create: `js/games/count-objects.js`
- Create: `js/games/object-categories.js`
- Delete: `js/count-objects-game.js`
- Test: `test/games/count-objects.test.js`

**Interfaces:**
- Consumes: engine `ctx.category` (Task 8).
- Produces: `CountObjectsGame` with `setup: 'category'`; `OBJECT_CATEGORIES` re-exported from `js/games/object-categories.js`.

- [ ] **Step 1: Write the failing test**

Create `test/games/count-objects.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { CountObjectsGame } from '../../js/games/count-objects.js';
import { OBJECT_CATEGORIES } from '../../js/games/object-categories.js';

function ctx(count, category = 'animals', rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category };
}

const RANGES = { easy: [1, 5], normal: [2, 7], hard: [5, 10] };

describe('CountObjectsGame', () => {
  it('declares a category pre-screen', () => {
    expect(CountObjectsGame.id).toBe('count_objects');
    expect(CountObjectsGame.setup).toBe('category');
    expect(CountObjectsGame.domain).toBe('nombres');
  });

  it('keeps the ten object categories', () => {
    expect(OBJECT_CATEGORIES).toHaveLength(10);
    expect(OBJECT_CATEGORIES.map(c => c.key)).toContain('animals');
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGES)) {
    it(`counts between ${min} and ${max} on ${difficulty}`, () => {
      for (const ex of CountObjectsGame.generate(difficulty, ctx(10))) {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(min);
        expect(ex.correctAnswer).toBeLessThanOrEqual(max);
      }
    });
  }

  it('generates the requested count', () => {
    expect(CountObjectsGame.generate('easy', ctx(6))).toHaveLength(6);
  });

  it('always includes the correct answer', () => {
    for (const ex of CountObjectsGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('draws emoji from the chosen category', () => {
    const food = OBJECT_CATEGORIES.find(c => c.key === 'food').emojis;
    for (const ex of CountObjectsGame.generate('easy', ctx(10, 'food'))) {
      expect(food).toContain(ex.emoji);
    }
  });

  it('never shows the same count twice in a row', () => {
    const counts = CountObjectsGame.generate('normal', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).not.toBe(counts[i - 1]);
    }
  });

  it('renders one positioned element per object', () => {
    const ex = CountObjectsGame.generate('easy', ctx(1))[0];
    const matches = ex.promptHtml.match(/class="count-object"/g);
    expect(matches).toHaveLength(ex.correctAnswer);
  });

  it('falls back to the first category when none is supplied', () => {
    const exercises = CountObjectsGame.generate('easy', { ...ctx(3), category: null });
    expect(exercises).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/count-objects.test.js`
Expected: FAIL — cannot resolve `../../js/games/count-objects.js`.

- [ ] **Step 3: Implement**

Move the `OBJECT_CATEGORIES` array verbatim from `js/count-objects-game.js` into `js/games/object-categories.js` as `export const OBJECT_CATEGORIES`.

Create `js/games/count-objects.js`, porting `generateExercises`, `generateChoices`, and `generatePositions` to take `rng` instead of `Math.random`, and returning `promptHtml` built from the positions:

```js
import { OBJECT_CATEGORIES } from './object-categories.js';

const RANGES = { easy: [1, 5], normal: [2, 7], hard: [5, 10] };
const CHOICE_COUNT = 5;
const MIN_DISTANCE = 18;

export const CountObjectsGame = {
  id: 'count_objects',
  nameKey: 'countObjects',
  emoji: '🔢',
  domain: 'nombres',
  rounds: { easy: 10, normal: 10, hard: 10 },
  setup: 'category',

  generate(difficulty, ctx) {
    const { rng, count, category } = ctx;
    const [min, max] = RANGES[difficulty];
    const selected = OBJECT_CATEGORIES.find(c => c.key === category) || OBJECT_CATEGORIES[0];
    const emojis = shuffle([...selected.emojis], rng);

    const exercises = [];
    let last = -1;

    for (let i = 0; i < count; i++) {
      let objectCount;
      let guard = 0;
      do {
        objectCount = Math.floor(rng() * (max - min + 1)) + min;
        guard++;
      } while (objectCount === last && max > min && guard < 200);
      last = objectCount;

      const emoji = emojis[i % emojis.length];
      exercises.push({
        correctAnswer: objectCount,
        emoji,
        promptHtml: renderField(objectCount, emoji, rng),
        choices: buildChoices(objectCount, min, max, rng),
      });
    }

    return exercises;
  },
};
```

Append the three module-local helpers:

```js
function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

function generatePositions(count, rng) {
  const positions = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x, y;
    do {
      x = 10 + rng() * 80;
      y = 10 + rng() * 80;
      attempts++;
    } while (attempts < 100 && positions.some(p =>
      Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < MIN_DISTANCE
    ));
    positions.push({ x, y });
  }

  return positions;
}

function renderField(count, emoji, rng) {
  return '<div class="objects-field">' +
    generatePositions(count, rng).map(pos =>
      '<span class="count-object" style="left:' + pos.x + '%;top:' + pos.y + '%">' +
        emoji +
      '</span>'
    ).join('') +
  '</div>';
}

function buildChoices(correct, min, max, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (max - min + 1)) + min;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  return shuffle(choices, rng);
}
```

Delete `js/count-objects-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

> `rounds` stays at 10 for every difficulty because that is what `count_objects` does today, and this checkpoint must not change behaviour. Difficulty varies the count range, not the number of exercises.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/count-objects.test.js`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/ sw.js test/games/count-objects.test.js
git rm js/count-objects-game.js
git commit -m "refactor: migrate count objects onto GameEngine"
```

---

### Task 12: Migrate dice_recognition

**Files:**
- Create: `js/games/dice-recognition.js`
- Delete: `js/dice-recognition-game.js`
- Test: `test/games/dice-recognition.test.js`

**Interfaces:**
- Consumes: `DiceRenderer` from `js/render/dice.js` (Task 10).
- Produces: `DiceRecognitionGame`, `layoutClass: 'dice-recognition-layout'`.

- [ ] **Step 1: Write the failing test**

Create `test/games/dice-recognition.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DiceRecognitionGame } from '../../js/games/dice-recognition.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const RANGES = { easy: [1, 4], normal: [1, 5], hard: [2, 6] };

describe('DiceRecognitionGame', () => {
  it('declares its layout class', () => {
    expect(DiceRecognitionGame.id).toBe('dice_recognition');
    expect(DiceRecognitionGame.layoutClass).toBe('dice-recognition-layout');
    expect(DiceRecognitionGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGES)) {
    it(`shows pips between ${min} and ${max} on ${difficulty}`, () => {
      for (const ex of DiceRecognitionGame.generate(difficulty, ctx(15))) {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(min);
        expect(ex.correctAnswer).toBeLessThanOrEqual(max);
      }
    });
  }

  it('generates the difficulty round count', () => {
    expect(DiceRecognitionGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('never repeats the same face consecutively', () => {
    const faces = DiceRecognitionGame.generate('normal', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < faces.length; i++) {
      expect(faces[i]).not.toBe(faces[i - 1]);
    }
  });

  it('renders a die as svg without a numeral', () => {
    const ex = DiceRecognitionGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('<svg');
    expect(ex.promptHtml).not.toContain('dice-number');
  });

  it('always includes the correct answer', () => {
    for (const ex of DiceRecognitionGame.generate('hard', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('offers unique choices within the valid face range', () => {
    for (const ex of DiceRecognitionGame.generate('hard', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
      for (const choice of ex.choices) {
        expect(choice).toBeGreaterThanOrEqual(1);
        expect(choice).toBeLessThanOrEqual(6);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/dice-recognition.test.js`
Expected: FAIL — cannot resolve `../../js/games/dice-recognition.js`.

- [ ] **Step 3: Implement**

Create `js/games/dice-recognition.js`:

```js
import { DiceRenderer } from '../render/dice.js';

const RANGES = { easy: [1, 4], normal: [1, 5], hard: [2, 6] };
const CHOICE_COUNT = 5;
const MAX_FACE = 6;

export const DiceRecognitionGame = {
  id: 'dice_recognition',
  nameKey: 'diceRecognition',
  emoji: '🎯',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'dice-recognition-layout',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const [min, max] = RANGES[difficulty];

    const exercises = [];
    let previous = null;

    for (let i = 0; i < count; i++) {
      let value;
      let guard = 0;
      do {
        value = Math.floor(rng() * (max - min + 1)) + min;
        guard++;
      } while (value === previous && max > min && guard < 200);
      previous = value;

      exercises.push({
        correctAnswer: value,
        promptHtml: DiceRenderer.render(value),
        choices: buildChoices(value, rng),
      });
    }

    return exercises;
  },
};

function buildChoices(correct, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * MAX_FACE) + 1;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
```

Delete `js/dice-recognition-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/dice-recognition.test.js`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/dice-recognition.js sw.js test/games/dice-recognition.test.js
git rm js/dice-recognition-game.js
git commit -m "refactor: migrate dice recognition onto GameEngine"
```

---

### Task 13: Migrate uno

First user of the `renderChoices` escape hatch.

**Files:**
- Create: `js/games/uno.js`
- Delete: `js/uno-game.js`
- Test: `test/games/uno.test.js`

**Interfaces:**
- Consumes: the `renderChoices(el, exercise, submit)` seam (Task 8).
- Produces: `UnoGame` with `domain: 'logique'`, `layoutClass: 'uno-game-body'`.

- [ ] **Step 1: Write the failing test**

Create `test/games/uno.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnoGame } from '../../js/games/uno.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('UnoGame', () => {
  it('sits in the logic domain', () => {
    expect(UnoGame.id).toBe('uno');
    expect(UnoGame.domain).toBe('logique');
    expect(UnoGame.layoutClass).toBe('uno-game-body');
  });

  it('generates the requested count', () => {
    expect(UnoGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('offers five cards per exercise', () => {
    for (const ex of UnoGame.generate('normal', ctx(10))) {
      expect(ex.choices).toHaveLength(5);
    }
  });

  it('includes exactly one card matching the main card', () => {
    for (const ex of UnoGame.generate('normal', ctx(10))) {
      const matches = ex.choices.filter(c =>
        c.value.color === ex.mainCard.color || c.value.number === ex.mainCard.number
      );
      expect(matches).toHaveLength(1);
    }
  });

  it('never offers the main card itself', () => {
    for (const ex of UnoGame.generate('hard', ctx(10))) {
      const same = ex.choices.filter(c =>
        c.value.color === ex.mainCard.color && c.value.number === ex.mainCard.number
      );
      expect(same).toHaveLength(0);
    }
  });

  it('renders choices as uno cards and wires the submit callback', () => {
    document.body.innerHTML = '<div id="choices"></div>';
    const el = document.getElementById('choices');
    const ex = UnoGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    UnoGame.renderChoices(el, ex, submit);

    const buttons = el.querySelectorAll('.uno-choice-btn');
    expect(buttons).toHaveLength(5);
    buttons[0].click();
    expect(submit).toHaveBeenCalledOnce();
  });

  it('submits the correct answer when the matching card is clicked', () => {
    document.body.innerHTML = '<div id="choices"></div>';
    const el = document.getElementById('choices');
    const ex = UnoGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    UnoGame.renderChoices(el, ex, submit);
    const index = ex.choices.findIndex(c => c.value === ex.correctAnswer);
    el.querySelectorAll('.uno-choice-btn')[index].click();

    expect(submit.mock.calls[0][0]).toBe(ex.correctAnswer);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/uno.test.js`
Expected: FAIL — cannot resolve `../../js/games/uno.js`.

- [ ] **Step 3: Implement**

Create `js/games/uno.js`. `UNO_COLORS`, `UNO_COLOR_VALUES`, `UNO_NUMBER_ANIMALS`, and `renderCard` move over verbatim from `js/uno-game.js`; only the randomness source changes.

```js
const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];

const UNO_COLOR_VALUES = {
  red: { bg: '#E53935', border: '#B71C1C', text: '#fff' },
  blue: { bg: '#1E88E5', border: '#0D47A1', text: '#fff' },
  green: { bg: '#43A047', border: '#1B5E20', text: '#fff' },
  yellow: { bg: '#FDD835', border: '#F9A825', text: '#333' },
};

const UNO_NUMBER_ANIMALS = {
  0: '🦁', 1: '🐘', 2: '🐬', 3: '🦒', 4: '🐻',
  5: '🐨', 6: '🦊', 7: '🐰', 8: '🐼', 9: '🐵',
};

const CHOICE_COUNT = 5;

export const UnoGame = {
  id: 'uno',
  nameKey: 'uno',
  emoji: '🃏',
  domain: 'logique',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'uno-game-body',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const deck = buildDeck();

    return Array.from({ length: count }, () => buildExercise(deck, rng));
  },

  renderChoices(el, exercise, submit) {
    el.innerHTML = exercise.choices.map((choice, idx) =>
      '<button class="uno-choice-btn" data-index="' + idx + '">' + choice.html + '</button>'
    ).join('');

    el.querySelectorAll('.uno-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        submit(exercise.choices[Number(btn.dataset.index)].value, btn);
      });
    });
  },
};

function buildDeck() {
  const cards = [];
  for (const color of UNO_COLORS) {
    for (let number = 0; number <= 9; number++) {
      cards.push({ color, number, animal: UNO_NUMBER_ANIMALS[number] });
    }
  }

  return cards;
}

function buildExercise(deck, rng) {
  const mainCard = deck[Math.floor(rng() * deck.length)];
  const matchOnNumber = rng() < 0.5;

  let correctCard;
  if (matchOnNumber) {
    const others = UNO_COLORS.filter(c => c !== mainCard.color);
    const color = others[Math.floor(rng() * others.length)];
    correctCard = { color, number: mainCard.number, animal: mainCard.animal };
  } else {
    let number;
    let guard = 0;
    do {
      number = Math.floor(rng() * 10);
      guard++;
    } while (number === mainCard.number && guard < 200);
    correctCard = { color: mainCard.color, number, animal: UNO_NUMBER_ANIMALS[number] };
  }

  const cards = [correctCard];
  const used = new Set([
    mainCard.color + ':' + mainCard.number,
    correctCard.color + ':' + correctCard.number,
  ]);

  let guard = 0;
  while (cards.length < CHOICE_COUNT && guard < 500) {
    guard++;
    const color = UNO_COLORS[Math.floor(rng() * UNO_COLORS.length)];
    const number = Math.floor(rng() * 10);
    if (color === mainCard.color || number === mainCard.number) continue;

    const key = color + ':' + number;
    if (used.has(key)) continue;
    used.add(key);
    cards.push({ color, number, animal: UNO_NUMBER_ANIMALS[number] });
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return {
    mainCard,
    promptHtml: renderCard(mainCard, 'main'),
    choices: cards.map(card => ({ html: renderCard(card, 'small'), value: card })),
    correctAnswer: correctCard,
  };
}

function renderCard(card, size) {
  const cv = UNO_COLOR_VALUES[card.color];
  const cls = size === 'small' ? 'uno-card uno-card-small' : 'uno-card uno-card-main';

  return '<div class="' + cls + '" style="background:' + cv.bg +
      ';border-color:' + cv.border + ';color:' + cv.text + '">' +
    '<span class="uno-card-corner uno-card-corner-tl">' + card.number + '</span>' +
    '<span class="uno-card-animal">' + card.animal + '</span>' +
    '<span class="uno-card-corner uno-card-corner-br">' + card.number + '</span>' +
  '</div>';
}
```

> `correctAnswer` is the same object reference stored in `choices`, so the engine's `value === exercise.correctAnswer` identity check works. Do not clone the card into the choice list.

Delete `js/uno-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/uno.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/uno.js sw.js test/games/uno.test.js
git rm js/uno-game.js
git commit -m "refactor: migrate uno onto GameEngine"
```

---

### Task 14: Migrate countries and capitals

The two geography games. Proves `choiceClass` on a real game.

**Files:**
- Create: `js/games/countries.js`, `js/games/capitals.js`
- Create: `js/data/countries.js` (moved from `js/countries-data.js`)
- Delete: `js/countries-game.js`, `js/capitals-game.js`, `js/countries-data.js`
- Test: `test/games/countries.test.js`, `test/games/capitals.test.js`

**Interfaces:**
- Consumes: `getCountryPool`, `getCountryName` (Task 2).
- Produces: `CountriesGame`, `CapitalsGame`, both `domain: 'monde'`, `layoutClass: 'geo-game-layout'`.

- [ ] **Step 1: Write the failing test**

Create `test/games/countries.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { CountriesGame } from '../../js/games/countries.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('CountriesGame', () => {
  it('sits in the world domain with the geo layout', () => {
    expect(CountriesGame.id).toBe('countries');
    expect(CountriesGame.domain).toBe('monde');
    expect(CountriesGame.layoutClass).toBe('geo-game-layout');
  });

  it('generates the requested count', () => {
    expect(CountriesGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('shows a flag image in the prompt', () => {
    const ex = CountriesGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('/flags/');
  });

  it('always includes the correct country name', () => {
    for (const ex of CountriesGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('offers unique choices', () => {
    for (const ex of CountriesGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('does not repeat a country within a session', () => {
    const names = CountriesGame.generate('hard', ctx(15)).map(e => e.correctAnswer);
    expect(new Set(names).size).toBe(names.length);
  });

  it('widens the country pool as difficulty rises', () => {
    const easy = new Set(CountriesGame.generate('easy', ctx(20)).map(e => e.correctAnswer));
    const hard = new Set(CountriesGame.generate('hard', ctx(20)).map(e => e.correctAnswer));
    expect(hard.size).toBeGreaterThanOrEqual(easy.size);
  });
});
```

Create `test/games/capitals.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { CapitalsGame } from '../../js/games/capitals.js';
import { getCountryPool, getCapitalName } from '../../js/data/countries.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('CapitalsGame', () => {
  it('sits in the world domain with the geo layout', () => {
    expect(CapitalsGame.id).toBe('capitals');
    expect(CapitalsGame.domain).toBe('monde');
    expect(CapitalsGame.layoutClass).toBe('geo-game-layout');
  });

  it('generates the requested count', () => {
    expect(CapitalsGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('shows the flag and the country name in the prompt', () => {
    const ex = CapitalsGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('/flags/');
    expect(ex.promptHtml).toContain('geo-country-name');
  });

  it('offers capital cities, not country names, as choices', () => {
    const capitals = getCountryPool('easy').map(c => getCapitalName(c, 'fr'));
    for (const ex of CapitalsGame.generate('easy', ctx(10))) {
      for (const choice of ex.choices) {
        expect(capitals).toContain(choice);
      }
    }
  });

  it('always includes the correct capital', () => {
    for (const ex of CapitalsGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('offers unique choices', () => {
    for (const ex of CapitalsGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('does not repeat a country within a session', () => {
    const names = CapitalsGame.generate('hard', ctx(15)).map(e => e.correctAnswer);
    expect(new Set(names).size).toBe(names.length);
  });

  it('resolves names in the language from the context, not from storage', () => {
    localStorage.setItem('game_language', 'ru');
    const french = CapitalsGame.generate('easy', ctx(5))[0];
    expect(typeof french.correctAnswer).toBe('string');
    localStorage.clear();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/countries.test.js test/games/capitals.test.js`
Expected: FAIL — cannot resolve `../../js/games/countries.js`.

- [ ] **Step 3: Implement**

`git mv js/countries-data.js js/data/countries.js`.

In `js/data/countries.js`, change the two name helpers to take the language as a parameter instead of reading `I18n` from module scope, and drop the now-unused `I18n` import:

```js
export function getCountryName(country, lang) {
  return (lang !== 'en' && country.t && country.t[lang] && country.t[lang].name) || country.name;
}

export function getCapitalName(country, lang) {
  return (lang !== 'en' && country.t && country.t[lang] && country.t[lang].capital) || country.capital;
}
```

Create `js/games/countries.js`:

```js
import { getCountryPool, getCountryName } from '../data/countries.js';

const CHOICE_COUNT = 5;

export const CountriesGame = {
  id: 'countries',
  nameKey: 'countries',
  emoji: '🌍',
  domain: 'monde',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'geo-game-layout',
  choiceClass: 'geo-choice-btn',

  generate(difficulty, ctx) {
    const { rng, count, lang } = ctx;
    const pool = getCountryPool(difficulty);

    return pickCountries(pool, count, rng).map(country => ({
      country,
      promptHtml: '<img src="/flags/' + country.flag + '.svg" class="geo-flag" alt="">',
      correctAnswer: getCountryName(country, lang),
      choices: buildChoices(country, pool, rng, c => getCountryName(c, lang)),
    }));
  },
};

export function pickCountries(pool, count, rng) {
  const chosen = [];
  const used = new Set();
  let guard = 0;

  while (chosen.length < count && guard < pool.length * 20) {
    guard++;
    const idx = Math.floor(rng() * pool.length);
    if (used.has(idx) && used.size < pool.length) continue;
    used.add(idx);
    chosen.push(pool[idx]);
  }

  return chosen;
}

export function buildChoices(correctCountry, pool, rng, nameOf) {
  const choices = [nameOf(correctCountry)];
  const others = pool.filter(c => c.name !== correctCountry.name);

  while (choices.length < CHOICE_COUNT && others.length > 0) {
    const idx = Math.floor(rng() * others.length);
    const name = nameOf(others[idx]);
    if (!choices.includes(name)) choices.push(name);
    others.splice(idx, 1);
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
```

Create `js/games/capitals.js`, reusing those two helpers:

```js
import { getCountryPool, getCountryName, getCapitalName } from '../data/countries.js';
import { pickCountries, buildChoices } from './countries.js';

export const CapitalsGame = {
  id: 'capitals',
  nameKey: 'capitals',
  emoji: '🏛️',
  domain: 'monde',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'geo-game-layout',
  choiceClass: 'geo-choice-btn',

  generate(difficulty, ctx) {
    const { rng, count, lang } = ctx;
    const pool = getCountryPool(difficulty);

    return pickCountries(pool, count, rng).map(country => ({
      country,
      promptHtml:
        '<img src="/flags/' + country.flag + '.svg" class="geo-flag" alt="">' +
        '<div class="geo-country-name">' + getCountryName(country, lang) + '</div>',
      correctAnswer: getCapitalName(country, lang),
      choices: buildChoices(country, pool, rng, c => getCapitalName(c, lang)),
    }));
  },
};
```

> The old `do/while` on a `used` set could spin forever once every index was taken. `pickCountries` bounds it and returns fewer than `count` rather than hanging — which is why the "does not repeat a country" test asks for 15 from pools that always hold more.

Delete `js/countries-game.js` and `js/capitals-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run the game suites**

Run: `npx vitest run test/games/`
Expected: PASS. `test/engine/registry.test.js` stays red until Task 18 — four game modules are still missing.

- [ ] **Step 5: Commit**

```bash
git add js/games/ js/data/ sw.js test/games/
git rm js/countries-game.js js/capitals-game.js
git commit -m "refactor: migrate countries and capitals onto GameEngine"
```

---

### Task 15: Migrate guess_time

Proves `bodyClass` and `choiceClass`. Extracts the reusable `ClockRenderer`.

**Files:**
- Create: `js/games/guess-time.js`
- Create: `js/render/clock.js` (the `ClockRenderer` object from `js/guess-time-game.js:1-60`)
- Delete: `js/guess-time-game.js`
- Test: `test/games/guess-time.test.js`

**Interfaces:**
- Consumes: `bodyClass`, `choiceClass` (Task 8).
- Produces: `GuessTimeGame`, `ClockRenderer.render(hour, minute, size)`.

- [ ] **Step 1: Write the failing test**

Create `test/games/guess-time.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { GuessTimeGame } from '../../js/games/guess-time.js';
import { ClockRenderer } from '../../js/render/clock.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('ClockRenderer', () => {
  it('renders an svg clock face', () => {
    const svg = ClockRenderer.render(3, 30);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<text');
  });
});

describe('GuessTimeGame', () => {
  it('sits in the measures domain', () => {
    expect(GuessTimeGame.id).toBe('guess_time');
    expect(GuessTimeGame.domain).toBe('mesures');
    expect(GuessTimeGame.layoutClass).toBe('time-game-layout');
    expect(GuessTimeGame.choiceClass).toBe('time-choice-btn');
  });

  it('uses whole hours only on easy', () => {
    for (const ex of GuessTimeGame.generate('easy', ctx(15))) {
      expect(ex.time.minute).toBe(0);
      expect(ex.time.hour).toBeGreaterThanOrEqual(1);
      expect(ex.time.hour).toBeLessThanOrEqual(12);
    }
  });

  it('uses half hours on normal', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(20))) {
      expect([0, 30]).toContain(ex.time.minute);
    }
  });

  it('uses quarter hours on hard', () => {
    for (const ex of GuessTimeGame.generate('hard', ctx(20))) {
      expect([0, 15, 30, 45]).toContain(ex.time.minute);
    }
  });

  it('formats the answer as zero-padded HH:MM', () => {
    for (const ex of GuessTimeGame.generate('hard', ctx(10))) {
      expect(ex.correctAnswer).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('offers four unique choices including the answer', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(10))) {
      expect(ex.choices).toHaveLength(4);
      expect(new Set(ex.choices).size).toBe(4);
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('never repeats a time consecutively', () => {
    const times = GuessTimeGame.generate('hard', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).not.toBe(times[i - 1]);
    }
  });

  it('sets a day or night bodyClass above easy', () => {
    for (const ex of GuessTimeGame.generate('normal', ctx(10))) {
      expect(['time-theme-day', 'time-theme-night']).toContain(ex.bodyClass);
      const expected = ex.time.hour >= 6 && ex.time.hour < 18 ? 'day' : 'night';
      expect(ex.bodyClass).toBe('time-theme-' + expected);
    }
  });

  it('sets no bodyClass on easy', () => {
    for (const ex of GuessTimeGame.generate('easy', ctx(10))) {
      expect(ex.bodyClass).toBeNull();
    }
  });

  it('shows a sun or moon above easy but not on easy', () => {
    expect(GuessTimeGame.generate('normal', ctx(1))[0].promptHtml).toContain('time-daynight');
    expect(GuessTimeGame.generate('easy', ctx(1))[0].promptHtml).not.toContain('time-daynight');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/guess-time.test.js`
Expected: FAIL — cannot resolve `../../js/games/guess-time.js`.

- [ ] **Step 3: Implement**

Move the `ClockRenderer` object from `js/guess-time-game.js:1-60` into `js/render/clock.js` unchanged, as `export const ClockRenderer`.

Create `js/games/guess-time.js`:

```js
import { ClockRenderer } from '../render/clock.js';

const CHOICE_COUNT = 4;
const MINUTES = { normal: [0, 30], hard: [0, 15, 30, 45] };

export const GuessTimeGame = {
  id: 'guess_time',
  nameKey: 'guessTime',
  emoji: '🕐',
  domain: 'mesures',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'time-game-layout',
  choiceClass: 'time-choice-btn',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const exercises = [];
    let previous = null;

    for (let i = 0; i < count; i++) {
      let time, formatted;
      let guard = 0;
      do {
        time = randomTime(difficulty, rng);
        formatted = formatTime(time);
        guard++;
      } while (formatted === previous && guard < 200);
      previous = formatted;

      const themed = difficulty !== 'easy';
      const day = isDaytime(time);

      exercises.push({
        time,
        correctAnswer: formatted,
        bodyClass: themed ? (day ? 'time-theme-day' : 'time-theme-night') : null,
        promptHtml:
          (themed ? '<div class="time-daynight">' + (day ? '☀️' : '🌙') + '</div>' : '') +
          ClockRenderer.render(time.hour, time.minute),
        choices: buildChoices(formatted, difficulty, rng),
      });
    }

    return exercises;
  },
};

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatTime(t) {
  return pad2(t.hour) + ':' + pad2(t.minute);
}

function isDaytime(t) {
  return t.hour >= 6 && t.hour < 18;
}

function randomTime(difficulty, rng) {
  if (difficulty === 'easy') {
    return { hour: Math.floor(rng() * 12) + 1, minute: 0 };
  }

  const minutes = MINUTES[difficulty];

  return {
    hour: Math.floor(rng() * 24),
    minute: minutes[Math.floor(rng() * minutes.length)],
  };
}

function buildChoices(correct, difficulty, rng) {
  const seen = new Set([correct]);
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 500) {
    guard++;
    const candidate = formatTime(randomTime(difficulty, rng));
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    choices.push(candidate);
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
```

Delete `js/guess-time-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

> `bodyClass` is `null` rather than absent on easy so the engine clears any theme left by a previous game.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/guess-time.test.js`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/guess-time.js js/render/clock.js sw.js test/games/guess-time.test.js
git rm js/guess-time-game.js
git commit -m "refactor: migrate guess time onto GameEngine"
```

---

### Task 16: Migrate chess

Proves `isCorrect`, `correctClass`, and `submit` inside `renderPrompt`.

**Files:**
- Create: `js/games/chess.js`
- Delete: `js/chess-game.js`
- Test: `test/games/chess.test.js`

**Interfaces:**
- Consumes: `isCorrect`, `correctClass`, `renderPrompt(el, ex, submit)` (Task 8).
- Produces: `ChessGame`, and `ChessMoves.targets(piece, r, c)` re-exported for tests.

- [ ] **Step 1: Write the failing test**

Create `test/games/chess.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { ChessGame, ChessMoves, CHESS_SIZE } from '../../js/games/chess.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('ChessMoves', () => {
  it('gives a rook a full rank and file from a corner', () => {
    expect(ChessMoves.targets('rook', 0, 0)).toHaveLength((CHESS_SIZE - 1) * 2);
  });

  it('gives a knight two moves from a corner', () => {
    expect(ChessMoves.targets('knight', 0, 0)).toHaveLength(2);
  });
});

describe('ChessGame', () => {
  it('sits in the logic domain with its own correct class', () => {
    expect(ChessGame.id).toBe('chess');
    expect(ChessGame.domain).toBe('logique');
    expect(ChessGame.layoutClass).toBe('chess-game-layout');
    expect(ChessGame.correctClass).toBe('chess-correct');
  });

  it('generates the difficulty round count', () => {
    expect(ChessGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('never generates a piece with no legal move', () => {
    for (const ex of ChessGame.generate('hard', ctx(20))) {
      expect(ex.targets.length).toBeGreaterThan(0);
    }
  });

  it('keeps every target on the board', () => {
    for (const ex of ChessGame.generate('hard', ctx(20))) {
      for (const target of ex.targets) {
        const [r, c] = target.split(',').map(Number);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(CHESS_SIZE);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(CHESS_SIZE);
      }
    }
  });

  it('never repeats the same piece and square consecutively', () => {
    const keys = ChessGame.generate('hard', ctx(20)).map(e => e.piece + e.row + e.col);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).not.toBe(keys[i - 1]);
    }
  });

  it('accepts any legal target and rejects the rest', () => {
    const ex = ChessGame.generate('easy', ctx(1))[0];
    expect(ChessGame.isCorrect(ex.targets[0], ex)).toBe(true);
    expect(ChessGame.isCorrect(ex.row + ',' + ex.col, ex)).toBe(false);
  });

  it('renders a full board and wires submit on every cell', () => {
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    ChessGame.renderPrompt(el, ex, submit);

    const cells = el.querySelectorAll('.chess-cell');
    expect(cells).toHaveLength(CHESS_SIZE * CHESS_SIZE);
    expect(el.querySelectorAll('.chess-piece')).toHaveLength(1);

    el.querySelector('[data-cell="' + ex.targets[0] + '"]').click();
    expect(submit).toHaveBeenCalledWith(ex.targets[0], expect.anything());
  });

  it('leaves the choices container empty', () => {
    document.body.innerHTML = '<div id="choices">stale</div>';
    const el = document.getElementById('choices');
    ChessGame.renderChoices(el, ChessGame.generate('easy', ctx(1))[0], vi.fn());
    expect(el.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/chess.test.js`
Expected: FAIL — cannot resolve `../../js/games/chess.js`.

- [ ] **Step 3: Implement**

Create `js/games/chess.js`. Port `CHESS_SIZE`, `CHESS_PIECES`, `CHESS_PIECE_KEYS`, and the entire `ChessMoves` object from `js/chess-game.js:1-58` **unchanged**, adding `export` to each. Then:

```js
import { I18n } from '../i18n/i18n.js';

export const ChessGame = {
  id: 'chess',
  nameKey: 'chess',
  emoji: '♟️',
  domain: 'logique',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'chess-game-layout',
  correctClass: 'chess-correct',

  isCorrect(value, exercise) {
    return exercise.targets.includes(value);
  },

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const exercises = [];
    let previousKey = null;

    for (let i = 0; i < count; i++) {
      let piece, row, col, targets, key;
      let guard = 0;
      do {
        guard++;
        piece = CHESS_PIECE_KEYS[Math.floor(rng() * CHESS_PIECE_KEYS.length)];
        row = Math.floor(rng() * CHESS_SIZE);
        col = Math.floor(rng() * CHESS_SIZE);
        targets = ChessMoves.targets(piece, row, col);
        key = piece + row + col;
      } while ((targets.length === 0 || key === previousKey) && guard < 500);
      previousKey = key;

      exercises.push({
        piece,
        row,
        col,
        targets: targets.map(t => t.r + ',' + t.c),
      });
    }

    return exercises;
  },

  renderPrompt(el, exercise, submit) {
    let cells = '';
    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const dark = (r + c) % 2 === 1;
        const isPiece = r === exercise.row && c === exercise.col;
        cells += '<button class="chess-cell ' + (dark ? 'chess-dark' : 'chess-light') +
          (isPiece ? ' chess-piece-cell' : '') + '" data-cell="' + r + ',' + c + '">' +
          (isPiece ? '<span class="chess-piece">' + CHESS_PIECES[exercise.piece] + '</span>' : '') +
        '</button>';
      }
    }

    el.innerHTML =
      '<div class="chess-caption">' + I18n.t('chessPrompt') + '</div>' +
      '<div class="chess-board">' + cells + '</div>';

    el.querySelectorAll('.chess-cell').forEach(btn => {
      btn.addEventListener('click', () => submit(btn.dataset.cell, btn));
    });
  },

  renderChoices(el) {
    el.innerHTML = '';
  },
};
```

Delete `js/chess-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

> Chess is the only game that sets no `correctAnswer`. Its `isCorrect` consults
> `targets`, which is why the engine must not assume `correctAnswer` exists.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/chess.test.js`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add js/games/chess.js sw.js test/games/chess.test.js
git rm js/chess-game.js
git commit -m "refactor: migrate chess onto GameEngine"
```

---

### Task 17: Migrate memory

The most stateful migration. The board, the memorise timers, and `peek` all live inside `renderPrompt`; the engine sees one exercise per board.

**Files:**
- Create: `js/games/memory.js`
- Delete: `js/memory-game.js`
- Test: `test/games/memory.test.js`

**Interfaces:**
- Consumes: `renderPrompt(el, ex, submit)`, `isCorrect` (Task 8).
- Produces: `MemoryGame`.

- [ ] **Step 1: Write the failing test**

Create `test/games/memory.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { MemoryGame } from '../../js/games/memory.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('MemoryGame', () => {
  it('sits in the logic domain', () => {
    expect(MemoryGame.id).toBe('memory');
    expect(MemoryGame.domain).toBe('logique');
  });

  it('generates one board per round', () => {
    expect(MemoryGame.generate('easy', ctx(4))).toHaveLength(4);
  });

  it('gives every board an even number of tiles', () => {
    for (const ex of MemoryGame.generate('normal', ctx(5))) {
      expect(ex.board.length % 2).toBe(0);
    }
  });

  it('pairs every colour exactly twice on a board', () => {
    for (const ex of MemoryGame.generate('normal', ctx(5))) {
      const counts = {};
      for (const tile of ex.board) {
        counts[tile] = (counts[tile] || 0) + 1;
      }
      for (const colour of Object.keys(counts)) {
        expect(counts[colour]).toBe(2);
      }
    }
  });

  it('grows the board with difficulty', () => {
    const easy = MemoryGame.generate('easy', ctx(1))[0].board.length;
    const hard = MemoryGame.generate('hard', ctx(1))[0].board.length;
    expect(hard).toBeGreaterThan(easy);
  });

  it('treats a solved board as the correct answer', () => {
    const ex = MemoryGame.generate('easy', ctx(1))[0];
    expect(MemoryGame.isCorrect('solved', ex)).toBe(true);
    expect(MemoryGame.isCorrect('wrong-tile', ex)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/memory.test.js`
Expected: FAIL — cannot resolve `../../js/games/memory.js`.

- [ ] **Step 3: Implement**

Create `js/games/memory.js`. `generate` becomes pure — it produces the board only, using `ctx.rng` in place of `Math.random` in the existing `pickColors` and `generateBoard` (`js/memory-game.js:47-75`):

```js
export const MemoryGame = {
  id: 'memory',
  nameKey: 'memory',
  emoji: '🧠',
  domain: 'logique',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'memory-game-layout',

  isCorrect(value) {
    return value === 'solved';
  },

  generate(difficulty, ctx) {
    const { rng, count } = ctx;

    return Array.from({ length: count }, () => ({
      board: generateBoard(difficulty, rng),
    }));
  },

  renderPrompt(el, exercise, submit) {
    startRound(el, exercise, submit);
  },

  renderChoices(el) {
    el.innerHTML = '';
  },
};
```

Port `pickColors`, `generateBoard`, `startMemorize`, `hideBoard`, `tileClick`, `solveTile`, `renderMemorizeStatus`, `renderPeekButton`, `peek`, and `clearTimers` from `js/memory-game.js` into module-local functions, threaded through a single `startRound(el, exercise, submit)` that owns the round's mutable state in a closure. Two rules for the port:

- A wrong tile tap calls `submit('wrong-tile', btn)`, so the engine counts it in `wrongAttempts` and applies `.wrong` exactly as before.
- The last matched pair calls `submit('solved', null)`, which advances the engine to the next board.

`clearTimers` must run before `submit('solved', null)` so a pending memorise timer cannot fire against a torn-down board.

Delete `js/memory-game.js`. Update `sw.js` and bump `CACHE_VERSION`.

> If threading the timers through the closure turns out to fight the engine,
> stop and mark `MemoryGame` with `legacy: true` instead — the spec permits this
> fallback explicitly. Do not add lifecycle hooks to the engine for one game.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/games/memory.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Verify in a browser**

Run: `python3 -m http.server 8000` and play Memory at each difficulty. Confirm the memorise phase counts down, tiles hide, matches stick, wrong taps shake and count, `peek` works, and the round advances on solve.

- [ ] **Step 6: Commit**

```bash
git add js/games/memory.js sw.js test/games/memory.test.js
git rm js/memory-game.js
git commit -m "refactor: migrate memory onto GameEngine"
```

---

### Task 18: Wrap double_crash as a legacy registry entry

`double_crash` is 1046 lines with no exercises, no difficulty, no wrong-attempt count, and no celebration. It keeps its own loop; only its registration changes.

**Files:**
- Create: `js/games/double-crash.js` (moved from `js/double-crash-game.js`)
- Delete: `js/double-crash-game.js`
- Test: `test/games/double-crash.test.js`

**Interfaces:**
- Consumes: the `legacy` field honoured by `GameList.load()` (Task 9).
- Produces: `DoubleCrashGame` with `legacy: true` and its existing `start()`.

- [ ] **Step 1: Write the failing test**

Create `test/games/double-crash.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DoubleCrashGame } from '../../js/games/double-crash.js';

describe('DoubleCrashGame', () => {
  it('is registered as a legacy game', () => {
    expect(DoubleCrashGame.id).toBe('double_crash');
    expect(DoubleCrashGame.legacy).toBe(true);
    expect(DoubleCrashGame.domain).toBe('logique');
  });

  it('supplies its own start, not a generate', () => {
    expect(typeof DoubleCrashGame.start).toBe('function');
    expect(DoubleCrashGame.generate).toBeUndefined();
  });

  it('keeps the card metadata the game list needs', () => {
    expect(DoubleCrashGame.nameKey).toBe('doubleCrash');
    expect(DoubleCrashGame.emoji).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/games/double-crash.test.js`
Expected: FAIL — cannot resolve `../../js/games/double-crash.js`.

- [ ] **Step 3: Implement**

`git mv js/double-crash-game.js js/games/double-crash.js`. Add `export` to the object, fix its relative imports (`../i18n/i18n.js`, `../sound.js`, `../engine/screens.js` in place of `App.showScreen`), and add the four registry fields at the top of the object:

```js
export const DoubleCrashGame = {
  id: 'double_crash',
  nameKey: 'doubleCrash',
  emoji: '🎡',
  domain: 'logique',
  legacy: true,

  // ...the existing 1046 lines, unchanged apart from imports
};
```

Its internal logic is not touched. Update `sw.js` and bump `CACHE_VERSION`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — `test/engine/registry.test.js`, red since Task 9, is now green because all ten game modules exist.

- [ ] **Step 5: Commit**

```bash
git add js/games/double-crash.js sw.js test/games/double-crash.test.js
git rm js/double-crash-game.js
git commit -m "refactor: register double crash as a legacy game"
```

---

### Task 19: Remove dead auth code

**Files:**
- Modify: `index.html:19-26` — remove `auth-container` markup
- Modify: `js/i18n/translations.js` — remove nine orphan keys from all five blocks
- Test: `test/i18n/no-dead-keys.test.js`

**Interfaces:**
- Consumes: `TRANSLATIONS` (Task 3).
- Produces: nothing — removal only.

- [ ] **Step 1: Write the failing test**

Create `test/i18n/no-dead-keys.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '../../js/i18n/translations.js';

const REMOVED = [
  'username', 'password', 'login', 'register', 'logout',
  'enterCredentials', 'offlineLogin', 'offlineRegister',
  'pendingResults', 'resultsSynced',
];

describe('translations', () => {
  it('no longer carries auth keys', () => {
    for (const lang of Object.keys(TRANSLATIONS)) {
      for (const key of REMOVED) {
        expect(TRANSLATIONS[lang]).not.toHaveProperty(key);
      }
    }
  });

  it('keeps every language at an identical key set', () => {
    const reference = Object.keys(TRANSLATIONS.en).sort();
    for (const lang of Object.keys(TRANSLATIONS)) {
      expect(Object.keys(TRANSLATIONS[lang]).sort()).toEqual(reference);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/i18n/no-dead-keys.test.js`
Expected: FAIL — `expected object not to have property "username"`.

- [ ] **Step 3: Implement**

Delete the ten keys from all five blocks in `js/i18n/translations.js`. In `index.html`, replace the loading screen's `auth-container` wrapper with a plain `<div class="loading-container">`, keeping the title and spinner.

The second test also catches any key present in one language but missing in another — fix any it surfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html js/i18n/translations.js test/i18n/no-dead-keys.test.js
git commit -m "chore: remove dead auth markup and translation keys"
```

---

### Task 20: Generate the service worker asset list

**Files:**
- Create: `tools/build-sw.js`
- Create: `sw-template.js`
- Modify: `sw.js` — now generated
- Test: `test/tools/build-sw.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildAssetList(rootDir)`, `buildServiceWorker(rootDir, version)`, and `npm run build:sw`.

- [ ] **Step 1: Write the failing test**

Create `test/tools/build-sw.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildAssetList } from '../../tools/build-sw.js';

const assets = buildAssetList(process.cwd());

describe('buildAssetList', () => {
  it('includes the app shell', () => {
    expect(assets).toContain('/');
    expect(assets).toContain('/index.html');
    expect(assets).toContain('/manifest.json');
  });

  it('includes every js module', () => {
    expect(assets).toContain('/js/app.js');
    expect(assets).toContain('/js/engine/game-engine.js');
    expect(assets).toContain('/js/games/dice-addition.js');
  });

  it('includes stylesheets and icons', () => {
    expect(assets).toContain('/css/game.css');
    expect(assets).toContain('/images/icon-192.png');
  });

  it('includes every flag svg', () => {
    expect(assets.filter(a => a.startsWith('/flags/')).length).toBeGreaterThan(150);
  });

  it('excludes test and tooling files', () => {
    expect(assets.some(a => a.includes('node_modules'))).toBe(false);
    expect(assets.some(a => a.startsWith('/test/'))).toBe(false);
    expect(assets.some(a => a.startsWith('/tools/'))).toBe(false);
  });

  it('has no duplicates', () => {
    expect(new Set(assets).size).toBe(assets.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/tools/build-sw.test.js`
Expected: FAIL — cannot resolve `../../tools/build-sw.js`.

- [ ] **Step 3: Implement**

Create `sw-template.js`:

```js
const CACHE_VERSION = '__CACHE_VERSION__';
const CACHE_NAME = `sumhero-v${CACHE_VERSION}`;

const ASSETS = __ASSETS__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Create `tools/build-sw.js`:

```js
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSET_DIRS = ['js', 'css', 'images', 'flags'];
const SHELL = ['/', '/index.html', '/manifest.json'];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }

  return acc;
}

export function buildAssetList(rootDir) {
  const files = ASSET_DIRS.flatMap(dir => {
    try {
      return walk(join(rootDir, dir));
    } catch (e) {
      return [];
    }
  });

  const paths = files.map(f => '/' + relative(rootDir, f).split(sep).join('/'));

  return [...new Set([...SHELL, ...paths])];
}

export function buildServiceWorker(rootDir, version) {
  const template = readFileSync(join(rootDir, 'sw-template.js'), 'utf8');
  const assets = buildAssetList(rootDir);

  return template
    .replace('__CACHE_VERSION__', version)
    .replace('__ASSETS__', JSON.stringify(assets, null, 4));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.cwd();
  const version = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '01';
  writeFileSync(join(root, 'sw.js'), buildServiceWorker(root, version));
  console.log(`sw.js written with ${buildAssetList(root).length} assets at v${version}`);
}
```

> `ASSET_DIRS` is an allowlist, not a denylist. That is deliberate — a denylist silently starts caching `node_modules` the moment someone adds a directory, and the failure only shows up as a multi-megabyte install on a phone.

Then run: `npm run build:sw`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — every suite.

- [ ] **Step 5: Verify the whole app in a browser**

Run: `python3 -m http.server 8000`

Play one full round of all six games at each difficulty. Confirm: the game list shows three domain groups; dice addition still asks how many exercises; count objects still asks for a category; uno cards and country flags render; every game reaches the celebration screen; the console is clean. Then open DevTools → Application → Service Worker, tick "Offline", reload, and confirm the app still loads and plays.

- [ ] **Step 6: Commit**

```bash
git add tools/ sw-template.js sw.js test/tools/
git commit -m "build: generate service worker asset list"
```

---

---

### Task 21: Rewrite CLAUDE.md for the new architecture

The repository's `CLAUDE.md` documents the architecture this checkpoint replaces. Leaving it stale would send the next agent down the old path.

**Files:**
- Modify: `CLAUDE.md`
- Test: `test/docs/claude-md.test.js`

**Interfaces:**
- Consumes: the final file layout from Tasks 1–20.
- Produces: nothing executable.

- [ ] **Step 1: Write the failing test**

Create `test/docs/claude-md.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const doc = readFileSync('CLAUDE.md', 'utf8');

describe('CLAUDE.md', () => {
  it('no longer claims there are no tests', () => {
    expect(doc).not.toContain('no tests to run');
  });

  it('no longer describes implicit globals and script load order', () => {
    expect(doc).not.toContain('All globals are attached implicitly');
    expect(doc).not.toContain('load order in `index.html` matters');
  });

  it('documents the test command', () => {
    expect(doc).toContain('npm test');
  });

  it('documents the engine and the registry', () => {
    expect(doc).toContain('js/engine/game-engine.js');
    expect(doc).toContain('js/engine/registry.js');
  });

  it('documents the generated service worker', () => {
    expect(doc).toContain('npm run build:sw');
  });

  it('documents the legacy escape hatch', () => {
    expect(doc).toContain('legacy');
  });

  it('references files that actually exist', () => {
    const paths = [...doc.matchAll(/`(js\/[\w./-]+)`/g)].map(m => m[1]);
    expect(paths.length).toBeGreaterThan(3);
    for (const path of paths) {
      expect(existsSync(path), path + ' referenced but missing').toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/docs/claude-md.test.js`
Expected: FAIL — `expected doc not to contain 'no tests to run'`.

- [ ] **Step 3: Rewrite the affected sections**

Four sections need replacing. Keep the rest of the file as-is.

**Running locally** — replace "There are no dependencies to install and no tests to run" with:

```markdown
Install dev dependencies once with `npm install` (Vitest + jsdom; runtime has no
dependencies). Run `npm test` before committing. Verification is tests plus
playing the changed game in the browser and checking the console.
```

**Layout** — replace the `js/` tree with the real one: `engine/`, `render/`, `games/`, `i18n/`, `data/`, plus `tools/build-sw.js` and `test/`.

**Architecture** — replace the "Game object shape" and "Game registry" bullets with the engine contract: a game is a plain object with a pure `generate(difficulty, ctx)` returning exercises; `GameEngine` owns the session loop, scoring, celebration, speech, and result persistence; the optional seams are `renderPrompt`, `renderChoices`, `isCorrect`, `layoutClass`, `choiceClass`, `correctClass`, `bodyClass`, `setup`, and `legacy`. Note that `double_crash` is the sole `legacy: true` game.

**Adding a new game** — replace the seven manual steps with:

```markdown
1. Create `js/games/<id>.js` exporting a game object with a pure
   `generate(difficulty, ctx)`. Mirror `js/games/dice-addition.js`.
2. Add it to `GAMES` in `js/engine/registry.js` with a `domain`.
3. Add the game-name key to all five language blocks in
   `js/i18n/translations.js`.
4. Write `test/games/<id>.test.js` asserting the answer range per difficulty,
   that `choices` contains `correctAnswer`, and that a seeded rng is stable.
5. Add any styles to `css/game.css`.
6. Run `npm test`, then `npm run build:sw`.
```

**Workflow** — keep the push-to-`main` intent but gate it:

```markdown
- Run `npm test` and `npm run build:sw` before pushing. Do not push a red suite.
- Multi-task work (anything following a plan in `.claude/superpowers/plans/`)
  runs on a branch in a worktree and merges to `main` once green, so `main`
  never holds a half-migrated app. Single small edits still go straight to
  `main`.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — every suite.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md test/docs/claude-md.test.js
git commit -m "docs: rewrite CLAUDE.md for the GameEngine architecture"
```

---

## Done When

- `npm test` is green across every suite.
- All ten games play identically to before, offline included.
- `js/` contains no `*-game.js` files at the top level — every game lives in `js/games/`.
- No file in `js/` duplicates `answer`, `updateProgress`, or `completeGame`, except `double_crash`, which is marked `legacy: true` and documented as the sole exception.
- Adding a game requires exactly two edits: a new file in `js/games/`, and one line in `js/engine/registry.js`.
- `CLAUDE.md` describes the architecture that now exists.
- The worktree branch merges cleanly into `main` and is pushed.
