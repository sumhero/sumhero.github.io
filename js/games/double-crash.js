import { showScreen, onScreenChange } from '../engine/screens.js';

// Crash Roulette is a self-contained casino-style page (pages/crash-roulette.html)
// with its own game logic, styles, canvas effects and WebAudio sound. Its
// full-page CSS (body/header/main/dialog selectors, :root variables) would
// collide with css/game.css, so instead of being rendered into the shared
// game screen it runs in an iframe there. The app keeps its own Exit button
// above the frame.
export const FRAME_SRC = '/pages/crash-roulette.html';

function removeFrame() {
    const frame = document.getElementById('crash-frame');
    // Removing the iframe is what stops the page's timers, heartbeat sound and
    // animation loops: hiding the screen alone would leave them running.
    if (frame) frame.remove();
}

onScreenChange(name => {
    if (name !== 'game') removeFrame();
});

export const DoubleCrashGame = {
    id: 'double_crash',
    nameKey: 'doubleCrash',
    emoji: '🎡',
    domain: 'logique',
    legacy: true,

    start() {
        removeFrame();

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('crash-game-layout');
        document.getElementById('choices-container').innerHTML = '';
        document.getElementById('game-score').textContent = '';
        document.getElementById('progress-fill').style.width = '0%';

        document.getElementById('dice-container').innerHTML =
            '<iframe id="crash-frame" class="crash-frame" src="' + FRAME_SRC + '"' +
            ' title="Crash Roulette" allow="autoplay"></iframe>';

        showScreen('game');

        const frame = document.getElementById('crash-frame');
        if (frame) frame.focus();
    },
};
