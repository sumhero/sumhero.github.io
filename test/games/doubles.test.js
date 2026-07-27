import { describe, it, expect } from 'vitest';
import { DoublesGame } from '../../js/games/doubles.js';

// The t stub echoes both the key and the interpolated parameter, so the tests
// can prove the operand actually reaches the translation template instead of
// being concatenated into the HTML behind i18n's back.
function ctx(count, rng = Math.random) {
  return {
    rng,
    t: (key, params) => key + '(' + (params && params.n !== undefined ? params.n : '') + ')',
    lang: 'fr',
    count,
    category: null,
  };
}

describe('DoublesGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(DoublesGame.id).toBe('doubles');
    expect(DoublesGame.domain).toBe('nombres');
    expect(DoublesGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(DoublesGame.layoutClass).toBe('num-game-layout');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(DoublesGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(DoublesGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('asks only doubles on easy and normal', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of DoublesGame.generate(difficulty, ctx(20))) {
        expect(ex.kind).toBe('double');
      }
    }
  });

  it('keeps the operand within the difficulty ceiling', () => {
    for (const ex of DoublesGame.generate('easy', ctx(25))) {
      expect(ex.operand).toBeGreaterThanOrEqual(1);
      expect(ex.operand).toBeLessThanOrEqual(5);
    }
    for (const ex of DoublesGame.generate('normal', ctx(25))) {
      expect(ex.operand).toBeGreaterThanOrEqual(1);
      expect(ex.operand).toBeLessThanOrEqual(10);
    }
    // hard's double operand shares normal's ceiling (MAX_N.hard === MAX_N.normal
    // === 10) per the design spec; pin it too so a regression there is caught.
    for (const ex of DoublesGame.generate('hard', ctx(25))) {
      if (ex.kind !== 'double') continue;
      expect(ex.operand).toBeGreaterThanOrEqual(1);
      expect(ex.operand).toBeLessThanOrEqual(10);
    }
  });

  it('doubles the operand on a double exercise', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of DoublesGame.generate(difficulty, ctx(25))) {
        if (ex.kind !== 'double') continue;
        expect(ex.correctAnswer).toBe(ex.operand * 2);
        expect(ex.promptHtml).toContain('doubleOf(' + ex.operand + ')');
      }
    }
  });

  it('halves an even operand on a half exercise, never above 20', () => {
    for (const ex of DoublesGame.generate('hard', ctx(30))) {
      if (ex.kind !== 'half') continue;
      expect(ex.operand % 2).toBe(0);
      expect(ex.operand).toBeGreaterThanOrEqual(2);
      expect(ex.operand).toBeLessThanOrEqual(20);
      expect(ex.correctAnswer).toBe(ex.operand / 2);
      expect(ex.promptHtml).toContain('halfOf(' + ex.operand + ')');
    }
  });

  it('mixes doubles and halves within a hard session', () => {
    const kinds = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of DoublesGame.generate('hard', ctx(20))) kinds.add(ex.kind);
    }
    expect([...kinds].sort()).toEqual(['double', 'half']);
  });

  it('always includes the correct answer among five distinct positive choices', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of DoublesGame.generate(difficulty, ctx(20))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(choice).toBeGreaterThanOrEqual(1);
          expect(choice).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of DoublesGame.generate('hard', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = DoublesGame.generate('hard', ctx(5, seeded));
    const b = DoublesGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
  });

  it('never repeats a question back-to-back, at any difficulty', () => {
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const keys = DoublesGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.kind + ':' + ex.operand);

        for (let i = 1; i < keys.length; i++) {
          expect(keys[i], difficulty + ' round ' + i).not.toBe(keys[i - 1]);
        }
      }
    }
  });

  it('spreads a session across the whole operand range', () => {
    // The space equals the round count on every band (5/5, 10/10, 20/20), so a
    // perfect permutation is reachable but not guaranteed: 14.4% of hard
    // sessions legitimately refill once, because asHalf is an independent
    // per-round coin flip and the two ten-value bands are never balanced.
    // These floors are independent literals set below the worst coverage seen
    // in 500 000 simulated sessions (4, 7 and 16 respectively). Do NOT tighten
    // them to "all distinct" — that would be a flaky test asserting something
    // the generator does not promise.
    const floors = { easy: 4, normal: 7, hard: 15 };

    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const keys = DoublesGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.kind + ':' + ex.operand);

        expect(new Set(keys).size, difficulty).toBeGreaterThanOrEqual(floors[difficulty]);
      }
    }
  });
});
