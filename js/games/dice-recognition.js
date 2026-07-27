import { DiceRenderer } from '../render/dice.js';
import { drawDistinct } from '../engine/unique.js';

const RANGES = { easy: [1, 4], normal: [1, 5], hard: [2, 6] };

export const DiceRecognitionGame = {
  id: 'dice_recognition',
  nameKey: 'diceRecognition',
  emoji: '🎯',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'dice-recognition-layout',

  // Four to five faces against five to twenty rounds: this game can never make
  // a session unique, so drawDistinct spends most of it in the refill path,
  // cycling the whole band evenly and never repeating back-to-back.
  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const [min, max] = RANGES[difficulty];

    return drawDistinct(count, () => {
      const value = Math.floor(rng() * (max - min + 1)) + min;

      return {
        correctAnswer: value,
        promptHtml: DiceRenderer.render(value),
        choices: [1, 2, 3, 4, 5, 6],
      };
    }, exercise => String(exercise.correctAnswer));
  },
};
