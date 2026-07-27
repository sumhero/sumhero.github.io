import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryGame, MEMORY_CONFIG, MEMORY_COLORS } from '../../js/games/memory.js';

describe('MemoryGame (legacy)', () => {
  it('carries the registry metadata', () => {
    expect(MemoryGame.id).toBe('memory');
    expect(MemoryGame.nameKey).toBe('memory');
    expect(MemoryGame.emoji).toBe('🧠');
    expect(MemoryGame.domain).toBe('logique');
    expect(MemoryGame.legacy).toBe(true);
  });

  it('supplies its own start() and no engine-driven generate()', () => {
    expect(typeof MemoryGame.start).toBe('function');
    expect(MemoryGame.generate).toBeUndefined();
  });

  it('keeps the board count per difficulty at 3/4/5', () => {
    expect(MEMORY_CONFIG.easy.boards).toBe(3);
    expect(MEMORY_CONFIG.normal.boards).toBe(4);
    expect(MEMORY_CONFIG.hard.boards).toBe(5);
  });

  it('keeps the grid sizes per difficulty at 6/9/12 tiles', () => {
    expect(MEMORY_CONFIG.easy.cols * MEMORY_CONFIG.easy.rows).toBe(6);
    expect(MEMORY_CONFIG.normal.cols * MEMORY_CONFIG.normal.rows).toBe(9);
    expect(MEMORY_CONFIG.hard.cols * MEMORY_CONFIG.hard.rows).toBe(12);
  });

  it('keeps exactly six colours available to pick from', () => {
    expect(MEMORY_COLORS).toHaveLength(6);
  });
});

// Behavioural coverage for tileClick/solveTile — the synchronous DOM logic the
// legacy decision rests on. The timer-driven parts (memorise countdown, 3s
// peek) are a fair jsdom limitation and are left to the browser check; these
// tests drive the same click handlers the real board wires up, against a
// deterministic board so the colour-group state machine is fully pinned.
describe('MemoryGame tile-group behaviour', () => {
  function mountDom() {
    document.body.className = '';
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

  function colorDef(key) {
    return MEMORY_COLORS.find(c => c.key === key);
  }

  // Replaces the randomly-generated easy board (3x2 = 6 tiles) with a known
  // layout, then applies the same transition `startMemorize`'s countdown
  // would apply once it hits zero (`hideBoard`), so the tiles become
  // tappable without waiting out the real timer.
  function setKnownBoard(colorKeys) {
    MemoryGame.session.board = colorKeys.map(key => {
      const def = colorDef(key);

      return { color: def.key, hex: def.hex, solved: false };
    });
    MemoryGame.hideBoard();
  }

  function tile(index) {
    return document.querySelector('.memory-tile[data-index="' + index + '"]');
  }

  beforeEach(() => {
    mountDom();
    vi.useFakeTimers();
    MemoryGame.start('easy');
    setKnownBoard(['red', 'green', 'red', 'blue', 'blue', 'green']);
  });

  afterEach(() => {
    MemoryGame.clearTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('lets a tile tapped wrongly under one colour later be solved as the first tap of its own group', () => {
    MemoryGame.tileClick(0, tile(0)); // first tap: locks in red, solves tile 0
    expect(MemoryGame.activeColor).toBe('red');

    MemoryGame.tileClick(1, tile(1)); // green while red is active: wrong
    expect(MemoryGame.session.board[1].solved).toBe(false);

    MemoryGame.tileClick(2, tile(2)); // second red: closes the red group
    expect(MemoryGame.activeColor).toBe(null);

    // Tile 1 was wrongly tapped above, under a different active colour. Now
    // that no colour is active, tapping it again must start (and solve) its
    // own green group — this is the property the legacy decision rests on.
    MemoryGame.tileClick(1, tile(1));
    expect(MemoryGame.session.board[1].solved).toBe(true);
    expect(tile(1).classList.contains('solved')).toBe(true);
    expect(tile(1).classList.contains('revealed')).toBe(true);
  });

  it('counts a wrong tap in wrongAttempts and clears it instead of latching', () => {
    MemoryGame.tileClick(0, tile(0)); // locks in red
    const before = MemoryGame.wrongAttempts;

    MemoryGame.tileClick(1, tile(1)); // green while red is active: wrong
    expect(MemoryGame.wrongAttempts).toBe(before + 1);
    expect(tile(1).classList.contains('wrong')).toBe(true);
    expect(MemoryGame.session.board[1].solved).toBe(false);

    vi.advanceTimersByTime(500);
    expect(tile(1).classList.contains('wrong')).toBe(false);
  });

  it('clears activeColor only once every tile of the active colour is solved', () => {
    MemoryGame.tileClick(0, tile(0)); // first red: one of two still unsolved
    expect(MemoryGame.activeColor).toBe('red');

    MemoryGame.tileClick(2, tile(2)); // second red: group closed
    expect(MemoryGame.activeColor).toBe(null);
  });

  it('advances to the next board once every tile on the board is solved', () => {
    MemoryGame.tileClick(0, tile(0));
    MemoryGame.tileClick(2, tile(2)); // closes red
    MemoryGame.tileClick(1, tile(1));
    MemoryGame.tileClick(5, tile(5)); // closes green
    MemoryGame.tileClick(3, tile(3));
    MemoryGame.tileClick(4, tile(4)); // closes blue: board solved

    expect(MemoryGame.currentExercise).toBe(1);

    vi.advanceTimersByTime(800); // the original's inter-board delay

    expect(document.getElementById('game-score').textContent).toBe('1 / 3');
    expect(document.querySelectorAll('.memory-tile.solved')).toHaveLength(0);
    expect(document.querySelector('.memory-grid').classList.contains('locked')).toBe(true);
  });
});
