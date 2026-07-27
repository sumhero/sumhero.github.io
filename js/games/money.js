import { CoinRenderer } from '../render/coins.js';
import { drawDistinct } from '../engine/unique.js';

// Whole euros only — no cents. Decimal money is CE1 material.
const DENOMINATIONS = [1, 2, 5, 10, 20];
const MAX_PAY_TOTAL = 20;
const CHOICE_COUNT = 5;

const CONFIG = {
  easy: { pay: false, allowed: [1, 2], maxTotal: 10, minItems: 2, maxItems: 6 },
  normal: { pay: false, allowed: [1, 2, 5, 10], maxTotal: 20, minItems: 2, maxItems: 5 },
  hard: { pay: true, maxTotal: MAX_PAY_TOTAL },
};

export const MoneyGame = {
  id: 'money',
  nameKey: 'money',
  emoji: '💶',
  domain: 'mesures',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'money-game-layout',
  choiceClass: 'money-choice-btn',

  // The identity of a money exercise depends on the mode. In count mode the
  // question *is* the purse, so two purses that both total 12 with different
  // coins are different exercises — keying on the total instead would let a
  // 2+2+1 purse and a single 5 € note collide as "the same question" and
  // silently drop one of them from the session, even though a six-year-old
  // counting pieces sees them as two different counting tasks. In pay mode
  // the question is the price; the distractor purses are redrawn every round
  // and are not part of it. Hard has eighteen prices against twenty rounds,
  // so it lives in drawDistinct's refill path.
  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const config = CONFIG[difficulty];

    return drawDistinct(
      count,
      () => (config.pay ? buildPayment(rng, t) : buildCount(config, rng, t)),
      exercise => (exercise.pay ? String(exercise.target) : exercise.coins.join('-'))
    );
  },
};

function buildCount(config, rng, t) {
  const coins = buildPurse(config, rng);
  const total = sum(coins);

  return {
    pay: false,
    coins,
    total,
    target: null,
    purses: null,
    correctAnswer: total,
    promptHtml:
      CoinRenderer.render(coins) +
      '<div class="op-hint">' + t('moneyPrompt') + '</div>',
    choices: shuffle([total, ...pickTotals(total, config.maxTotal, rng)], rng),
  };
}

function buildPayment(rng, t) {
  // 3..20. Below 3 there is only one sensible purse, which would make every
  // distractor obviously wrong.
  const target = 3 + Math.floor(rng() * (MAX_PAY_TOTAL - 2));
  const sums = [target, ...pickTotals(target, MAX_PAY_TOTAL, rng)];
  const purses = sums.map(value => ({ sum: value, coins: buildExactPurse(value, rng) }));

  return {
    pay: true,
    coins: null,
    total: null,
    target,
    purses,
    correctAnswer: target,
    promptHtml: '<div class="op-question">' + t('moneyPayPrompt', { n: target }) + '</div>',
    choices: shuffle(purses.map(purse => ({
      value: purse.sum,
      html: CoinRenderer.render(purse.coins),
    })), rng),
  };
}

function buildPurse(config, rng) {
  const { allowed, maxTotal, minItems, maxItems } = config;
  const coins = [];
  let total = 0;
  const wanted = minItems + Math.floor(rng() * (maxItems - minItems + 1));
  let guard = 0;

  while (coins.length < wanted && guard < 200) {
    const value = allowed[Math.floor(rng() * allowed.length)];
    if (total + value <= maxTotal) {
      coins.push(value);
      total += value;
    }
    guard++;
  }

  // A one-piece purse is not a counting exercise; top it up while there is room.
  while (coins.length < minItems && total + 1 <= maxTotal) {
    coins.push(1);
    total += 1;
  }

  return coins.sort((a, b) => b - a);
}

// Decomposes an exact amount into real denominations. 1 is always usable, so
// the loop always terminates and the result always sums to `target`.
function buildExactPurse(target, rng) {
  const coins = [];
  let remaining = target;
  let guard = 0;

  while (remaining > 0 && guard < 200) {
    const usable = DENOMINATIONS.filter(value => value <= remaining);
    // Once the purse is already large, take the biggest piece that fits, so a
    // price of 19 € cannot become nineteen 1 € coins.
    const value = coins.length >= 4
      ? usable[usable.length - 1]
      : usable[Math.floor(rng() * usable.length)];
    coins.push(value);
    remaining -= value;
    guard++;
  }

  return coins.sort((a, b) => b - a);
}

function pickTotals(correct, max, rng) {
  const near = [correct - 1, correct + 1, correct - 2, correct + 2, correct - 5, correct + 5]
    .filter(value => value >= 1 && value <= max && value !== correct);

  const chosen = [];

  for (const candidate of shuffle([...new Set(near)], rng)) {
    if (chosen.length >= CHOICE_COUNT - 1) break;
    if (!chosen.includes(candidate)) chosen.push(candidate);
  }

  let guard = 0;
  while (chosen.length < CHOICE_COUNT - 1 && guard < 200) {
    const wrong = 1 + Math.floor(rng() * max);
    if (wrong !== correct && !chosen.includes(wrong)) chosen.push(wrong);
    guard++;
  }

  return chosen;
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
