import { DiceRenderer } from '../render/dice.js';

const MAX_OPERAND = { easy: 4, normal: 5, hard: 6 };
const MAX_SUM = { easy: 8, normal: 10, hard: 12 };
const CHOICE_COUNT = 5;

export const DiceAdditionGame = {
  id: 'dice_addition',
  nameKey: 'diceAddition',
  emoji: '🎲',
  domain: 'nombres',
  rounds: 'ask',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const maxOperand = MAX_OPERAND[difficulty];
    const ordered = difficulty !== 'hard';

    const used = new Set();
    const exercises = [];

    for (let i = 0; i < count; i++) {
      let op1, op2, key;
      let guard = 0;
      do {
        op1 = Math.floor(rng() * maxOperand) + 1;
        op2 = Math.floor(rng() * maxOperand) + 1;
        if (ordered && op1 > op2) [op1, op2] = [op2, op1];
        key = op1 + ':' + op2;
        guard++;
      } while (used.has(key) && guard < 200);

      used.add(key);
      exercises.push({ operand1: op1, operand2: op2, correctAnswer: op1 + op2 });
    }

    if (difficulty === 'easy') {
      exercises.sort((a, b) => a.correctAnswer - b.correctAnswer || a.operand1 - b.operand1);
    }

    return exercises.map(ex => ({
      ...ex,
      promptHtml:
        '<div class="dice-with-number">' + DiceRenderer.render(ex.operand1) +
          '<span class="dice-number">' + ex.operand1 + '</span></div>' +
        '<span class="dice-plus">+</span>' +
        '<div class="dice-with-number">' + DiceRenderer.render(ex.operand2) +
          '<span class="dice-number">' + ex.operand2 + '</span></div>',
      choices: buildChoices(ex.correctAnswer, MAX_SUM[difficulty], rng),
    }));
  },
};

function buildChoices(correct, maxSum, rng) {
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 200) {
    const wrong = Math.floor(rng() * (maxSum - 1)) + 2;
    if (!choices.includes(wrong)) choices.push(wrong);
    guard++;
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
