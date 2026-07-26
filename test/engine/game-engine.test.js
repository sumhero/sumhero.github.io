import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../../js/engine/game-engine.js';
import { showScreen } from '../../js/engine/screens.js';
import { loadResults } from '../../js/engine/results.js';

function mountDom() {
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

const stubGame = {
  id: 'stub',
  nameKey: 'stub',
  emoji: '🧪',
  domain: 'nombres',
  rounds: { easy: 2, normal: 3, hard: 4 },
  generate(difficulty, ctx) {
    return Array.from({ length: ctx.count }, (_, i) => ({
      promptHtml: `<p>q${i}</p>`,
      choices: [1, 2, 3],
      correctAnswer: 2,
    }));
  },
};

// Records every value the engine hands to the answer path, while keeping the
// engine's default correctness semantics.
function spyingGame(overrides) {
  const seen = [];
  const game = {
    ...stubGame,
    isCorrect(value, exercise) {
      seen.push(value);

      return value === exercise.correctAnswer;
    },
    ...overrides,
  };

  return { game, seen };
}

function clickChoice(value) {
  const btn = [...document.querySelectorAll('.choice-btn')]
    .find(b => b.dataset.value === String(value));
  btn.click();

  return btn;
}

describe('GameEngine', () => {
  const realNow = GameEngine.now;
  const realDelay = GameEngine.advanceDelayMs;

  beforeEach(() => {
    mountDom();
    localStorage.clear();
    GameEngine.advanceDelayMs = 0;
    GameEngine.now = () => 1000;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    GameEngine.now = realNow;
    GameEngine.advanceDelayMs = realDelay;
  });

  it('resolves round count from the difficulty', () => {
    expect(GameEngine.resolveCount(stubGame, 'normal')).toBe(3);
  });

  it('honours a requested count when rounds is "ask"', () => {
    expect(GameEngine.resolveCount({ ...stubGame, rounds: 'ask' }, 'easy', 7)).toBe(7);
  });

  it('renders the first exercise and its choices', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    expect(document.getElementById('dice-container').innerHTML).toContain('q0');
    expect(document.querySelectorAll('.choice-btn')).toHaveLength(3);
  });

  it('shows the game screen', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    expect(document.getElementById('screen-game').classList.contains('active')).toBe(true);
  });

  it('marks a correct answer and advances', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(2);
    expect(btn.classList.contains('correct')).toBe(true);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q1');
  });

  it('marks a wrong answer and stays on the exercise', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(1);
    expect(btn.classList.contains('wrong')).toBe(true);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q0');
  });

  it('counts each distinct wrong choice once', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(1);
    clickChoice(1);
    clickChoice(3);
    expect(GameEngine.wrongAttempts).toBe(2);
  });

  it('re-triggers the shake on a repeated wrong tap', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    const btn = clickChoice(1);
    btn.classList.remove('wrong');
    clickChoice(1);
    expect(btn.classList.contains('wrong')).toBe(true);
  });

  it('ignores extra taps between a correct answer and the advance', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2);
    clickChoice(2);
    clickChoice(1);
    expect(GameEngine.wrongAttempts).toBe(0);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q1');
  });

  it('saves one result even if the last answer is tapped twice', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2); vi.runAllTimers();
    clickChoice(2); clickChoice(2); vi.runAllTimers();
    expect(loadResults()).toHaveLength(1);
  });

  it('updates the score display', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2);
    vi.runAllTimers();
    expect(document.getElementById('game-score').textContent).toBe('1 / 2');
  });

  it('reaches the celebration screen after the last exercise', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2);
    vi.runAllTimers();
    clickChoice(2);
    vi.runAllTimers();
    expect(document.getElementById('screen-celebration').classList.contains('active')).toBe(true);
  });

  it('titles a flawless run "perfectScore"', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2); vi.runAllTimers();
    clickChoice(2); vi.runAllTimers();
    expect(document.getElementById('celebration-title').textContent).toBe('Perfect Score!');
  });

  it('titles a run with many errors "wellDone"', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(1); clickChoice(3); clickChoice(2); vi.runAllTimers();
    clickChoice(1); clickChoice(3); clickChoice(2); vi.runAllTimers();
    expect(document.getElementById('celebration-title').textContent).toBe('Well Done!');
  });

  it('persists the result', () => {
    GameEngine.start(stubGame, { difficulty: 'easy' });
    clickChoice(2); vi.runAllTimers();
    clickChoice(2); vi.runAllTimers();
    expect(loadResults()).toHaveLength(1);
    expect(loadResults()[0]).toMatchObject({
      gameId: 'stub', difficulty: 'easy', totalExercises: 2, wrongAttempts: 0,
    });
  });

  it('adds a game-declared choice class to every button', () => {
    GameEngine.start({ ...stubGame, choiceClass: 'geo-choice-btn' }, { difficulty: 'easy' });
    for (const btn of document.querySelectorAll('.choice-btn')) {
      expect(btn.classList.contains('geo-choice-btn')).toBe(true);
    }
  });

  it('keeps string choices as strings when submitted', () => {
    const { game, seen } = spyingGame({
      generate: () => [{ promptHtml: '', choices: ['France', 'Italie'], correctAnswer: 'France' }],
    });
    GameEngine.start(game, { difficulty: 'easy' });

    document.querySelector('[data-value="France"]').click();
    expect(seen).toEqual(['France']);
    expect(typeof seen[0]).toBe('string');
    expect(GameEngine.wrongAttempts).toBe(0);
  });

  it('keeps a colon-separated time choice intact', () => {
    const { game, seen } = spyingGame({
      generate: () => [{ promptHtml: '', choices: ['09:30', '10:45'], correctAnswer: '09:30' }],
    });
    GameEngine.start(game, { difficulty: 'easy' });

    document.querySelector('[data-value="09:30"]').click();
    expect(seen).toEqual(['09:30']);
    expect(GameEngine.wrongAttempts).toBe(0);
  });

  it('submits numeric choices as numbers, not as strings', () => {
    const { game, seen } = spyingGame({});
    GameEngine.start(game, { difficulty: 'easy' });

    clickChoice(2);
    expect(seen).toEqual([2]);
    expect(typeof seen[0]).toBe('number');
  });

  it('submits the value of an object choice, not its html', () => {
    const { game, seen } = spyingGame({
      generate: () => [{
        promptHtml: '',
        choices: [{ html: '<span>red 3</span>', value: 0 }, { html: '<span>blue 5</span>', value: 1 }],
        correctAnswer: 1,
      }],
    });
    GameEngine.start(game, { difficulty: 'easy' });

    document.querySelector('[data-value="1"]').click();
    expect(seen).toEqual([1]);
    expect(document.querySelector('[data-value="1"]').innerHTML).toContain('blue 5');
  });

  it('applies the layout class when the game declares one', () => {
    GameEngine.start({ ...stubGame, layoutClass: 'stub-layout' }, { difficulty: 'easy' });
    expect(document.querySelector('.game-body').classList.contains('stub-layout')).toBe(true);
  });

  it('passes a seeded rng through the context', () => {
    const seen = [];
    GameEngine.start({
      ...stubGame,
      generate(difficulty, ctx) {
        seen.push(ctx.rng());

        return [{ promptHtml: '', choices: [1], correctAnswer: 1 }];
      },
    }, { difficulty: 'easy', rng: () => 0.5 });
    expect(seen).toEqual([0.5]);
  });

  it('accepts a game-supplied isCorrect predicate with many valid answers', () => {
    const manyAnswers = {
      ...stubGame,
      isCorrect: (value, ex) => ex.targets.includes(value),
      generate: () => [{ promptHtml: '', choices: ['1,2', '3,4', '9,9'], targets: ['1,2', '3,4'] }],
    };
    GameEngine.start(manyAnswers, { difficulty: 'easy' });

    document.querySelector('[data-value="3,4"]').click();
    expect(GameEngine.wrongAttempts).toBe(0);
    expect(document.querySelector('[data-value="3,4"]').classList.contains('correct')).toBe(true);
  });

  it('counts a wrong answer under a custom isCorrect predicate', () => {
    GameEngine.start({
      ...stubGame,
      isCorrect: (value, ex) => ex.targets.includes(value),
      generate: () => [{ promptHtml: '', choices: ['1,2', '9,9'], targets: ['1,2'] }],
    }, { difficulty: 'easy' });

    document.querySelector('[data-value="9,9"]').click();
    expect(GameEngine.wrongAttempts).toBe(1);
  });

  it('honours a game-supplied correctClass', () => {
    GameEngine.start({ ...stubGame, correctClass: 'chess-correct' }, { difficulty: 'easy' });
    const btn = clickChoice(2);
    expect(btn.classList.contains('chess-correct')).toBe(true);
    expect(btn.classList.contains('correct')).toBe(false);
  });

  it('applies a per-exercise bodyClass', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' }],
    }, { difficulty: 'easy' });
    expect(document.body.classList.contains('time-theme-night')).toBe(true);
  });

  it('swaps the bodyClass between exercises rather than stacking them', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [
        { promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-day' },
        { promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' },
      ],
    }, { difficulty: 'easy' });

    document.querySelector('[data-value="1"]').click();
    vi.runAllTimers();

    expect(document.body.classList.contains('time-theme-day')).toBe(false);
    expect(document.body.classList.contains('time-theme-night')).toBe(true);
  });

  it('clears the bodyClass when leaving the game screen', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '', choices: [1], correctAnswer: 1, bodyClass: 'time-theme-night' }],
    }, { difficulty: 'easy' });

    showScreen('games');
    expect(document.body.classList.contains('time-theme-night')).toBe(false);
  });

  it('passes submit to renderPrompt so a game can wire its own board', () => {
    GameEngine.start({
      ...stubGame,
      renderPrompt(el, exercise, submit) {
        el.innerHTML = '<button id="cell">c</button>';
        el.querySelector('#cell').addEventListener('click', (e) => submit(2, e.target));
      },
      renderChoices(el) {
        el.innerHTML = '';
      },
    }, { difficulty: 'easy' });

    document.getElementById('cell').click();
    expect(GameEngine.wrongAttempts).toBe(0);
    expect(document.getElementById('cell').classList.contains('correct')).toBe(true);
    expect(document.getElementById('choices-container').innerHTML).toBe('');
  });

  it('uses a game-supplied renderChoices hook', () => {
    GameEngine.start({
      ...stubGame,
      renderChoices(el, exercise, submit) {
        el.innerHTML = '<button id="custom">go</button>';
        el.querySelector('#custom').addEventListener('click', () => submit(2, el.firstChild));
      },
    }, { difficulty: 'easy' });
    expect(document.getElementById('custom')).not.toBeNull();

    document.getElementById('custom').click();
    expect(GameEngine.wrongAttempts).toBe(0);
    vi.runAllTimers();
    expect(document.getElementById('dice-container').innerHTML).toContain('q1');
  });

  it('speaks a prompt and offers a replay button', () => {
    GameEngine.start({
      ...stubGame,
      generate: () => [{ promptHtml: '<p>listen</p>', speak: 'trois', choices: [1], correctAnswer: 1 }],
    }, { difficulty: 'easy' });

    const replay = document.querySelector('#dice-container .speak-btn');
    expect(replay).not.toBeNull();
    expect(replay.textContent).toBe('🔊');
  });

  it('builds a context carrying count, translator and category', () => {
    localStorage.setItem('game_language', 'en');
    const ctx = GameEngine.buildContext('hard', { game: stubGame, category: 'animals' });
    expect(ctx.count).toBe(4);
    expect(ctx.lang).toBe('en');
    expect(ctx.category).toBe('animals');
    expect(ctx.t('exercises')).toBe('Exercises');
    expect(typeof ctx.rng).toBe('function');
  });
});
