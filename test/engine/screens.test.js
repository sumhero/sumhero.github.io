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

  it('strips a layout class a game added directly, bypassing setLayoutClass', () => {
    // Games call gameBody.classList.add(...) themselves inside showExercise; they
    // never call setLayoutClass. showScreen must still clean this up on exit.
    document.querySelector('.game-body').classList.add('uno-game-body');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });

  it('strips other known layout classes added directly, from different games', () => {
    document.querySelector('.game-body').classList.add('geo-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');

    document.querySelector('.game-body').classList.add('chess-game-layout');
    showScreen('games');
    expect(document.querySelector('.game-body').className).toBe('game-body');
  });

  it('clears time-theme-day/night from the body added directly by guess-time-game', () => {
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
