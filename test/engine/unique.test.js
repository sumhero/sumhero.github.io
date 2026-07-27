import { describe, it, expect } from 'vitest';
import { drawDistinct, DRAW_TRIES } from '../../js/engine/unique.js';

// A scripted draw source: deterministic, no rng involved, so the exhaustion
// and re-seed behaviour can be asserted exactly rather than statistically.
function scripted(values) {
  let i = 0;

  return () => values[i++ % values.length];
}

function sessions(n, run) {
  return Array.from({ length: n }, () => run());
}

function hasAdjacentRepeat(keys) {
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === keys[i - 1]) return true;
  }

  return false;
}

describe('DRAW_TRIES', () => {
  it('is 40', () => {
    // Deliberately an independent literal compared against the module's own
    // value, not derived from it. 40 is load-bearing in two directions: big
    // enough to complete a permutation of 20, small enough that the constant-rng
    // determinism tests do not burn a 500-try budget every round, and — the
    // sharp one — 40 * 3 rng draws per chess try is a multiple of the 12-value
    // cycling rng in test/games/chess.test.js, which is what keeps that test's
    // mutation argument valid. 30 or 50 would make it pass on broken code.
    expect(DRAW_TRIES).toBe(40);
  });
});

describe('drawDistinct', () => {
  it('returns exactly count items', () => {
    expect(drawDistinct(7, () => ({}), () => String(Math.random()))).toHaveLength(7);
  });

  it('passes the zero-based round index to draw', () => {
    // number_words alternates its irregular French band on even i, and
    // count_objects cycles its emoji on i. If the helper stopped passing the
    // index, both would silently lose an index-driven guarantee.
    const seen = [];
    drawDistinct(4, i => { seen.push(i); return 'x' + i; }, key => key);

    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('never repeats while the space allows', () => {
    // Space 10, five rounds — twice the room the draw needs.
    for (const keys of sessions(50, () =>
      drawDistinct(5, () => Math.floor(Math.random() * 10), value => String(value))
    )) {
      expect(new Set(keys).size).toBe(5);
    }
  });

  it('cycles the whole space in order when the space is smaller than the count', () => {
    // Two distinct candidates, six rounds. With the used-set re-seeded by the
    // last emitted key on every refill, the only sequence the sampler can
    // produce is a strict alternation. Fully deterministic: no rng at all.
    const keys = drawDistinct(6, scripted(['A', 'B']), key => key);

    expect(keys).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
  });

  it('cycles a three-value space evenly across nine rounds', () => {
    const keys = drawDistinct(9, scripted(['A', 'B', 'C']), key => key);

    expect(keys).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'A', 'B', 'C']);
  });

  it('never places an adjacent repeat even when the space is four times too small', () => {
    // dice_recognition hard: five faces over twenty rounds. Zero adjacent
    // repeats in 500 000 simulated sessions, so thirty here is not flaky.
    for (const keys of sessions(30, () =>
      drawDistinct(20, () => Math.floor(Math.random() * 5), value => String(value))
    )) {
      expect(hasAdjacentRepeat(keys)).toBe(false);
      // All five faces still appear: the space is cycled, not narrowed.
      expect(new Set(keys).size).toBe(5);
    }
  });

  it('terminates and still returns count items when only one candidate exists', () => {
    // The pathological case: a space of one. It cannot avoid repeating, and it
    // must not hang. Every existing guard in this codebase exists for this.
    expect(drawDistinct(4, () => 'only', key => key)).toEqual(['only', 'only', 'only', 'only']);
  });

  it('bounds the number of draws per round', () => {
    // A space of one makes every round burn both passes. 4 rounds * 2 passes *
    // 40 tries = 320 is the worst case; the literal is duplicated deliberately
    // rather than computed from DRAW_TRIES, so a budget change shows up here.
    let calls = 0;
    drawDistinct(4, () => { calls++; return 'only'; }, key => key);

    expect(calls).toBeLessThanOrEqual(320);
  });

  it('is deterministic under a constant rng', () => {
    // Every game's existing determinism test drives generate() with () => 0.5,
    // which makes every rejection miss. The helper must still be a pure
    // function of its inputs, and must still terminate.
    const run = () => {
      const rng = () => 0.5;

      return drawDistinct(5, () => Math.floor(rng() * 10), value => String(value));
    };

    expect(run()).toEqual(run());
    expect(run()).toEqual([5, 5, 5, 5, 5]);
  });
});
