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

describe('showScreen game-body cleanup', () => {
  beforeEach(mountScreens);

  it('strips a layout class an engine-driven game set through setLayoutClass', () => {
    // Migrated (non-legacy) games route their layout class through setLayoutClass,
    // which showScreen clears via setLayoutClass(null) on leaving the game screen.
    setLayoutClass('uno-game-body');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });

  it('strips other layout classes set through setLayoutClass, from different games', () => {
    setLayoutClass('geo-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');

    setLayoutClass('chess-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });

  it('strips a legacy layout class a game added directly, bypassing setLayoutClass', () => {
    // memory and double_crash are legacy games whose own showExercise calls
    // gameBody.classList.add(...) directly; they never call setLayoutClass. Their
    // internals are off limits, so showScreen must still clean this up on exit.
    document.querySelector('.game-body').classList.add('memory-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');

    document.querySelector('.game-body').classList.add('crash-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });

  it('clears time-theme-day/night from the body when leaving the game screen', () => {
    document.body.classList.add('time-theme-night');
    showScreen('games');
    expect(document.body.classList.contains('time-theme-night')).toBe(false);
    expect(document.body.classList.contains('time-theme-day')).toBe(false);
  });

  it('does not strip layout classes when showing the game screen itself', () => {
    document.querySelector('.game-body').classList.add('memory-game-layout');
    showScreen('game');
    expect(document.querySelector('.game-body').classList.contains('memory-game-layout')).toBe(true);
  });
});
