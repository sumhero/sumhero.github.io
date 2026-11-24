import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { DoubleCrashGame, FRAME_SRC } from '../../js/games/double-crash.js';
import { showScreen } from '../../js/engine/screens.js';

function mountGameScreen() {
  document.body.innerHTML = `
    <div id="screen-games" class="screen active"></div>
    <div id="screen-game" class="screen">
      <div id="game-progress"><div id="progress-fill"></div></div>
      <div id="game-score"></div>
      <div class="game-body">
        <div id="dice-container"></div>
        <div id="choices-container"></div>
      </div>
    </div>
  `;
}

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
    expect(DoubleCrashGame.emoji).toBe('🎡');
  });

  it('is legacy rather than a half-configured engine game', () => {
    expect(DoubleCrashGame.legacy).toBe(true);
    expect(DoubleCrashGame.generate).toBeUndefined();
    expect(DoubleCrashGame.rounds).toBeUndefined();
    expect(DoubleCrashGame.layoutClass).toBeUndefined();
    expect(DoubleCrashGame.isCorrect).toBeUndefined();
  });

  describe('start', () => {
    beforeEach(mountGameScreen);

    it('loads the Crash Roulette page in an iframe on the game screen', () => {
      DoubleCrashGame.start();
      const frames = document.querySelectorAll('iframe');
      expect(frames).toHaveLength(1);
      expect(frames[0].getAttribute('src')).toBe(FRAME_SRC);
      expect(document.getElementById('screen-game').classList.contains('active')).toBe(true);
      expect(document.querySelector('.game-body').classList.contains('crash-game-layout')).toBe(true);
    });

    it('points at a page that exists in the repo', () => {
      expect(existsSync(new URL('../..' + FRAME_SRC, import.meta.url))).toBe(true);
    });

    it('removes the iframe when the player leaves the game screen', () => {
      // the page's timers, heartbeat sound and animation loops only stop
      // when the iframe is gone, not when its screen is merely hidden
      DoubleCrashGame.start();
      showScreen('games');
      expect(document.querySelector('iframe')).toBeNull();
    });
  });
});
