import { describe, it, expect } from 'vitest';
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
