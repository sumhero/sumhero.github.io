import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrderingGame } from '../../js/games/ordering.js';
import { GameEngine } from '../../js/engine/game-engine.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

// Deliberately duplicated literals rather than imported from the game: a guard
// that reads its expectation out of the module under test cannot fail when the
// module is wrong.
const BANDS = {
  easy: { size: 3, max: 20, descending: false },
  normal: { size: 5, max: 100, descending: false },
  hard: { size: 5, max: 100, descending: true },
};

function mountChoices() {
  document.body.innerHTML = '<div id="choices"></div>';

  return document.getElementById('choices');
}

function tiles() {
  return [...document.querySelectorAll('.ordering-tile')];
}

function tap(value) {
  tiles().find(tile => tile.dataset.value === String(value)).click();
}

function tileOf(value) {
  return tiles().find(tile => tile.dataset.value === String(value));
}

function ranks() {
  return tiles().map(tile => tile.querySelector('.ordering-rank').textContent);
}

// The full app shell the engine reaches into, copied from
// test/engine/game-engine.test.js so this file can drive the real engine.
function mountGameDom() {
  document.body.className = '';
  document.body.innerHTML = `
    <div id="screen-games" class="screen active"></div>
    <div id="screen-game" class="screen">
      <div id="progress-fill"></div>
      <div id="game-score"></div>
      <div class="game-body">
        <div id="dice-container"></div>
        <div id="choices-container"></div>
      </div>
    </div>
    <div id="screen-celebration" class="screen">
      <div id="dancing-animals"></div>
      <h2 id="celebration-title"></h2>
      <div id="celebration-stats"></div>
      <div id="confetti-container"></div>
    </div>
  `;
}

describe('OrderingGame', () => {
  it('is registered for the numbers domain with the standard round counts', () => {
    expect(OrderingGame.id).toBe('ordering');
    expect(OrderingGame.nameKey).toBe('ordering');
    expect(OrderingGame.emoji).toBe('🪜');
    expect(OrderingGame.domain).toBe('nombres');
    expect(OrderingGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
    expect(OrderingGame.layoutClass).toBe('ordering-layout');
  });

  it('uses only renderChoices, and no other seam', () => {
    // The design finding for this checkpoint: a sequencing game fits the engine
    // through renderChoices alone. An isCorrect here would mean the default
    // string comparison stopped being enough, which is worth failing over.
    expect(typeof OrderingGame.renderChoices).toBe('function');
    expect(OrderingGame.renderPrompt).toBeUndefined();
    expect(OrderingGame.isCorrect).toBeUndefined();
    expect(OrderingGame.legacy).toBeUndefined();
    expect(OrderingGame.setup).toBeUndefined();
    expect(OrderingGame.choiceClass).toBeUndefined();
  });

  it('generates exactly ctx.count exercises, not game.rounds', () => {
    expect(OrderingGame.generate('easy', ctx(7))).toHaveLength(7);
    expect(OrderingGame.generate('hard', ctx(3))).toHaveLength(3);
  });

  for (const [difficulty, band] of Object.entries(BANDS)) {
    it(`shows ${band.size} numbers within 1..${band.max} on ${difficulty}`, () => {
      for (const ex of OrderingGame.generate(difficulty, ctx(30))) {
        expect(ex.numbers).toHaveLength(band.size);
        expect(ex.ordered).toHaveLength(band.size);
        for (const value of ex.numbers) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(band.max);
        }
      }
    });
  }

  it('never repeats a number, because a tie would make two orderings correct', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of OrderingGame.generate(difficulty, ctx(40))) {
        expect(new Set(ex.numbers).size).toBe(ex.numbers.length);
      }
    }
  });

  it('makes the required ordering a permutation of the numbers on screen', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of OrderingGame.generate(difficulty, ctx(30))) {
        expect(ex.ordered.slice().sort((a, b) => a - b))
          .toEqual(ex.numbers.slice().sort((a, b) => a - b));
      }
    }
  });

  it('orders ascending on easy and normal, and genuinely descending on hard', () => {
    for (const difficulty of ['easy', 'normal']) {
      for (const ex of OrderingGame.generate(difficulty, ctx(30))) {
        expect(ex.descending).toBe(false);
        for (let i = 1; i < ex.ordered.length; i++) {
          expect(ex.ordered[i]).toBeGreaterThan(ex.ordered[i - 1]);
        }
        expect(ex.promptHtml).toContain('orderingAscPrompt');
      }
    }
    for (const ex of OrderingGame.generate('hard', ctx(30))) {
      expect(ex.descending).toBe(true);
      for (let i = 1; i < ex.ordered.length; i++) {
        expect(ex.ordered[i]).toBeLessThan(ex.ordered[i - 1]);
      }
      expect(ex.promptHtml).toContain('orderingDescPrompt');
    }
  });

  it('states the required ordering as the comma-joined answer', () => {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      for (const ex of OrderingGame.generate(difficulty, ctx(20))) {
        expect(ex.correctAnswer).toBe(ex.ordered.join(','));
      }
    }
  });

  it('moves the first number the child must tap instead of parking it at one index', () => {
    // Shape A, measured PER DIFFICULTY. numbers is a shuffle of the sorted
    // draw, so with the shuffle deleted the first required number sits at a
    // fixed index: 0 on the ascending bands, size - 1 on the descending one.
    // Pooling the bands into one Set would collect {0, 4} on unshuffled code
    // and pass vacuously, so each band gets its own Set.
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const positions = new Set();
      for (let i = 0; i < 30; i++) {
        for (const ex of OrderingGame.generate(difficulty, ctx(10))) {
          positions.add(ex.numbers.indexOf(ex.ordered[0]));
        }
      }
      expect(positions.size).toBeGreaterThan(1);
    }
  });

  it('fills the board even when the rng is degenerate', () => {
    // A constant rng makes the distinct-value draw collide forever. The board
    // must still hold the number of tiles the ladder promises, or the game
    // would quietly show one tile and call it an ordering exercise.
    for (const [difficulty, band] of Object.entries(BANDS)) {
      for (const ex of OrderingGame.generate(difficulty, ctx(4, () => 0.5))) {
        expect(ex.numbers).toHaveLength(band.size);
        expect(new Set(ex.numbers).size).toBe(band.size);
      }
    }
  });

  it('is deterministic for a fixed rng', () => {
    const seeded = () => 0.5;
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const a = OrderingGame.generate(difficulty, ctx(5, seeded));
      const b = OrderingGame.generate(difficulty, ctx(5, seeded));
      expect(a.map(e => e.numbers.join(','))).toEqual(b.map(e => e.numbers.join(',')));
      expect(a.map(e => e.correctAnswer)).toEqual(b.map(e => e.correctAnswer));
    }
  });
});

describe('OrderingGame.renderChoices', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const exercise = {
    numbers: [9, 2, 5],
    ordered: [2, 5, 9],
    descending: false,
    correctAnswer: '2,5,9',
    promptHtml: '',
  };

  it('renders one tile per number, in the display order', () => {
    OrderingGame.renderChoices(mountChoices(), exercise, vi.fn());
    expect(tiles().map(t => t.dataset.value)).toEqual(['9', '2', '5']);
    expect(tiles().map(t => t.querySelector('.ordering-value').textContent))
      .toEqual(['9', '2', '5']);
    // The base choice-btn class is what gives the tile the app's shared
    // .wrong shake and .correct pulse without reimplementing either.
    for (const tile of tiles()) expect(tile.classList.contains('choice-btn')).toBe(true);
  });

  it('submits the complete ordering exactly once, and only when the sequence is done', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);

    tap(2);
    expect(submit).not.toHaveBeenCalled();
    tap(5);
    expect(submit).not.toHaveBeenCalled();
    tap(9);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith('2,5,9');
  });

  it('passes no button to submit, which is what keeps the engine from latching', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);
    tap(2); tap(5); tap(9);
    // GameEngine.answer(value, btn) only latches when btn is truthy. Passing a
    // second argument here would resurrect the wall that made memory legacy.
    expect(submit.mock.calls[0]).toHaveLength(1);
  });

  it('numbers the tiles in tap order so the child can see the sequence building', () => {
    OrderingGame.renderChoices(mountChoices(), exercise, vi.fn());
    expect(ranks()).toEqual(['', '', '']);
    tap(2);
    expect(ranks()).toEqual(['', '1', '']);
    tap(5);
    expect(ranks()).toEqual(['', '1', '2']);
  });

  it('ignores a second tap on an already-picked tile', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);
    tap(2);
    tap(2);
    tap(2);
    expect(ranks()).toEqual(['', '1', '']);
    expect(submit).not.toHaveBeenCalled();
  });

  it('submits once on the tap that breaks the sequence, marking that tile wrong', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);

    tap(9);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith('9');
    expect(submit.mock.calls[0][0]).not.toBe(exercise.correctAnswer);
    expect(tileOf(9).classList.contains('wrong')).toBe(true);
    // Never the engine's latch flag: setting it would take the tile out of
    // play and the exercise could never be completed.
    expect(tileOf(9).dataset.wrongChoice).toBeUndefined();
  });

  it('reports the whole wrong sequence, not just the offending tap', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);
    tap(2);
    tap(9);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith('2,9');
  });

  it('swallows taps during the wrong-answer pause, then clears the board', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);

    tap(2);
    tap(9);
    tap(5);
    expect(submit).toHaveBeenCalledTimes(1);

    vi.runAllTimers();
    expect(ranks()).toEqual(['', '', '']);
    for (const tile of tiles()) {
      expect(tile.classList.contains('wrong')).toBe(false);
      expect(tile.classList.contains('picked')).toBe(false);
      expect(tile.dataset.picked).toBeUndefined();
    }
  });

  it('leaves the exercise completable after a wrong attempt', () => {
    // The property that decided this game does not need legacy: true. memory
    // could not offer it, because its first wrong tile tap latched that tile
    // out of play and the board could never be finished.
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);

    tap(9);
    vi.runAllTimers();
    tap(5);
    vi.runAllTimers();
    tap(2); tap(5); tap(9);

    expect(submit).toHaveBeenCalledTimes(3);
    expect(submit.mock.calls.map(call => call[0])).toEqual(['9', '5', '2,5,9']);
  });

  it('marks every tile correct on completion, since the engine passes no button', () => {
    OrderingGame.renderChoices(mountChoices(), exercise, vi.fn());
    tap(2); tap(5); tap(9);
    for (const tile of tiles()) expect(tile.classList.contains('correct')).toBe(true);
  });

  it('locks the board once the sequence is complete', () => {
    const submit = vi.fn();
    OrderingGame.renderChoices(mountChoices(), exercise, submit);
    tap(2); tap(5); tap(9);
    tap(2);
    tap(5);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('requires the descending order when the exercise asks for it', () => {
    const submit = vi.fn();
    const desc = {
      numbers: [4, 9, 1],
      ordered: [9, 4, 1],
      descending: true,
      correctAnswer: '9,4,1',
      promptHtml: '',
    };
    OrderingGame.renderChoices(mountChoices(), desc, submit);

    tap(1);
    expect(submit).toHaveBeenCalledWith('1');
    vi.runAllTimers();
    tap(9); tap(4); tap(1);
    expect(submit).toHaveBeenLastCalledWith('9,4,1');
  });
});

describe('OrderingGame driven by the real GameEngine', () => {
  const realNow = GameEngine.now;
  const realDelay = GameEngine.advanceDelayMs;

  beforeEach(() => {
    mountGameDom();
    localStorage.clear();
    GameEngine.advanceDelayMs = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    GameEngine.now = realNow;
    GameEngine.advanceDelayMs = realDelay;
    localStorage.clear();
  });

  function playExercise(wrongFirst) {
    const exercise = GameEngine.exercises[GameEngine.index];
    if (wrongFirst) {
      const wrong = exercise.numbers.find(value => value !== exercise.ordered[0]);
      tap(wrong);
      vi.runAllTimers();
    }
    for (const value of exercise.ordered) tap(value);
    vi.runAllTimers();
  }

  it('plays a whole session through, wrong attempts and all, without ever latching a tile', () => {
    // This is the load-bearing test for the checkpoint's design decision. If
    // the engine ever started latching a tile a custom renderer did not hand
    // it, this session would deadlock instead of reaching the celebration.
    // Real Math.random on purpose: a constant rng stub would exercise
    // pickDistinct's deterministic top-up rather than a normal board.
    GameEngine.start(OrderingGame, { difficulty: 'easy' });
    expect(GameEngine.exercises).toHaveLength(5);
    expect(tiles()).toHaveLength(3);

    playExercise(true);
    expect(GameEngine.wrongAttempts).toBe(1);
    expect(GameEngine.index).toBe(1);
    for (const tile of tiles()) expect(tile.dataset.wrongChoice).toBeUndefined();

    playExercise(false);
    playExercise(true);
    playExercise(false);
    playExercise(false);

    expect(GameEngine.wrongAttempts).toBe(2);
    expect(document.getElementById('screen-celebration').classList.contains('active'))
      .toBe(true);
  });

  it('counts every wrong attempt, and re-attempts are not deduplicated', () => {
    // Unlike a single-choice game, where re-tapping a latched wrong button only
    // re-shakes it, every ordering attempt is a fresh full sequence, so every
    // one of them counts. That is the intended semantics, pinned here so a
    // future engine change cannot quietly alter it.
    GameEngine.start(OrderingGame, { difficulty: 'easy' });
    const exercise = GameEngine.exercises[0];
    const wrong = exercise.numbers.find(value => value !== exercise.ordered[0]);

    for (let attempt = 0; attempt < 3; attempt++) {
      tap(wrong);
      vi.runAllTimers();
    }
    expect(GameEngine.wrongAttempts).toBe(3);
    expect(GameEngine.index).toBe(0);

    // Then finish the whole session cleanly from here. easy is five rounds.
    expect(GameEngine.exercises).toHaveLength(5);
    for (let round = 0; round < 5; round++) playExercise(false);

    expect(GameEngine.wrongAttempts).toBe(3);
    expect(document.getElementById('screen-celebration').classList.contains('active'))
      .toBe(true);
  });

  it('applies the layout class and never sets a body class', () => {
    GameEngine.start(OrderingGame, { difficulty: 'normal' });
    expect(document.querySelector('.game-body').classList.contains('ordering-layout'))
      .toBe(true);
    expect(document.body.className).toBe('');
    expect(tiles()).toHaveLength(5);
  });
});
