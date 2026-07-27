import { describe, it, expect } from 'vitest';
import { CountObjectsGame } from '../../js/games/count-objects.js';
import { OBJECT_CATEGORIES } from '../../js/games/object-categories.js';

function ctx(count, category = 'animals', rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category };
}

const RANGES = { easy: [1, 5], normal: [2, 7], hard: [5, 10] };

describe('CountObjectsGame', () => {
  it('declares a category pre-screen', () => {
    expect(CountObjectsGame.id).toBe('count_objects');
    expect(CountObjectsGame.setup).toBe('category');
    expect(CountObjectsGame.domain).toBe('nombres');
  });

  it('keeps the ten object categories', () => {
    expect(OBJECT_CATEGORIES).toHaveLength(10);
    expect(OBJECT_CATEGORIES.map(c => c.key)).toContain('animals');
  });

  for (const [difficulty, [min, max]] of Object.entries(RANGES)) {
    it(`counts between ${min} and ${max} on ${difficulty}`, () => {
      for (const ex of CountObjectsGame.generate(difficulty, ctx(10))) {
        expect(ex.correctAnswer).toBeGreaterThanOrEqual(min);
        expect(ex.correctAnswer).toBeLessThanOrEqual(max);
      }
    });
  }

  it('generates the requested count', () => {
    expect(CountObjectsGame.generate('easy', ctx(6))).toHaveLength(6);
  });

  it('always includes the correct answer', () => {
    for (const ex of CountObjectsGame.generate('normal', ctx(10))) {
      expect(ex.choices).toContain(ex.correctAnswer);
    }
  });

  it('draws emoji from the chosen category', () => {
    const food = OBJECT_CATEGORIES.find(c => c.key === 'food').emojis;
    for (const ex of CountObjectsGame.generate('easy', ctx(10, 'food'))) {
      expect(food).toContain(ex.emoji);
    }
  });

  it('never shows the same count twice in a row', () => {
    const counts = CountObjectsGame.generate('normal', ctx(20)).map(e => e.correctAnswer);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).not.toBe(counts[i - 1]);
    }
  });

  it('renders one positioned element per object', () => {
    const ex = CountObjectsGame.generate('easy', ctx(1))[0];
    const matches = ex.promptHtml.match(/class="count-object"/g);
    expect(matches).toHaveLength(ex.correctAnswer);
  });

  it('falls back to the first category when none is supplied', () => {
    const animals = OBJECT_CATEGORIES[0].emojis;
    const exercises = CountObjectsGame.generate('easy', { ...ctx(3), category: null });
    expect(exercises).toHaveLength(3);
    for (const ex of exercises) {
      expect(animals).toContain(ex.emoji);
    }
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    const a = CountObjectsGame.generate('normal', ctx(5, 'animals', seeded)).map(e => e.correctAnswer);
    const b = CountObjectsGame.generate('normal', ctx(5, 'animals', seeded)).map(e => e.correctAnswer);
    expect(a).toEqual(b);
  });

  it('keeps counted objects far enough apart to be countable', () => {
    // MIN_DISTANCE mirrors js/games/count-objects.js's own constant; a real
    // parity bug (objects allowed to overlap) must fail this test, not just
    // the object-count assertion above. Easy difficulty (max count 5) is
    // used because the generator's placement retry loop (100 attempts) is
    // essentially guaranteed to succeed at that density, so this does not
    // flake on legitimate crowded-board near-misses.
    const MIN_DISTANCE = 18;

    for (const ex of CountObjectsGame.generate('easy', ctx(20))) {
      const positions = [...ex.promptHtml.matchAll(/left:([\d.]+)%;top:([\d.]+)%/g)]
        .map(([, x, y]) => ({ x: parseFloat(x), y: parseFloat(y) }));

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dist = Math.sqrt(
            (positions[i].x - positions[j].x) ** 2 + (positions[i].y - positions[j].y) ** 2
          );
          expect(dist).toBeGreaterThanOrEqual(MIN_DISTANCE);
        }
      }
    }
  });
});
