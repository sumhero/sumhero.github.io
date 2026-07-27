import { describe, it, expect } from 'vitest';
import { SubtractionGame } from '../../js/games/subtraction.js';
import { OBJECT_CATEGORIES } from '../../js/games/object-categories.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const MAX = { easy: 5, normal: 10, hard: 20 };
const ALL_EMOJIS = new Set(OBJECT_CATEGORIES.flatMap(c => c.emojis));

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

describe('SubtractionGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(SubtractionGame.id).toBe('subtraction');
    expect(SubtractionGame.domain).toBe('nombres');
    expect(SubtractionGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(SubtractionGame.layoutClass).toBe('num-game-layout');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(SubtractionGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(SubtractionGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, max] of Object.entries(MAX)) {
    it(`stays within ${max} on ${difficulty}`, () => {
      for (const ex of SubtractionGame.generate(difficulty, ctx(25))) {
        expect(ex.minuend).toBeGreaterThanOrEqual(2);
        expect(ex.minuend).toBeLessThanOrEqual(max);
        expect(ex.subtrahend).toBeGreaterThanOrEqual(1);
        expect(ex.subtrahend).toBeLessThanOrEqual(ex.minuend - 1);
        expect(ex.correctAnswer).toBe(ex.minuend - ex.subtrahend);
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it('always includes the correct answer among five distinct in-range choices', () => {
    for (const [difficulty, max] of Object.entries(MAX)) {
      for (const ex of SubtractionGame.generate(difficulty, ctx(20))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(choice).toBeGreaterThanOrEqual(0);
          expect(choice).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of SubtractionGame.generate('normal', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('draws one emoji per unit of the minuend and crosses out the subtrahend', () => {
    for (const ex of SubtractionGame.generate('hard', ctx(20))) {
      expect(countMatches(ex.promptHtml, /class="sub-object"/g))
        .toBe(ex.minuend - ex.subtrahend);
      expect(countMatches(ex.promptHtml, /class="sub-object removed"/g))
        .toBe(ex.subtrahend);
      // Anchored to a quote or space right after "sub-object" so this doesn't also
      // count the wrapping `<div class="sub-objects">` (plural), which is a substring
      // match of the unanchored pattern but not an individual object span.
      expect(countMatches(ex.promptHtml, /class="sub-object["\s]/g)).toBe(ex.minuend);
    }
  });

  it('uses one emoji from OBJECT_CATEGORIES for the whole exercise', () => {
    for (const ex of SubtractionGame.generate('normal', ctx(20))) {
      expect(ALL_EMOJIS.has(ex.emoji)).toBe(true);
      expect(countMatches(ex.promptHtml, new RegExp(ex.emoji, 'g'))).toBe(ex.minuend);
    }
  });

  it('varies the emoji across a session instead of freezing on one', () => {
    const emojis = new Set();
    for (let i = 0; i < 10; i++) {
      for (const ex of SubtractionGame.generate('normal', ctx(10))) emojis.add(ex.emoji);
    }
    expect(emojis.size).toBeGreaterThan(1);
  });

  it('shows the equation and takes its hint from ctx.t', () => {
    const ex = SubtractionGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain(ex.minuend + ' − ' + ex.subtrahend + ' = ?');
    expect(ex.promptHtml).toContain('subtractionPrompt');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = SubtractionGame.generate('normal', ctx(5, seeded));
    const b = SubtractionGame.generate('normal', ctx(5, seeded));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
  });
});
