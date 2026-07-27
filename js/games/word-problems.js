import { OBJECT_CATEGORIES } from './object-categories.js';

const CHOICE_CEILING = { easy: 10, normal: 20, hard: 20 };
const MAX_TWO_STEP = 20;
// Every addAdd total, and every addSub pre-subtraction sum (a+b), is at least
// this, so hard's two-step problems are genuinely harder than normal's
// one-step-within-20 range rather than occasionally trivial (e.g. 1+1+1, or
// 2+2-3=1 — arithmetically easier than a normal one-step problem summing to
// 18). Exported so the test can assert against this constant rather than a
// duplicated literal.
export const MIN_TWO_STEP_TOTAL = 12;
const CHOICE_COUNT = 5;
// No quantity that is spoken aloud inside a sentence may be 1: every
// template's verb agrees with a plural/invariant count ("il y en avait {a}",
// "es waren {a} da", "було {a}") and breaks for a singular count in all five
// languages (fr "est arrivé", de "war"/"kam", uk/ru gendered singular verbs).
// Every generator below keeps its interpolated a/b/c at 2 or above instead.
const MIN_SPOKEN_COUNT = 2;

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
  // Both a and b are spoken, so both stay at 2 or above; a leaves room for
  // b >= 2 to still fit under max.
  const a = MIN_SPOKEN_COUNT + Math.floor(rng() * (max - 2 * MIN_SPOKEN_COUNT + 1));
  const b = MIN_SPOKEN_COUNT + Math.floor(rng() * (max - a - MIN_SPOKEN_COUNT + 1));

  return { kind: 'add', key: 'wpAdd', a, b, c: null, answer: a + b, params: { a, b } };
}

function subStory(max, rng) {
  // b is spoken and must be >= 2, and b <= a - 1 (so the answer is never
  // zero), so a needs at least one more headroom slot than b's minimum,
  // hence a's floor is MIN_SPOKEN_COUNT + 1.
  const a = (MIN_SPOKEN_COUNT + 1) + Math.floor(rng() * (max - MIN_SPOKEN_COUNT));
  // MIN_SPOKEN_COUNT..a-1, so at least one is left, the answer is never
  // zero, and b is never the spoken singular.
  const b = MIN_SPOKEN_COUNT + Math.floor(rng() * (a - MIN_SPOKEN_COUNT));

  return { kind: 'sub', key: 'wpSub', a, b, c: null, answer: a - b, params: { a, b } };
}

function addAddStory(rng) {
  // Split a total into three spoken parts of at least MIN_SPOKEN_COUNT each,
  // so both steps are real, nothing goes negative, and no part is ever the
  // spoken singular. The total itself starts at MIN_TWO_STEP_TOTAL so hard
  // stays genuinely harder than normal's one-step-within-20 range.
  const total = MIN_TWO_STEP_TOTAL + Math.floor(rng() * (MAX_TWO_STEP - MIN_TWO_STEP_TOTAL + 1));
  // a leaves at least 2 * MIN_SPOKEN_COUNT behind so both b and c can still
  // be >= MIN_SPOKEN_COUNT.
  const a = MIN_SPOKEN_COUNT + Math.floor(rng() * (total - 3 * MIN_SPOKEN_COUNT + 1));
  const remaining = total - a;
  const b = MIN_SPOKEN_COUNT + Math.floor(rng() * (remaining - 2 * MIN_SPOKEN_COUNT + 1));
  const c = remaining - b;

  return { kind: 'addAdd', key: 'wpAddAdd', a, b, c, answer: total, params: { a, b, c } };
}

function addSubStory(rng) {
  // The pre-subtraction sum (a + b) is drawn first, from
  // MIN_TWO_STEP_TOTAL..MAX_TWO_STEP — the same floor addAddStory applies to
  // its total, so the addition step here is never trivially small either
  // (e.g. 2 + 2, which the old unfloored version could produce). a and b are
  // then split off that sum so both stay at 2 or above; c is spoken, stays
  // at 2 or above, and is capped so the final answer is at least one
  // (c <= sum - 1).
  const sum = MIN_TWO_STEP_TOTAL + Math.floor(rng() * (MAX_TWO_STEP - MIN_TWO_STEP_TOTAL + 1));
  const a = MIN_SPOKEN_COUNT + Math.floor(rng() * (sum - 2 * MIN_SPOKEN_COUNT + 1));
  const b = sum - a;
  const c = MIN_SPOKEN_COUNT + Math.floor(rng() * (sum - MIN_SPOKEN_COUNT));

  return { kind: 'addSub', key: 'wpAddSub', a, b, c, answer: sum - c, params: { a, b, c } };
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
