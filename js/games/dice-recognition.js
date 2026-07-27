import { DiceRenderer } from '../render/dice.js';

const RANGES = { easy: [1, 4], normal: [1, 5], hard: [2, 6] };

export const DiceRecognitionGame = {
  id: 'dice_recognition',
  nameKey: 'diceRecognition',
  emoji: '🎯',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'dice-recognition-layout',

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const [min, max] = RANGES[difficulty];

    const exercises = [];
    let previous = null;

    for (let i = 0; i < count; i++) {
      let value;
      let guard = 0;
      do {
        value = Math.floor(rng() * (max - min + 1)) + min;
        guard++;
      } while (value === previous && max > min && guard < 200);
      previous = value;

      exercises.push({
        correctAnswer: value,
        promptHtml: DiceRenderer.render(value),
        choices: [1, 2, 3, 4, 5, 6],
      });
    }

    return exercises;
  },
};
