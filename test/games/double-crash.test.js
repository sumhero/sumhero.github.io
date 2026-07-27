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
    expect(DoubleCrashGame.emoji).toBe('🎡');
  });

  it('is legacy rather than a half-configured engine game', () => {
    expect(DoubleCrashGame.legacy).toBe(true);
    expect(DoubleCrashGame.generate).toBeUndefined();
    expect(DoubleCrashGame.rounds).toBeUndefined();
    expect(DoubleCrashGame.layoutClass).toBeUndefined();
    expect(DoubleCrashGame.isCorrect).toBeUndefined();
  });
});
