import { ShapeRenderer, SHAPE_KEYS, SHAPE_SIDES, SHAPE_CORNERS } from '../render/shapes.js';

const NAME_KEYS = {
  square: 'shapeSquare',
  rectangle: 'shapeRectangle',
  triangle: 'shapeTriangle',
  circle: 'shapeCircle',
  rhombus: 'shapeRhombus',
};

// Every multiple of 15 degrees from 15 to 345 (0 excluded — the hard band
// must actually look turned).
const HARD_ROTATIONS_FULL = [
  15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240,
  255, 270, 285, 300, 315, 330, 345,
];
// The square alone drops every multiple of 45: a square at 45/135/225/315
// literally *is* a rhombus (a square is a special case of a rhombus), and
// with `losange` sitting in the choice list the question would have two
// defensible correct answers. No other shape has that ambiguity — a
// triangle at 135° is unambiguously a rotated triangle — so every other
// hard shape gets the full rotation range instead of this narrower one.
const HARD_ROTATIONS_SQUARE = HARD_ROTATIONS_FULL.filter(r => r % 45 !== 0);
// Never 1 — the hard band must actually rescale as well as rotate.
const HARD_SCALES = [0.6, 0.75, 1.3, 1.5];
// Derived, not hand-duplicated, so it cannot drift from SHAPE_KEYS. A circle
// is invariant under rotation by definition, so a circle round in the hard
// band would be a free point; it stays in easy and normal, where "no sides"
// is the thing being taught.
const HARD_SHAPES = SHAPE_KEYS.filter(key => key !== 'circle');
// Fixed count options. Every true answer is 0, 3 or 4, so the correct value is
// always present and the distractors never move.
const COUNT_CHOICES = [0, 2, 3, 4, 5];

export const ShapesGame = {
  id: 'shapes',
  nameKey: 'shapes',
  emoji: '📐',
  domain: 'geometrie',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'shape-game-layout',
  choiceClass: 'shape-choice-btn',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const exercises = [];

    for (let i = 0; i < count; i++) {
      if (difficulty === 'normal') {
        exercises.push(countExercise(rng, t));
      } else if (difficulty === 'hard') {
        const shape = pick(HARD_SHAPES, rng);
        const rotations = shape === 'square' ? HARD_ROTATIONS_SQUARE : HARD_ROTATIONS_FULL;
        exercises.push(nameExercise(
          rng, t, shape, pick(rotations, rng), pick(HARD_SCALES, rng)
        ));
      } else {
        exercises.push(nameExercise(rng, t, pick(SHAPE_KEYS, rng), 0, 1));
      }
    }

    return exercises;
  },
};

function nameExercise(rng, t, shape, rotate, scale) {
  return {
    shape,
    rotate,
    scale,
    mode: 'name',
    bodyClass: 'shape-name-mode',
    correctAnswer: shape,
    promptHtml:
      ShapeRenderer.render(shape, { rotate, scale }) +
      '<div class="op-hint">' + t('shapesNamePrompt') + '</div>',
    // Object-form choices: the English key travels as the value so the answer
    // never depends on the active language, the translated word is what the
    // child reads. The same seam compare uses for its < = > signs.
    choices: shuffle(
      SHAPE_KEYS.map(key => ({ value: key, html: t(NAME_KEYS[key]) })),
      rng
    ),
  };
}

function countExercise(rng, t) {
  const shape = pick(SHAPE_KEYS, rng);
  const countSides = rng() < 0.5;

  return {
    shape,
    rotate: 0,
    scale: 1,
    mode: countSides ? 'sides' : 'corners',
    bodyClass: 'shape-count-mode',
    correctAnswer: countSides ? SHAPE_SIDES[shape] : SHAPE_CORNERS[shape],
    promptHtml:
      ShapeRenderer.render(shape) +
      '<div class="op-hint">' +
        t(countSides ? 'shapesSidesPrompt' : 'shapesCornersPrompt') +
      '</div>',
    choices: shuffle(COUNT_CHOICES.slice(), rng),
  };
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
