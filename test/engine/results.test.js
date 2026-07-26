import { describe, it, expect, beforeEach } from 'vitest';
import { saveResult, loadResults, RESULTS_KEY, MAX_RESULTS } from '../../js/engine/results.js';

const sample = {
  gameId: 'dice_addition',
  difficulty: 'easy',
  totalExercises: 5,
  wrongAttempts: 1,
  durationSeconds: 42,
  playedAt: '2026-07-26T12:00:00.000Z',
};

describe('results', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty list when nothing is stored', () => {
    expect(loadResults()).toEqual([]);
  });

  it('round-trips a saved result', () => {
    saveResult(sample);
    expect(loadResults()).toEqual([sample]);
  });

  it('appends newest last', () => {
    saveResult({ ...sample, wrongAttempts: 1 });
    saveResult({ ...sample, wrongAttempts: 2 });
    expect(loadResults().map(r => r.wrongAttempts)).toEqual([1, 2]);
  });

  it('caps stored results, dropping the oldest', () => {
    for (let i = 0; i < MAX_RESULTS + 10; i++) {
      saveResult({ ...sample, wrongAttempts: i });
    }
    const stored = loadResults();
    expect(stored).toHaveLength(MAX_RESULTS);
    expect(stored[0].wrongAttempts).toBe(10);
  });

  it('recovers from corrupt storage instead of throwing', () => {
    localStorage.setItem(RESULTS_KEY, 'not json');
    expect(loadResults()).toEqual([]);
  });

  it('ignores valid JSON that is not an array', () => {
    localStorage.setItem(RESULTS_KEY, '{"a":1}');
    expect(loadResults()).toEqual([]);
  });

  it('ignores stored JSON null', () => {
    localStorage.setItem(RESULTS_KEY, 'null');
    expect(loadResults()).toEqual([]);
  });
});
