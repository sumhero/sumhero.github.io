import { OBJECT_CATEGORIES } from './object-categories.js';

const RANGES = { easy: [1, 5], normal: [2, 7], hard: [5, 10] };
const CHOICE_COUNT = 5;
const MIN_DISTANCE = 18;

export const CountObjectsGame = {
  id: 'count_objects',
  nameKey: 'countObjects',
  emoji: '🔢',
  domain: 'nombres',
  rounds: { easy: 10, normal: 10, hard: 10 },
  setup: 'category',

  generate(difficulty, ctx) {
    const { rng, count, category } = ctx;
    const [min, max] = RANGES[difficulty];
    const selected = OBJECT_CATEGORIES.find(c => c.key === category) || OBJECT_CATEGORIES[0];
    const emojis = shuffle([...selected.emojis], rng);

    const exercises = [];
    let last = -1;

    for (let i = 0; i < count; i++) {
      let objectCount;
      let guard = 0;
      do {
        objectCount = Math.floor(rng() * (max - min + 1)) + min;
        guard++;
      } while (objectCount === last && max > min && guard < 200);
      last = objectCount;

      const emoji = emojis[i % emojis.length];
      exercises.push({
        correctAnswer: objectCount,
        emoji,
        promptHtml: renderField(objectCount, emoji, rng),
        choices: buildChoices(objectCount, min, max, rng),
      });
    }

    return exercises;
  },
};

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

function generatePositions(count, rng) {
  const positions = [];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x, y;
    do {
      x = 10 + rng() * 80;
      y = 10 + rng() * 80;
      attempts++;
    } while (attempts < 100 && positions.some(p =>
      Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < MIN_DISTANCE
    ));
    positions.push({ x, y });
  }

  return positions;
}

function renderField(count, emoji, rng) {
  return '<div class="objects-field">' +
    generatePositions(count, rng).map(pos =>
      '<span class="count-object" style="left:' + pos.x + '%;top:' + pos.y + '%">' +
        emoji +
      '</span>'
    ).join('') +
  '</div>';
}

function buildChoices(correct, min, max, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (max - min + 1)) + min;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  return shuffle(choices, rng);
}
