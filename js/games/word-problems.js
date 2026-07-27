import { OBJECT_CATEGORIES } from './object-categories.js';

const CHOICE_CEILING = { easy: 10, normal: 20, hard: 20 };
const MAX_TWO_STEP = 20;
const CHOICE_COUNT = 5;

export const WordProblemsGame = {
  id: 'word_problems',
  nameKey: 'wordProblems',
  emoji: '📖',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'num-game-layout',
  choiceClass: 'wp-choice-btn',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const exercises = [];

    for (let i = 0; i < count; i++) {
      const story = buildStory(difficulty, rng);
      // Interpolated, never concatenated: the templates differ in word order
      // between the five languages, so the quantities have to be placeholders.
      const sentence = t(story.key, story.params);

      const category = OBJECT_CATEGORIES[Math.floor(rng() * OBJECT_CATEGORIES.length)];
      const emoji = category.emojis[Math.floor(rng() * category.emojis.length)];

      exercises.push({
        kind: story.kind,
        a: story.a,
        b: story.b,
        c: story.c,
        emoji,
        correctAnswer: story.answer,
        // The engine's only speech opt-in: a plain-text string on the exercise.
        speak: sentence,
        promptHtml:
          '<div class="wp-icon">' + emoji + '</div>' +
          '<div class="wp-sentence">' + sentence + '</div>',
        choices: buildChoices(story.answer, CHOICE_CEILING[difficulty], rng),
      });
    }

    return exercises;
  },
};

function buildStory(difficulty, rng) {
  if (difficulty === 'easy') return addStory(10, rng);
  if (difficulty === 'normal') return rng() < 0.5 ? addStory(20, rng) : subStory(20, rng);

  return rng() < 0.5 ? addAddStory(rng) : addSubStory(rng);
}

function addStory(max, rng) {
  const a = 1 + Math.floor(rng() * (max - 1));
  const b = 1 + Math.floor(rng() * (max - a));

  return { kind: 'add', key: 'wpAdd', a, b, c: null, answer: a + b, params: { a, b } };
}

function subStory(max, rng) {
  const a = 2 + Math.floor(rng() * (max - 1));
  // 1..a-1, so at least one is left and the answer is never zero.
  const b = 1 + Math.floor(rng() * (a - 1));

  return { kind: 'sub', key: 'wpSub', a, b, c: null, answer: a - b, params: { a, b } };
}

function addAddStory(rng) {
  // Split a total into three parts of at least one each, so both steps are
  // real and nothing goes negative.
  const total = 3 + Math.floor(rng() * (MAX_TWO_STEP - 2));
  const a = 1 + Math.floor(rng() * (total - 2));
  const b = 1 + Math.floor(rng() * (total - a - 1));
  const c = total - a - b;

  return { kind: 'addAdd', key: 'wpAddAdd', a, b, c, answer: total, params: { a, b, c } };
}

function addSubStory(rng) {
  // a + b <= 19 keeps the intermediate total inside 20; c <= a + b - 1 keeps
  // the final answer at one or more.
  const a = 1 + Math.floor(rng() * (MAX_TWO_STEP - 2));
  const b = 1 + Math.floor(rng() * (MAX_TWO_STEP - 1 - a));
  const c = 1 + Math.floor(rng() * (a + b - 1));

  return { kind: 'addSub', key: 'wpAddSub', a, b, c, answer: a + b - c, params: { a, b, c } };
}

function buildChoices(answer, ceiling, rng) {
  const near = [answer - 1, answer + 1, answer - 2, answer + 2, answer - 3, answer + 3]
    .filter(value => value >= 1 && value <= ceiling && value !== answer);

  const choices = [answer];

  for (const candidate of shuffle([...new Set(near)], rng)) {
    if (choices.length >= CHOICE_COUNT) break;
    if (!choices.includes(candidate)) choices.push(candidate);
  }

  let guard = 0;
  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = 1 + Math.floor(rng() * ceiling);
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  return shuffle(choices, rng);
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
