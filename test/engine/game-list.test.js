import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameList } from '../../js/engine/game-list.js';
import { GAMES } from '../../js/engine/registry.js';
import { GameEngine } from '../../js/engine/game-engine.js';

function mountDom() {
  document.body.innerHTML = `
    <div id="screen-games" class="screen active"><div id="game-list"></div></div>
    <div id="screen-game" class="screen"><div class="game-body">
      <div id="dice-container"></div><div id="choices-container"></div>
    </div></div>
    <div id="screen-picker" class="screen"><div id="exercise-picker"></div></div>
    <div id="screen-category" class="screen"><div id="category-picker"></div></div>
  `;
}

describe('GameList.load', () => {
  beforeEach(() => {
    mountDom();
    localStorage.clear();
  });

  it('renders one group section per non-empty domain', () => {
    GameList.load();
    expect(document.querySelectorAll('.game-group')).toHaveLength(5);
  });

  it('renders a card for every registered game except hard-only ones under easy', () => {
    GameList.load();
    expect(document.querySelectorAll('.game-card')).toHaveLength(GAMES.length - GameList.HARD_ONLY_GAMES.length);
  });

  it('hides the roulette game by default (easy) and shows it under hard', () => {
    GameList.load();
    expect(document.querySelector('[data-id="double_crash"]')).toBeNull();

    localStorage.setItem('game_difficulty', 'hard');
    GameList.load();
    expect(document.querySelector('[data-id="double_crash"]')).not.toBeNull();
    expect(document.querySelectorAll('.game-card')).toHaveLength(GAMES.length);
  });

  it('keeps the roulette game hidden under normal difficulty', () => {
    localStorage.setItem('game_difficulty', 'normal');
    GameList.load();
    expect(document.querySelector('[data-id="double_crash"]')).toBeNull();
  });

  it('labels each group with its domain emoji and name', () => {
    GameList.load();
    expect(document.querySelector('.game-group-title').textContent).toContain('🔢');
  });

  it('puts guess_time under mesures, not nombres', () => {
    GameList.load();
    const groups = [...document.querySelectorAll('.game-group')];
    const mesures = groups.find(g => g.querySelector('[data-id="guess_time"]'));
    expect(mesures.querySelector('[data-id="dice_addition"]')).toBeNull();
  });

  it('starts an engine-driven game through GameEngine', () => {
    const spy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    GameList.load();
    document.querySelector('[data-id="dice_recognition"]').click();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].id).toBe('dice_recognition');
  });

  it('starts each legacy game through its own start, not the engine', () => {
    const engineSpy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    const memory = GAMES.find(g => g.id === 'memory');
    const doubleCrash = GAMES.find(g => g.id === 'double_crash');
    const memorySpy = vi.spyOn(memory, 'start').mockImplementation(() => {});
    const doubleCrashSpy = vi.spyOn(doubleCrash, 'start').mockImplementation(() => {});

    localStorage.setItem('game_difficulty', 'hard'); // roulette is hard-only
    GameList.load();
    document.querySelector('[data-id="memory"]').click();
    document.querySelector('[data-id="double_crash"]').click();

    expect(memorySpy).toHaveBeenCalledOnce();
    expect(doubleCrashSpy).toHaveBeenCalledOnce();
    expect(engineSpy).not.toHaveBeenCalled();
  });

  it('shows the exercise picker for a rounds:ask game instead of starting it', () => {
    const spy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    GameList.load();
    document.querySelector('[data-id="dice_addition"]').click();
    expect(document.getElementById('screen-picker').classList.contains('active')).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows the category picker for a setup:category game instead of starting it', () => {
    const spy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    GameList.load();
    document.querySelector('[data-id="count_objects"]').click();
    expect(document.getElementById('screen-category').classList.contains('active')).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('starts dice_addition through GameEngine with the picked count once a picker button is clicked', () => {
    const spy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    GameList.load();
    document.querySelector('[data-id="dice_addition"]').click();
    const buttons = document.querySelectorAll('#exercise-picker .picker-btn');
    buttons[4].click(); // fifth button, labelled "5"

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].id).toBe('dice_addition');
    expect(spy.mock.calls[0][1].count).toBe(5);
  });

  it('starts count_objects through GameEngine with the picked category once a category button is clicked', () => {
    const spy = vi.spyOn(GameEngine, 'start').mockImplementation(() => {});
    GameList.load();
    document.querySelector('[data-id="count_objects"]').click();
    const button = document.querySelector('#category-picker .category-btn');
    const category = button.dataset.category;
    button.click();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].id).toBe('count_objects');
    expect(spy.mock.calls[0][1].category).toBe(category);
  });
});
