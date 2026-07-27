import { describe, it, expect } from 'vitest';
import { DiceAdditionGame } from '../../js/games/dice-addition.js';
import { DiceRenderer } from '../../js/render/dice.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const LIMITS = { easy: 4, normal: 5, hard: 6 };

describe('DiceAdditionGame', () => {
  it('is registered for the numbers domain', () => {
    expect(DiceAdditionGame.id).toBe('dice_addition');
    expect(DiceAdditionGame.domain).toBe('nombres');
    expect(DiceAdditionGame.rounds).toBe('ask');
  });

  it('generates exactly the requested number of exercises', () => {
    expect(DiceAdditionGame.generate('easy', ctx(7))).toHaveLength(7);
  });

  for (const [difficulty, max] of Object.entries(LIMITS)) {
    it(`keeps operands within 1..${max} on ${difficulty}`, () => {
      for (const ex of DiceAdditionGame.generate(difficulty, ctx(10))) {
        expect(ex.operand1).toBeGreaterThanOrEqual(1);
        expect(ex.operand2).toBeGreaterThanOrEqual(1);
        expect(ex.operand1).toBeLessThanOrEqual(max);
        expect(ex.operand2).toBeLessThanOrEqual(max);
      }
    });
  }

  it('always includes the correct answer among the choices', () => {
    for (const ex of DiceAdditionGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('sets correctAnswer to the sum of the operands', () => {
    for (const ex of DiceAdditionGame.generate('hard', ctx(10))) {
      expect(ex.correctAnswer).toBe(ex.operand1 + ex.operand2);
    }
  });

  it('never repeats a choice within an exercise', () => {
    for (const ex of DiceAdditionGame.generate('normal', ctx(10))) {
      expect(new Set(ex.choices).size).toBe(ex.choices.length);
    }
  });

  it('offers five choices', () => {
    for (const ex of DiceAdditionGame.generate('easy', ctx(5))) {
      expect(ex.choices).toHaveLength(5);
    }
  });

  it('orders operands ascending on easy and normal', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of DiceAdditionGame.generate(difficulty, ctx(10))) {
        expect(ex.operand1).toBeLessThanOrEqual(ex.operand2);
      }
    }
  });

  it('sorts easy exercises by increasing sum', () => {
    const sums = DiceAdditionGame.generate('easy', ctx(8)).map(e => e.correctAnswer);
    expect([...sums]).toEqual([...sums].sort((a, b) => a - b));
  });

  it('renders both dice in the prompt', () => {
    // A single fixed value (e.g. () => 0.9) would make op1 === op2, so a bug
    // that always renders die 1 as `render(1)` could still pass by matching
    // die 2's markup. Cycle two distinct values instead: on easy (maxOperand
    // 4) this deterministically yields operand1=2, operand2=4 — both non-1,
    // both different from each other — so each die's markup can only be
    // found where it actually belongs.
    const values = [0.3, 0.9];
    let i = 0;
    const rng = () => values[i++ % values.length];
    const ex = DiceAdditionGame.generate('easy', ctx(1, rng))[0];
    expect(ex.operand1).toBe(2);
    expect(ex.operand2).toBe(4);
    expect(ex.promptHtml).toContain('dice-plus');
    expect(ex.promptHtml).toContain(DiceRenderer.render(ex.operand1));
    expect(ex.promptHtml).toContain(DiceRenderer.render(ex.operand2));
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = DiceAdditionGame.generate('normal', ctx(5, seeded));
    const b = DiceAdditionGame.generate('normal', ctx(5, seeded));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
  });

  it('does not repeat an operand pair within a session', () => {
    const keys = DiceAdditionGame.generate('hard', ctx(10))
      .map(e => e.operand1 + ':' + e.operand2);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
