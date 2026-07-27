import { drawDistinct } from '../engine/unique.js';

const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];

const UNO_COLOR_VALUES = {
  red: { bg: '#E53935', border: '#B71C1C', text: '#fff' },
  blue: { bg: '#1E88E5', border: '#0D47A1', text: '#fff' },
  green: { bg: '#43A047', border: '#1B5E20', text: '#fff' },
  yellow: { bg: '#FDD835', border: '#F9A825', text: '#333' },
};

const UNO_NUMBER_ANIMALS = {
  0: '🦁', 1: '🐘', 2: '🐬', 3: '🦒', 4: '🐻',
  5: '🐨', 6: '🦊', 7: '🐰', 8: '🐼', 9: '🐵',
};

const CHOICE_COUNT = 5;

export const UnoGame = {
  id: 'uno',
  nameKey: 'uno',
  emoji: '🃏',
  domain: 'logique',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'uno-game-body',

  // Keyed on the card lying on the table, not on correctAnswer — the answer is
  // a whole card object, and the same table card dealt with different
  // distractors is the same question to the child. Forty cards against at most
  // twenty rounds, so the sampler never has to refill.
  generate(difficulty, ctx) {
    const { rng, count } = ctx;
    const deck = buildDeck();

    return drawDistinct(
      count,
      () => buildExercise(deck, rng),
      exercise => exercise.mainCard.color + ':' + exercise.mainCard.number
    );
  },

  renderChoices(el, exercise, submit) {
    el.innerHTML = exercise.choices.map((choice, idx) =>
      '<button class="uno-choice-btn" data-index="' + idx + '">' + choice.html + '</button>'
    ).join('');

    el.querySelectorAll('.uno-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        submit(exercise.choices[Number(btn.dataset.index)].value, btn);
      });
    });
  },
};

function buildDeck() {
  const cards = [];
  for (const color of UNO_COLORS) {
    for (let number = 0; number <= 9; number++) {
      cards.push({ color, number, animal: UNO_NUMBER_ANIMALS[number] });
    }
  }

  return cards;
}

function buildExercise(deck, rng) {
  const mainCard = deck[Math.floor(rng() * deck.length)];
  const matchOnNumber = rng() < 0.5;

  let correctCard;
  if (matchOnNumber) {
    const others = UNO_COLORS.filter(c => c !== mainCard.color);
    const color = others[Math.floor(rng() * others.length)];
    correctCard = { color, number: mainCard.number, animal: mainCard.animal };
  } else {
    let number;
    let guard = 0;
    do {
      number = Math.floor(rng() * 10);
      guard++;
    } while (number === mainCard.number && guard < 200);
    correctCard = { color: mainCard.color, number, animal: UNO_NUMBER_ANIMALS[number] };
  }

  const cards = [correctCard];
  const used = new Set([
    mainCard.color + ':' + mainCard.number,
    correctCard.color + ':' + correctCard.number,
  ]);

  let guard = 0;
  while (cards.length < CHOICE_COUNT && guard < 500) {
    guard++;
    const color = UNO_COLORS[Math.floor(rng() * UNO_COLORS.length)];
    const number = Math.floor(rng() * 10);
    if (color === mainCard.color || number === mainCard.number) continue;

    const key = color + ':' + number;
    if (used.has(key)) continue;
    used.add(key);
    cards.push({ color, number, animal: UNO_NUMBER_ANIMALS[number] });
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return {
    mainCard,
    promptHtml: renderCard(mainCard, 'main'),
    choices: cards.map(card => ({ html: renderCard(card, 'small'), value: card })),
    correctAnswer: correctCard,
  };
}

function renderCard(card, size) {
  const cv = UNO_COLOR_VALUES[card.color];
  const cls = size === 'small' ? 'uno-card uno-card-small' : 'uno-card uno-card-main';

  return '<div class="' + cls + '" style="background:' + cv.bg +
      ';border-color:' + cv.border + ';color:' + cv.text + '">' +
    '<span class="uno-card-corner uno-card-corner-tl">' + card.number + '</span>' +
    '<span class="uno-card-animal">' + card.animal + '</span>' +
    '<span class="uno-card-corner uno-card-corner-br">' + card.number + '</span>' +
  '</div>';
}
