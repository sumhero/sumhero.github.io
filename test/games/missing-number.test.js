import { describe, it, expect } from 'vitest';
import { MissingNumberGame } from '../../js/games/missing-number.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

const MAX = { easy: 20, normal: 100, hard: 100 };

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

describe('MissingNumberGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(MissingNumberGame.id).toBe('missing_number');
    expect(MissingNumberGame.nameKey).toBe('missingNumber');
    expect(MissingNumberGame.domain).toBe('nombres');
    expect(MissingNumberGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(MissingNumberGame.layoutClass).toBe('num-game-layout');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(MissingNumberGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(MissingNumberGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('builds a four-term ascending run with an even step', () => {
    for (const [difficulty, max] of Object.entries(MAX)) {
      for (const ex of MissingNumberGame.generate(difficulty, ctx(25))) {
        expect(ex.terms).toHaveLength(4);
        for (let i = 1; i < ex.terms.length; i++) {
          expect(ex.terms[i] - ex.terms[i - 1]).toBe(ex.step);
        }
        for (const term of ex.terms) {
          expect(term).toBeGreaterThanOrEqual(1);
          expect(term).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('counts by one on easy and normal', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of MissingNumberGame.generate(difficulty, ctx(25))) {
        expect(ex.step).toBe(1);
      }
    }
  });

  it('counts by two, five or ten on hard, and uses all three over a long run', () => {
    const steps = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of MissingNumberGame.generate('hard', ctx(20))) {
        expect([2, 5, 10]).toContain(ex.step);
        steps.add(ex.step);
      }
    }
    expect([...steps].sort((a, b) => a - b)).toEqual([2, 5, 10]);
  });

  it('answers with the blanked term', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of MissingNumberGame.generate(difficulty, ctx(25))) {
        expect(ex.blankIndex).toBeGreaterThanOrEqual(0);
        expect(ex.blankIndex).toBeLessThan(4);
        expect(ex.correctAnswer).toBe(ex.terms[ex.blankIndex]);
      }
    }
  });

  it('blanks exactly one term and prints the other three', () => {
    for (const ex of MissingNumberGame.generate('normal', ctx(20))) {
      expect(countMatches(ex.promptHtml, /class="sequence-term blank"/g)).toBe(1);
      expect(countMatches(ex.promptHtml, /class="sequence-term"/g)).toBe(3);
      expect(ex.promptHtml).not.toContain(
        '<span class="sequence-term">' + ex.correctAnswer + '</span>'
      );
      ex.terms.forEach((term, index) => {
        if (index === ex.blankIndex) return;
        expect(ex.promptHtml).toContain('<span class="sequence-term">' + term + '</span>');
      });
    }
  });

  it('moves the blank around instead of always hiding the same term', () => {
    const blanks = new Set();
    for (let i = 0; i < 20; i++) {
      for (const ex of MissingNumberGame.generate('normal', ctx(10))) blanks.add(ex.blankIndex);
    }
    expect([...blanks].sort()).toEqual([0, 1, 2, 3]);
  });

  it('always includes the correct answer among five distinct in-range choices', () => {
    for (const [difficulty, max] of Object.entries(MAX)) {
      for (const ex of MissingNumberGame.generate(difficulty, ctx(25))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(ex.choices).size).toBe(5);
        expect(ex.choices).toContain(ex.correctAnswer);
        for (const choice of ex.choices) {
          expect(choice).toBeGreaterThanOrEqual(1);
          expect(choice).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      for (const ex of MissingNumberGame.generate('normal', ctx(10))) {
        positions.add(ex.choices.indexOf(ex.correctAnswer));
      }
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('takes its hint from ctx.t rather than reaching for I18n', () => {
    const ex = MissingNumberGame.generate('easy', ctx(1))[0];
    expect(ex.promptHtml).toContain('missingNumberPrompt');
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = MissingNumberGame.generate('hard', ctx(5, seeded));
    const b = MissingNumberGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
    expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
  });
});
