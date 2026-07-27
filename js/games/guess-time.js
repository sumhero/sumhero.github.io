import { ClockRenderer } from '../render/clock.js';

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

  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const exercises = [];
    let previous = null;

    for (let i = 0; i < count; i++) {
      let time, formatted;
      let guard = 0;
      do {
        time = randomTime(difficulty, rng);
        formatted = formatTime(time);
        guard++;
      } while (formatted === previous && guard < 200);
      previous = formatted;

      const themed = difficulty !== 'easy';
      const day = isDaytime(time);

      exercises.push({
        time,
        correctAnswer: formatted,
        bodyClass: themed ? (day ? 'time-theme-day' : 'time-theme-night') : null,
        promptHtml:
          (themed ? '<div class="time-daynight">' + (day ? '☀️' : '🌙') + '</div>' : '') +
          ClockRenderer.render(time.hour, time.minute),
        choices: buildChoices(formatted, difficulty, rng),
      });
    }

    return exercises;
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
