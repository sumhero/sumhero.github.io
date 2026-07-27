import { describe, it, expect } from 'vitest';
import { TensUnitsGame } from '../../js/games/tens-units.js';
import { BaseTenRenderer } from '../../js/render/base-ten.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const RANGE = { easy: [10, 39], normal: [10, 99], hard: [10, 99] };

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

function rods(html) {
  return countMatches(html, /class="base-ten-rod"/g);
}

function unitCubes(html) {
  return countMatches(html, /class="base-ten-unit"/g);
}

function values(ex) {
  return ex.choices.map(c => (typeof c === 'object' ? c.value : c));
}

describe('TensUnitsGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(TensUnitsGame.id).toBe('tens_units');
    expect(TensUnitsGame.nameKey).toBe('tensUnits');
    expect(TensUnitsGame.domain).toBe('nombres');
    expect(TensUnitsGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(TensUnitsGame.layoutClass).toBe('num-game-layout');
    expect(TensUnitsGame.choiceClass).toBe('tens-units-choice-btn');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(TensUnitsGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(TensUnitsGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGE)) {
    it(`keeps the number within ${min}..${max} on ${difficulty}`, () => {
      for (const ex of TensUnitsGame.generate(difficulty, ctx(30))) {
        expect(ex.number).toBeGreaterThanOrEqual(min);
        expect(ex.number).toBeLessThanOrEqual(max);
        expect(ex.correctAnswer).toBe(ex.number);
      }
    });
  }

  it('splits every number into tens and units that add back up to it', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of TensUnitsGame.generate(difficulty, ctx(30))) {
        expect(ex.tens * 10 + ex.units).toBe(ex.number);
        expect(ex.units).toBeGreaterThanOrEqual(0);
        expect(ex.units).toBeLessThanOrEqual(9);
        expect(ex.tens).toBeGreaterThanOrEqual(1);
        expect(ex.tens).toBeLessThanOrEqual(9);
      }
    }
  });

  it('draws blocks for the prompt on easy and normal, one rod per ten and one cube per unit', () => {
    // The trap this catches: a prompt that renders blocks which do not add up
    // to the number the child is being asked for.
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of TensUnitsGame.generate(difficulty, ctx(30))) {
        expect(ex.reverse).toBe(false);
        expect(rods(ex.promptHtml)).toBe(ex.tens);
        expect(unitCubes(ex.promptHtml)).toBe(ex.units);
        expect(rods(ex.promptHtml) * 10 + unitCubes(ex.promptHtml)).toBe(ex.number);
        expect(ex.promptHtml).toContain(BaseTenRenderer.render(ex.tens, ex.units));
        expect(ex.promptHtml).toContain('tensUnitsPrompt');
      }
    }
  });

  it('offers plain numerals as choices on easy and normal', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of TensUnitsGame.generate(difficulty, ctx(20))) {
        for (const choice of ex.choices) {
          expect(typeof choice).toBe('number');
        }
      }
    }
  });

  it('reverses on hard: numeral prompt, block choices, no blocks in the prompt', () => {
    for (const ex of TensUnitsGame.generate('hard', ctx(30))) {
      expect(ex.reverse).toBe(true);
      expect(rods(ex.promptHtml)).toBe(0);
      expect(unitCubes(ex.promptHtml)).toBe(0);
      expect(ex.promptHtml).toContain('<div class="op-question">' + ex.number + '</div>');
      expect(ex.promptHtml).toContain('tensUnitsReversePrompt');
      for (const choice of ex.choices) {
        expect(typeof choice).toBe('object');
        expect(typeof choice.value).toBe('number');
        expect(choice.html).toMatch(/^<svg /);
      }
    }
  });

  it('makes every hard choice depict its own value, and exactly one depict the prompt', () => {
    // Two traps in one: a choice whose blocks do not match its own value, and
    // more than one choice depicting the number the prompt asks for (which
    // would make the exercise unanswerable).
    for (const ex of TensUnitsGame.generate('hard', ctx(30))) {
      for (const choice of ex.choices) {
        expect(rods(choice.html)).toBe(Math.floor(choice.value / 10));
        expect(unitCubes(choice.html)).toBe(choice.value % 10);
        expect(rods(choice.html) * 10 + unitCubes(choice.html)).toBe(choice.value);
      }
      expect(ex.choices.filter(c => c.value === ex.number)).toHaveLength(1);
      const target = BaseTenRenderer.render(ex.tens, ex.units);
      expect(ex.choices.filter(c => c.html === target)).toHaveLength(1);
    }
  });

  it('always includes the correct answer among five distinct in-range choices', () => {
    for (const [difficulty, [min, max]] of Object.entries(RANGE)) {
      for (const ex of TensUnitsGame.generate(difficulty, ctx(25))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(values(ex)).size).toBe(5);
        expect(values(ex)).toContain(ex.correctAnswer);
        for (const value of values(ex)) {
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('offers the swapped-digits distractor when it is in range', () => {
    // 32 for 23 is the mistake this game exists to catch, so it must be on the
    // board rather than replaced by an arbitrary number.
    let seen = 0;
    for (let i = 0; i < 40; i++) {
      for (const ex of TensUnitsGame.generate('normal', ctx(10))) {
        const swapped = ex.units * 10 + ex.tens;
        if (swapped < 10 || swapped > 99 || swapped === ex.number) continue;
        expect(values(ex)).toContain(swapped);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape A: choices are built as [correct, ...distractors] and then
    // shuffled, so the pre-shuffle index is a fixed 0. Deleting the shuffle
    // pins every observed position to 0 and collapses the set to size 1.
    for (const difficulty of ['normal', 'hard']) {
      const positions = new Set();
      for (let i = 0; i < 30; i++) {
        for (const ex of TensUnitsGame.generate(difficulty, ctx(10))) {
          positions.add(values(ex).indexOf(ex.correctAnswer));
        }
      }
      expect(positions.size).toBeGreaterThan(1);
    }
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = TensUnitsGame.generate('hard', ctx(5, seeded));
    const b = TensUnitsGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.number)).toEqual(b.map(e => e.number));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
    expect(a.map(e => JSON.stringify(e.choices))).toEqual(b.map(e => JSON.stringify(e.choices)));
  });
});
