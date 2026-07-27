import { ClockRenderer } from '../render/clock.js';
import { drawDistinct } from '../engine/unique.js';

const CHOICE_COUNT = 4;
const MINUTES = { normal: [0, 30], hard: [0, 15, 30, 45] };

export const GuessTimeGame = {
  id: 'guess_time',
  nameKey: 'guessTime',
  emoji: '🕐',
  domain: 'mesures',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'time-game-layout',
  choiceClass: 'time-choice-btn',

  // Converged from a one-slot `previous` guard onto the shared sampler. That
  // guard only ever blocked A A; it happily emitted A B A B A, which is why
  // 7.9% of hard sessions still showed the same time three or more times. The
  // formatted HH:MM string genuinely is this game's identity, so the key and
  // correctAnswer coincide here — one of the few places they legitimately do.
  generate(difficulty, ctx) {
    const { rng, count } = ctx;

    return drawDistinct(count, () => {
      const time = randomTime(difficulty, rng);
      const formatted = formatTime(time);
      const themed = difficulty !== 'easy';
      const day = isDaytime(time);

      return {
        time,
        correctAnswer: formatted,
        bodyClass: themed ? (day ? 'time-theme-day' : 'time-theme-night') : null,
        promptHtml:
          (themed ? '<div class="time-daynight">' + (day ? '☀️' : '🌙') + '</div>' : '') +
          ClockRenderer.render(time.hour, time.minute),
        choices: buildChoices(formatted, difficulty, rng),
      };
    }, exercise => exercise.correctAnswer);
  },
};

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatTime(t) {
  return pad2(t.hour) + ':' + pad2(t.minute);
}

function isDaytime(t) {
  return t.hour >= 6 && t.hour < 18;
}

function randomTime(difficulty, rng) {
  if (difficulty === 'easy') {
    return { hour: Math.floor(rng() * 12) + 1, minute: 0 };
  }

  const minutes = MINUTES[difficulty];

  return {
    hour: Math.floor(rng() * 24),
    minute: minutes[Math.floor(rng() * minutes.length)],
  };
}

function buildChoices(correct, difficulty, rng) {
  const seen = new Set([correct]);
  const choices = [correct];
  let guard = 0;

  while (choices.length < CHOICE_COUNT && guard < 500) {
    guard++;
    const candidate = formatTime(randomTime(difficulty, rng));
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    choices.push(candidate);
  }

  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
