import { showScreen, setLayoutClass, onScreenChange } from './screens.js';
import { saveResult } from './results.js';
import { Speech } from './speech.js';
import { I18n } from '../i18n/i18n.js';
import { Sound } from '../sound.js';
import { Animation } from '../animation.js';

export const GameEngine = {
  game: null,
  exercises: [],
  index: 0,
  wrongAttempts: 0,
  startTime: 0,
  difficulty: 'easy',
  activeBodyClass: null,
  advancing: false,

  now: () => Date.now(),
  advanceDelayMs: 600,

  resolveCount(game, difficulty, requested) {
    if (game.rounds === 'ask') return requested;

    return game.rounds[difficulty];
  },

  isCorrect(value, exercise) {
    if (this.game.isCorrect) return this.game.isCorrect(value, exercise);

    return value === exercise.correctAnswer;
  },

  applyBodyClass(className) {
    if (this.activeBodyClass) {
      document.body.classList.remove(this.activeBodyClass);
    }
    if (className) {
      document.body.classList.add(className);
    }
    this.activeBodyClass = className;
  },

  buildContext(difficulty, options) {
    return {
      rng: options.rng || Math.random,
      t: (key, params) => I18n.t(key, params),
      lang: I18n.getLanguage(),
      count: this.resolveCount(options.game, difficulty, options.count),
      category: options.category || null,
    };
  },

  start(game, options = {}) {
    const difficulty = options.difficulty || 'easy';
    const ctx = this.buildContext(difficulty, { ...options, game });

    this.game = game;
    this.difficulty = difficulty;
    this.exercises = game.generate(difficulty, ctx);
    this.index = 0;
    this.wrongAttempts = 0;
    this.advancing = false;
    this.startTime = this.now();

    showScreen('game');
    setLayoutClass(game.layoutClass || null);
    this.showExercise();
  },

  showExercise() {
    const exercise = this.exercises[this.index];
    if (!exercise) return;

    const submit = (value, btn) => this.answer(value, btn);

    this.advancing = false;
    this.applyBodyClass(exercise.bodyClass || null);

    const promptEl = document.getElementById('dice-container');
    if (this.game.renderPrompt) {
      this.game.renderPrompt(promptEl, exercise, submit);
    } else {
      promptEl.innerHTML = exercise.promptHtml || '';
    }

    const choicesEl = document.getElementById('choices-container');

    if (this.game.renderChoices) {
      this.game.renderChoices(choicesEl, exercise, submit);
    } else {
      this.renderDefaultChoices(choicesEl, exercise, submit);
    }

    if (exercise.speak) this.speakPrompt(exercise.speak);
    this.updateProgress();
  },

  renderDefaultChoices(el, exercise, submit) {
    const extra = this.game.choiceClass ? ' ' + this.game.choiceClass : '';

    el.innerHTML = exercise.choices.map(choice => {
      const value = typeof choice === 'object' ? choice.value : choice;
      const html = typeof choice === 'object' ? choice.html : choice;

      return '<button class="choice-btn' + extra + '" data-value="' + value + '">' +
        html +
      '</button>';
    }).join('');

    el.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        const value = raw !== '' && !isNaN(raw) ? Number(raw) : raw;
        submit(value, btn);
      });
    });
  },

  speakPrompt(text) {
    Speech.speak(text, I18n.getLanguage());

    const promptEl = document.getElementById('dice-container');
    const replay = document.createElement('button');
    replay.className = 'speak-btn';
    replay.type = 'button';
    replay.textContent = '🔊';
    replay.addEventListener('click', () => Speech.speak(text, I18n.getLanguage()));
    promptEl.appendChild(replay);
  },

  answer(value, btn) {
    // A right answer schedules the advance; taps landing inside that delay (a
    // six-year-old double-tapping) must be ignored, or they would queue a second
    // advance and skip an exercise — or save the result twice on the last one.
    if (this.advancing) return;

    if (btn && btn.dataset.wrongChoice) {
      btn.classList.remove('wrong');
      void btn.offsetWidth;
      btn.classList.add('wrong');
      Sound.play('wrong');

      return;
    }

    const exercise = this.exercises[this.index];

    if (this.isCorrect(value, exercise)) {
      if (btn) btn.classList.add(this.game.correctClass || 'correct');
      Sound.play('correct');
      Speech.cancel();
      this.advancing = true;

      const isLast = this.index === this.exercises.length - 1;
      setTimeout(() => {
        if (isLast) {
          this.completeGame();
        } else {
          this.index++;
          this.showExercise();
        }
      }, this.advanceDelayMs);

      return;
    }

    this.wrongAttempts++;
    if (btn) {
      btn.classList.add('wrong');
      btn.dataset.wrongChoice = '1';
    }
    Sound.play('wrong');
  },

  updateProgress() {
    const total = this.exercises.length;
    document.getElementById('progress-fill').style.width = (this.index / total * 100) + '%';
    document.getElementById('game-score').textContent = this.index + ' / ' + total;
  },

  completeGame() {
    const durationSeconds = Math.round((this.now() - this.startTime) / 1000);
    const total = this.exercises.length;

    saveResult({
      gameId: this.game.id,
      difficulty: this.difficulty,
      totalExercises: total,
      wrongAttempts: this.wrongAttempts,
      durationSeconds,
      playedAt: new Date(this.startTime).toISOString(),
    });

    document.getElementById('celebration-stats').innerHTML =
      I18n.t('exercises') + ': ' + total + '<br>' +
      I18n.t('wrongAttempts') + ': ' + this.wrongAttempts + '<br>' +
      I18n.t('time') + ': ' + durationSeconds + 's';

    let titleKey = 'wellDone';
    if (this.wrongAttempts === 0) titleKey = 'perfectScore';
    else if (this.wrongAttempts <= total) titleKey = 'greatJob';
    document.getElementById('celebration-title').textContent = I18n.t(titleKey);

    Animation.showCelebration(document.getElementById('dancing-animals'));
    Animation.showConfetti(document.getElementById('confetti-container'));
    Sound.play('victory');
    showScreen('celebration');
  },
};

onScreenChange(name => {
  if (name !== 'game' && name !== 'celebration') {
    GameEngine.applyBodyClass(null);
  }
});
