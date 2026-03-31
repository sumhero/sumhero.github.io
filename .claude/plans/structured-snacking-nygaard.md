# Migrate Math Game to Static GitHub Pages

## Context
Take the frontend SPA from `~/www/math-game/public/game/` and deploy it as a standalone static site at `sumhero.github.io`. Remove all backend dependencies (auth, API calls, result storage). The game logic already runs entirely client-side.

## Step 1: Create `.gitignore`
```
.idea/
```

## Step 2: Copy unmodified files
From `~/www/math-game/public/game/` to project root:
- `css/game.css`
- `flags/` (entire directory, 195+ SVGs)
- `images/icon-192.png`, `images/icon-512.png`
- `js/translations.js`, `js/sound.js`, `js/dice-renderer.js`, `js/animation.js`
- `js/game-list.js`, `js/countries-data.js`

## Step 3: Do NOT copy
- `js/api.js` — backend API client, JWT tokens, offline queue
- `js/auth.js` — login/registration UI

## Step 4: Copy & modify `index.html`
- Remove `#screen-auth` block (lines 24-37)
- Remove logout button (line 62)
- Remove `<script>` tags for `api.js` and `auth.js` (lines 110, 114)
- Update all `/game/` paths to `/` (manifest, icons, CSS, JS scripts, SW registration)

## Step 5: Copy & modify `js/app.js`
- Remove `Auth.init()` call (line 3)
- Remove `GameAPI.syncResults()` from online handler and startup (lines 18-19, 28-33)
- Replace startup logic: always `this.showScreen('games')` instead of auth check
- Remove `showSyncNotice()` method and sync-notice element creation
- Simplify `updateOfflineIndicator()` — remove `GameAPI.getPendingCount()` reference

## Step 6: Copy & modify 6 game JS files
Remove the `GameAPI.completeSession(result).catch(...)` block (3 lines) from `completeGame()` in each:
- `js/dice-game.js` (lines 144-146)
- `js/count-objects-game.js`
- `js/uno-game.js`
- `js/dice-recognition-game.js`
- `js/countries-game.js`
- `js/capitals-game.js`

Keep the `result` object construction (feeds celebration stats display).

## Step 7: Copy & modify `manifest.json`
- Update all `/game/` paths to `/`
- `start_url`: `/`

## Step 8: Copy & modify `sw.js`
- Update all cached asset paths from `/game/` to `/`
- Remove `api.js` and `auth.js` from ASSETS array
- Remove the `/api/` bypass block

## Verification
1. Open `index.html` locally (or via local server) — should show game selection directly, no login screen
2. Play through each game type — dice addition, dice recognition, count objects, uno, countries, capitals
3. Verify celebration screen shows after completing a game
4. Check browser console for no JS errors (no references to `GameAPI` or `Auth`)
5. Verify PWA manifest and service worker register without errors
