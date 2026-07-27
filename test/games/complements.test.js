import { describe, it, expect } from 'vitest';
import { ComplementsGame } from '../../js/games/complements.js';
import { TenFrameRenderer } from '../../js/render/ten-frame.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const TARGETS = { easy: 5, normal: 10, hard: 20 };

describe('ComplementsGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(ComplementsGame.id).toBe('complements');
    expect(ComplementsGame.domain).toBe('nombres');
    expect(ComplementsGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(ComplementsGame.layoutClass).toBe('num-game-layout');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(ComplementsGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(ComplementsGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, target] of Object.entries(TARGETS)) {
    it(`completes to ${target} on ${difficulty}`, () => {
      for (const ex of ComplementsGame.generate(difficulty, ctx(20))) {
        expect(ex.target).toBe(target);
        expect(ex.start).toBeGreaterThanOrEqual(1);
        expect(ex.start).toBeLessThanOrEqual(target - 1);
        expect(ex.correctAnswer).toBe(target - ex.start);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it('always includes the correct answer among five distinct in-range choices', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ComplementsGame.generate(difficulty, ctx(20))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(choice).toBeGreaterThanOrEqual(0);
          expect(choice).toBeLessThanOrEqual(ex.target);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of ComplementsGame.generate('normal', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('shows the start value in a ten-frame sized to the target', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of ComplementsGame.generate(difficulty, ctx(5))) {
        expect(ex.promptHtml).toContain(TenFrameRenderer.render(ex.start, ex.target));
        expect(ex.promptHtml).toContain(ex.start + ' + ? = ' + ex.target);
      }
    }
  });

  it('takes its hint from ctx.t rather than reaching for I18n', () => {
    const ex = ComplementsGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('complementsPrompt');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = ComplementsGame.generate('normal', ctx(5, seeded));
    const b = ComplementsGame.generate('normal', ctx(5, seeded));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
  });

  it('does not repeat the same start value twice in a row', () => {
    const starts = ComplementsGame.generate('normal', ctx(10)).map(e => e.start);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]).not.toBe(starts[i - 1]);
    }
  });

  it('never asks the same complement twice in a row, at any difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const rounds = { easy: 5, normal: 10, hard: 20 }[difficulty];

      for (let session = 0; session < 30; session++) {
        const starts = ComplementsGame.generate(difficulty, ctx(rounds)).map(ex => ex.start);

        for (let i = 1; i < starts.length; i++) {
          expect(starts[i], difficulty + ' round ' + i).not.toBe(starts[i - 1]);
        }
      }
    }
  });

  it('spreads the session across the available starts', () => {
    // start runs 1..target-1, so the spaces are 4, 9 and 19 against 5, 10 and
    // 20 rounds — uniqueness is impossible at every difficulty. These floors
    // are independent literals set below the worst case seen in 500 000
    // simulated sessions (4, 7 and 15 respectively).
    const floors = { easy: 4, normal: 7, hard: 14 };

    for (const difficulty of ['easy', 'normal', 'hard']) {
      const rounds = { easy: 5, normal: 10, hard: 20 }[difficulty];

      for (let session = 0; session < 30; session++) {
        const starts = ComplementsGame.generate(difficulty, ctx(rounds)).map(ex => ex.start);

        expect(new Set(starts).size, difficulty).toBeGreaterThanOrEqual(floors[difficulty]);
      }
    }
  });
});
