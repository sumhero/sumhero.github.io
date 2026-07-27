import { describe, it, expect } from 'vitest';
import { MoneyGame } from '../../js/games/money.js';
import { CoinRenderer } from '../../js/render/coins.js';

function ctx(count, rng = Math.random) {
  return {
    rng,
    t: (key, params) => key + '(' + (params && params.n !== undefined ? params.n : '') + ')',
    lang: 'fr',
    count,
    category: null,
  };
}

const DENOMINATIONS = [1, 2, 5, 10, 20];

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length;
}

function pieces(html) {
  return countMatches(html, /class="coin"/g) + countMatches(html, /class="note"/g);
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function values(ex) {
  return ex.choices.map(c => (typeof c === 'object' ? c.value : c));
}

describe('MoneyGame', () => {
  it('is registered for the measures domain with the standard round counts', () => {
    expect(MoneyGame.id).toBe('money');
    expect(MoneyGame.nameKey).toBe('money');
    expect(MoneyGame.domain).toBe('mesures');
    expect(MoneyGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(MoneyGame.layoutClass).toBe('money-game-layout');
    expect(MoneyGame.choiceClass).toBe('money-choice-btn');
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(MoneyGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(MoneyGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  it('uses whole euros only, never a decimal or an invented denomination', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of MoneyGame.generate(difficulty, ctx(25))) {
        const allCoins = ex.pay ? ex.purses.flatMap(p => p.coins) : ex.coins;
        for (const coin of allCoins) {
          expect(DENOMINATIONS).toContain(coin);
        }
        expect(Number.isInteger(ex.correctAnswer)).toBe(true);
        for (const value of values(ex)) {
          expect(Number.isInteger(value)).toBe(true);
        }
      }
    }
  });

  it('depicts a purse whose pieces add up to the stated total on easy and normal', () => {
    // The trap: a purse drawn with pieces that do not sum to the answer the
    // child is expected to give. Both the data and the rendered markup are
    // checked, so a renderer that drops a piece fails too.
    for (const [difficulty, max] of [['easy', 10], ['normal', 20]]) {
      for (const ex of MoneyGame.generate(difficulty, ctx(30))) {
        expect(ex.pay).toBe(false);
        expect(sum(ex.coins)).toBe(ex.total);
        expect(ex.correctAnswer).toBe(ex.total);
        expect(ex.total).toBeGreaterThanOrEqual(2);
        expect(ex.total).toBeLessThanOrEqual(max);
        expect(ex.coins.length).toBeGreaterThanOrEqual(2);
        expect(pieces(ex.promptHtml)).toBe(ex.coins.length);
        expect(ex.promptHtml).toContain(CoinRenderer.render(ex.coins));
        expect(ex.promptHtml).toContain('moneyPrompt');
      }
    }
  });

  it('restricts easy to 1 € and 2 € coins and normal to at most a 10 € note', () => {
    for (const ex of MoneyGame.generate('easy', ctx(30))) {
      for (const coin of ex.coins) expect([1, 2]).toContain(coin);
    }
    for (const ex of MoneyGame.generate('normal', ctx(30))) {
      for (const coin of ex.coins) expect([1, 2, 5, 10]).toContain(coin);
    }
  });

  it('asks for an exact payment on hard that really is payable', () => {
    // The trap: a price no offered purse can make. Every purse must add up to
    // its own stated sum, and exactly one of those sums must be the price.
    for (const ex of MoneyGame.generate('hard', ctx(30))) {
      expect(ex.pay).toBe(true);
      expect(ex.target).toBeGreaterThanOrEqual(3);
      expect(ex.target).toBeLessThanOrEqual(20);
      expect(ex.correctAnswer).toBe(ex.target);

      for (const purse of ex.purses) {
        expect(sum(purse.coins)).toBe(purse.sum);
        expect(purse.coins.length).toBeGreaterThan(0);
      }

      const payers = ex.purses.filter(p => p.sum === ex.target);
      expect(payers).toHaveLength(1);
      expect(sum(payers[0].coins)).toBe(ex.target);
      expect(ex.promptHtml).toContain('moneyPayPrompt(' + ex.target + ')');
    }
  });

  it('draws every hard choice as the purse it stands for', () => {
    for (const ex of MoneyGame.generate('hard', ctx(25))) {
      expect(ex.choices).toHaveLength(5);
      for (const choice of ex.choices) {
        const purse = ex.purses.find(p => p.sum === choice.value);
        expect(purse).toBeDefined();
        expect(choice.html).toBe(CoinRenderer.render(purse.coins));
        expect(pieces(choice.html)).toBe(purse.coins.length);
      }
      expect(ex.choices.filter(c => c.value === ex.target)).toHaveLength(1);
    }
  });

  it('always includes the correct answer among five distinct in-range choices', () => {
    for (const [difficulty, max] of [['easy', 10], ['normal', 20], ['hard', 20]]) {
      for (const ex of MoneyGame.generate(difficulty, ctx(25))) {
        expect(ex.choices).toHaveLength(5);
        expect(new Set(values(ex)).size).toBe(5);
        expect(values(ex)).toContain(ex.correctAnswer);
        for (const value of values(ex)) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('moves the correct answer around instead of parking it at one index', () => {
    // Shape A: both branches build [correct, ...distractors] and then shuffle,
    // so the pre-shuffle index is a fixed 0 and deleting the shuffle collapses
    // every observed position to 0.
    for (const difficulty of ['normal', 'hard']) {
      const positions = new Set();
      for (let i = 0; i < 30; i++) {
        for (const ex of MoneyGame.generate(difficulty, ctx(10))) {
          positions.add(values(ex).indexOf(ex.correctAnswer));
        }
      }
      expect(positions.size).toBeGreaterThan(1);
    }
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = MoneyGame.generate('hard', ctx(5, seeded));
    const b = MoneyGame.generate('hard', ctx(5, seeded));
    expect(a.map(e => e.target)).toEqual(b.map(e => e.target));
    expect(a.map(e => JSON.stringify(e.purses))).toEqual(b.map(e => JSON.stringify(e.purses)));
    expect(a.map(e => e.promptHtml)).toEqual(b.map(e => e.promptHtml));
  });

  // Generator-level invariants required by the review of Task 3's
  // CoinRenderer: the renderer silently skips any denomination outside
  // {1, 2, 5, 10, 20}, so an SVG-only check could pass while the underlying
  // data (and therefore the correct answer) is wrong. These assert directly
  // on generate()'s output, not on rendered markup, across every difficulty.
  describe('generator-level money invariants (do not weaken)', () => {
    it('every emitted denomination is one of 1, 2, 5, 10, 20 €, for many seeded exercises', () => {
      for (const difficulty of ['easy', 'normal', 'hard']) {
        for (let seed = 0; seed < 20; seed++) {
          let n = seed + 1;
          const rng = () => {
            n = (n * 9301 + 49297) % 233280;
            return n / 233280;
          };
          for (const ex of MoneyGame.generate(difficulty, ctx(15, rng))) {
            const allCoins = ex.pay ? ex.purses.flatMap(p => p.coins) : ex.coins;
            expect(allCoins.length).toBeGreaterThan(0);
            for (const coin of allCoins) {
              expect(DENOMINATIONS).toContain(coin);
            }
          }
        }
      }
    });

    it('every depicted purse/note set sums exactly to the total the question asks about, for many seeded exercises', () => {
      for (const difficulty of ['easy', 'normal', 'hard']) {
        for (let seed = 0; seed < 20; seed++) {
          let n = seed + 1;
          const rng = () => {
            n = (n * 9301 + 49297) % 233280;
            return n / 233280;
          };
          for (const ex of MoneyGame.generate(difficulty, ctx(15, rng))) {
            if (ex.pay) {
              for (const purse of ex.purses) {
                expect(sum(purse.coins)).toBe(purse.sum);
              }
              const target = ex.purses.find(p => p.sum === ex.target);
              expect(target).toBeDefined();
              expect(sum(target.coins)).toBe(ex.target);
            } else {
              expect(sum(ex.coins)).toBe(ex.total);
              expect(ex.total).toBe(ex.correctAnswer);
            }
          }
        }
      }
    });
  });

  it('never offers the same purse twice in a counting session', () => {
    // easy and normal are count mode: the question is the purse, so two purses
    // that both total 12 with different coins are different exercises. 23 and
    // 74 distinct purses against 5 and 10 rounds — full distinctness held in
    // 500 000 of 500 000 simulated sessions, so this is a hard assertion.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10]]) {
      for (let session = 0; session < 20; session++) {
        const keys = MoneyGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.coins.join('-'));

        expect(new Set(keys).size, difficulty).toBe(rounds);
      }
    }
  });

  it('can offer two different purses that share the same total in one session', () => {
    // The decisive test for the count-mode key. A `total` key is not merely
    // "close enough" to the composition key — it is strictly stronger:
    // distinct sums always imply distinct coin arrays, so a session keyed on
    // `total` can never show two different purses with the same total. The
    // shipped key (`coins.join('-')`) allows exactly that, because a purse of
    // 2+2+1 and a single 5 € note are different counting tasks for a
    // six-year-old even though they add to the same total. Measured with the
    // shipped key: this occurs in 56% of easy sessions and 92% of normal
    // sessions; with a `total` key it is 0.00%. 50 sessions makes a miss
    // astronomically unlikely (for easy, (1 - 0.56)^50 ~= 3e-17).
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10]]) {
      let sawSameTotalDifferentCoins = false;

      for (let session = 0; session < 50 && !sawSameTotalDifferentCoins; session++) {
        const byTotal = new Map();
        for (const ex of MoneyGame.generate(difficulty, ctx(rounds))) {
          const key = ex.coins.join('-');
          if (!byTotal.has(ex.total)) byTotal.set(ex.total, new Set());
          byTotal.get(ex.total).add(key);
        }
        if ([...byTotal.values()].some(keys => keys.size > 1)) {
          sawSameTotalDifferentCoins = true;
        }
      }

      expect(sawSameTotalDifferentCoins, difficulty).toBe(true);
    }
  });

  it('never asks for the same price twice in a row on hard', () => {
    // buildPayment draws target from 3..20 — eighteen prices against twenty
    // rounds, so uniqueness is impossible and back-to-back avoidance is the
    // whole promise. Before this change 66.1% of hard sessions repeated a
    // price back-to-back. 200 sessions (up from 20) gives roughly 1e-5
    // false-green odds against a broken re-seed, for about 113ms extra cost.
    for (let session = 0; session < 200; session++) {
      const targets = MoneyGame.generate('hard', ctx(20)).map(ex => ex.target);

      for (let i = 1; i < targets.length; i++) {
        expect(targets[i], 'round ' + i).not.toBe(targets[i - 1]);
      }
    }
  });

  it('spreads a hard session across most of the price range', () => {
    // Independent literal: the space is eighteen prices (3..20) and the worst
    // coverage seen in 500 000 simulated sessions was fourteen, so thirteen is
    // a floor with headroom. Not "all twenty distinct" — that is arithmetically
    // impossible and a test asserting it would be a lie.
    for (let session = 0; session < 20; session++) {
      const targets = MoneyGame.generate('hard', ctx(20)).map(ex => ex.target);

      expect(new Set(targets).size).toBeGreaterThanOrEqual(13);
    }
  });
});
