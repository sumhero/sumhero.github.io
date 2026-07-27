import { ShapeRenderer, SHAPE_KEYS, SHAPE_SIDES, SHAPE_CORNERS } from '../render/shapes.js';

const NAME_KEYS = {
  square: 'shapeSquare',
  rectangle: 'shapeRectangle',
  triangle: 'shapeTriangle',
  circle: 'shapeCircle',
  rhombus: 'shapeRhombus',
};

// Multiples of 15 degrees with every multiple of 45 removed. 0/90/180/270 leave
// a square or rectangle axis-aligned, so the child never has to see past the
// turn; 45/135/225/315 stand a square on its corner, where `carré` and
// `losange` are the same picture to a six-year-old and the question stops being
// fair. Neither belongs in the band whose whole point is invariance.
const HARD_ROTATIONS = [
  15, 30, 60, 75, 105, 120, 150, 165, 195, 210, 240, 255, 285, 300, 330, 345,
];
// Never 1 — the hard band must actually rescale as well as rotate.
const HARD_SCALES = [0.6, 0.75, 1.3, 1.5];
// A circle is invariant under rotation by definition, so a circle round in the
// hard band is a free point. It stays in easy and normal, where "no sides" is
// the thing being taught.
const HARD_SHAPES = ['square', 'rectangle', 'triangle', 'rhombus'];
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
        exercises.push(nameExercise(
          rng, t, HARD_SHAPES, pick(HARD_ROTATIONS, rng), pick(HARD_SCALES, rng)
        ));
      } else {
        exercises.push(nameExercise(rng, t, SHAPE_KEYS, 0, 1));
      }
    }

    return exercises;
  },
};

function nameExercise(rng, t, pool, rotate, scale) {
  const shape = pick(pool, rng);

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
