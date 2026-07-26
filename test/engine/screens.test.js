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
