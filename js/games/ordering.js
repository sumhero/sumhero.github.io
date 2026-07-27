const CONFIG = {
  easy: { size: 3, max: 20, descending: false },
  normal: { size: 5, max: 100, descending: false },
  hard: { size: 5, max: 100, descending: true },
};

// How long the broken sequence stays red before the board clears itself. Long
// enough for a six-year-old to see which tap went wrong, short enough that the
// retry does not feel like a punishment.
const RESET_DELAY_MS = 500;

export const OrderingGame = {
  id: 'ordering',
  nameKey: 'ordering',
  emoji: '🪜',
  domain: 'nombres',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'ordering-layout',

  generate(difficulty, ctx) {
    const { rng, t, count } = ctx;
    const config = CONFIG[difficulty];
    const exercises = [];

    for (let i = 0; i < count; i++) {
      // pickDistinct returns its draw sorted, so the display order below is the
      // result of one explicit shuffle. That is what makes the shuffle testable:
      // delete it and the first number to tap sits at a fixed index.
      const sorted = pickDistinct(config.size, config.max, rng);
      const ordered = config.descending ? sorted.slice().reverse() : sorted.slice();

      exercises.push({
        numbers: shuffle(sorted.slice(), rng),
        ordered,
        descending: config.descending,
        // The whole ordering as one string. The engine's default
        // `value === exercise.correctAnswer` then compares the tapped ordering
        // against the required one with no custom isCorrect needed.
        correctAnswer: ordered.join(','),
        promptHtml:
          '<div class="ordering-arrow">' + (config.descending ? '⬇️' : '⬆️') + '</div>' +
          '<div class="op-hint">' +
            t(config.descending ? 'orderingDescPrompt' : 'orderingAscPrompt') +
          '</div>',
      });
    }

    return exercises;
  },

  // The project's only sequencing interaction. Taps accumulate in `picked` and
  // the engine is told the verdict exactly ONCE per attempt, deliberately
  // without a `btn`: GameEngine.answer(value, btn) only reaches its
  // `dataset.wrongChoice` latch when `btn` is truthy, so passing none means no
  // tile is ever taken out of play and the exercise always stays completable.
  // The engine still owns the sound, the attempt count and the advance; this
  // function owns only the visuals and the retry reset.
  renderChoices(el, exercise, submit) {
    const picked = [];
    let locked = false;

    el.innerHTML = exercise.numbers.map(value =>
      '<button class="choice-btn ordering-tile" data-value="' + value + '">' +
        '<span class="ordering-value">' + value + '</span>' +
        '<span class="ordering-rank"></span>' +
      '</button>'
    ).join('');

    const tiles = [...el.querySelectorAll('.ordering-tile')];

    const reset = () => {
      picked.length = 0;
      locked = false;
      tiles.forEach(tile => {
        delete tile.dataset.picked;
        tile.classList.remove('picked', 'wrong');
        tile.querySelector('.ordering-rank').textContent = '';
      });
    };

    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        if (locked || tile.dataset.picked) return;

        const value = Number(tile.dataset.value);

        if (value !== exercise.ordered[picked.length]) {
          // `.wrong` alone, never `dataset.wrongChoice`. The class picks up the
          // app's shared red shake from `.choice-btn.wrong`; the dataset flag is
          // the engine's private latch and must stay the engine's business.
          locked = true;
          tile.classList.add('wrong');
          submit(picked.concat(value).join(','));
          setTimeout(reset, RESET_DELAY_MS);

          return;
        }

        picked.push(value);
        tile.dataset.picked = '1';
        tile.classList.add('picked');
        tile.querySelector('.ordering-rank').textContent = picked.length;

        if (picked.length === exercise.ordered.length) {
          // The engine skips `btn.classList.add('correct')` when no button was
          // passed, so the finished sequence colours itself.
          locked = true;
          tiles.forEach(other => other.classList.add('correct'));
          submit(picked.join(','));
        }
      });
    });
  },
};

// A repeat would give the exercise two correct tap sequences, one of which the
// engine would judge wrong, so repeats are rejected rather than tolerated.
function pickDistinct(size, max, rng) {
  const out = [];
  let guard = 0;

  while (out.length < size && guard < 500) {
    const value = 1 + Math.floor(rng() * max);
    if (!out.includes(value)) out.push(value);
    guard++;
  }

  // A degenerate rng — a seeded test stub returning a constant, say — starves
  // the rejection loop above and would leave a board of one tile. Top up
  // deterministically so the count always matches the difficulty ladder: a
  // short board would silently contradict "3 numbers" or "5 numbers".
  for (let value = 1; out.length < size && value <= max; value++) {
    if (!out.includes(value)) out.push(value);
  }

  return out.sort((a, b) => a - b);
}

function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}
