import { describe, it, expect } from 'vitest';
import { DiceRecognitionGame } from '../../js/games/dice-recognition.js';
import { DiceRenderer } from '../../js/render/dice.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const RANGES = { easy: [1, 4], normal: [1, 5], hard: [2, 6] };

describe('DiceRecognitionGame', () => {
  it('declares its layout class', () => {
    expect(DiceRecognitionGame.id).toBe('dice_recognition');
    expect(DiceRecognitionGame.layoutClass).toBe('dice-recognition-layout');
    expect(DiceRecognitionGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGES)) {
    it(`shows pips between ${min} and ${max} on ${difficulty}`, () => {
      for (const ex of DiceRecognitionGame.generate(difficulty, ctx(15))) {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(min);
        expect(ex.correctAnswer).toBeLessThanOrEqual(max);
      }
    });
  }

  it('generates the difficulty round count', () => {
    expect(DiceRecognitionGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('never repeats the same face consecutively', () => {
    const faces = DiceRecognitionGame.generate('normal', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < faces.length; i++) {
      expect(faces[i]).not.toBe(faces[i - 1]);
    }
  });

  it('renders a die as svg without a numeral', () => {
    const ex = DiceRecognitionGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('<svg');
    expect(ex.promptHtml).not.toContain('dice-number');
  });

  it('renders the correct face value', () => {
    // Cycle two distinct rng values so a bug that always rendered a fixed
    // face (e.g. `DiceRenderer.render(1)`) cannot coincidentally match.
    const values = [0.1, 0.9];
    let i = 0;
    const rng = () => values[i++ % values.length];
    const exercises = DiceRecognitionGame.generate('hard', ctx(5, rng));
    for (const ex of exercises) {
      expect(ex.promptHtml).toBe(DiceRenderer.render(ex.correctAnswer));
    }
  });

  it('always includes the correct answer', () => {
    for (const ex of DiceRecognitionGame.generate('hard', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('always offers all six faces in ascending order', () => {
    for (const ex of DiceRecognitionGame.generate('hard', ctx(10))) {
      expect(ex.choices).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('never shows the same die face twice in a row, at any difficulty', () => {
    // Five faces over twenty rounds: uniqueness is impossible, so the only
    // promise that can be kept is "never twice in a row", and it must survive
    // the used-set being refilled three times inside one session.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const rounds = { easy: 5, normal: 10, hard: 20 }[difficulty];

      for (let session = 0; session < 30; session++) {
        const values = DiceRecognitionGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.correctAnswer);

        for (let i = 1; i < values.length; i++) {
          expect(values[i], difficulty + ' round ' + i).not.toBe(values[i - 1]);
        }
      }
    }
  });

  it('spreads the session across every available face', () => {
    // Independent literals, deliberately duplicated rather than derived from
    // RANGES: easy offers faces 1-4, normal 1-5, hard 2-6. Zero sessions in
    // 500 000 failed to cover the whole band, so these are hard floors, not
    // "usually" assertions.
    const floors = { easy: 4, normal: 5, hard: 5 };

    for (const difficulty of ['easy', 'normal', 'hard']) {
      const rounds = { easy: 5, normal: 10, hard: 20 }[difficulty];

      for (let session = 0; session < 30; session++) {
        const values = DiceRecognitionGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.correctAnswer);

        expect(new Set(values).size, difficulty).toBeGreaterThanOrEqual(floors[difficulty]);
      }
    }
  });
});
