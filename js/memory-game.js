import { App } from './app.js';
import { I18n } from './i18n/i18n.js';
import { Sound } from './sound.js';
import { Animation } from './animation.js';

export const MEMORY_COLORS = [
    { key: 'green', hex: '#4CAF50' },
    { key: 'red', hex: '#f44336' },
    { key: 'blue', hex: '#4a90d9' },
    { key: 'yellow', hex: '#f9c22e' },
    { key: 'white', hex: '#ffffff' },
    { key: 'violet', hex: '#9b59b6' },
];

export const MEMORY_CONFIG = {
    easy: { cols: 3, rows: 2, boards: 3, memMs: 5000 },
    normal: { cols: 3, rows: 3, boards: 4, memMs: 6000 },
    hard: { cols: 4, rows: 3, boards: 5, memMs: 7000 },
};

export const MemoryGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    peeksUsed: 0,
    startTime: null,
    activeColor: null,
    solvedCount: 0,
    memTimer: null,
    peekTimer: null,

    start(difficulty) {
        const config = MEMORY_CONFIG[difficulty] || MEMORY_CONFIG.easy;

        this.session = {
            gameType: 'memory',
            difficulty: difficulty,
            config: config,
            totalExercises: config.boards,
            colors: [],
            board: [],
        };
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.peeksUsed = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    // Three random colors, rerolled fresh for each board.
    pickColors() {
        const pool = MEMORY_COLORS.slice();
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, 3);
    },

    generateBoard() {
        const config = this.session.config;
        const total = config.cols * config.rows;
        const perColor = total / this.session.colors.length;

        const tiles = [];
        this.session.colors.forEach(color => {
            for (let i = 0; i < perColor; i++) {
                tiles.push({ color: color.key, hex: color.hex, solved: false });
            }
        });

        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        return tiles;
    },

    isRunning() {
        return document.getElementById('screen-game').classList.contains('active');
    },

    clearTimers() {
        if (this.memTimer) { clearInterval(this.memTimer); this.memTimer = null; }
        if (this.peekTimer) { clearTimeout(this.peekTimer); this.peekTimer = null; }
    },

    showExercise() {
        this.clearTimers();
        this.activeColor = null;
        this.solvedCount = 0;
        this.session.colors = this.pickColors();
        this.session.board = this.generateBoard();

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('memory-game-layout');

        const config = this.session.config;
        const diceContainer = document.getElementById('dice-container');
        diceContainer.innerHTML =
            '<div class="memory-grid locked" style="grid-template-columns: repeat(' + config.cols + ', 1fr)">' +
            this.session.board.map((tile, i) =>
                '<button class="memory-tile" data-index="' + i + '" style="background:' + tile.hex + '"></button>'
            ).join('') +
            '</div>';

        diceContainer.querySelectorAll('.memory-tile').forEach(btn => {
            btn.addEventListener('click', () => this.tileClick(parseInt(btn.dataset.index, 10), btn));
        });

        this.renderMemorizeStatus();
        this.updateProgress();
        this.startMemorize();
    },

    startMemorize() {
        let remaining = Math.round(this.session.config.memMs / 1000);
        const countEl = document.getElementById('memory-count');
        if (countEl) countEl.textContent = remaining;

        this.memTimer = setInterval(() => {
            if (!this.isRunning()) { this.clearTimers(); return; }
            remaining--;
            const el = document.getElementById('memory-count');
            if (el) el.textContent = remaining;
            if (remaining <= 0) {
                this.clearTimers();
                this.hideBoard();
                this.renderPeekButton();
            }
        }, 1000);
    },

    hideBoard() {
        const grid = document.querySelector('.memory-grid');
        if (!grid) return;
        grid.querySelectorAll('.memory-tile').forEach((btn, i) => {
            if (!this.session.board[i].solved) {
                btn.classList.add('hidden');
                btn.style.background = '';
            }
        });
        grid.classList.remove('locked');
    },

    tileClick(index, btn) {
        if (!this.isRunning()) return;
        const grid = document.querySelector('.memory-grid');
        if (!grid || grid.classList.contains('locked')) return;

        const tile = this.session.board[index];
        if (tile.solved) return;

        if (this.activeColor === null) {
            // First click of a group: reveal it and lock in the target color.
            this.activeColor = tile.color;
            this.solveTile(index, btn);
            return;
        }

        if (tile.color === this.activeColor) {
            this.solveTile(index, btn);
        } else {
            this.wrongAttempts++;
            btn.classList.remove('wrong');
            void btn.offsetWidth;
            btn.classList.add('wrong');
            Sound.play('wrong');
            setTimeout(() => btn.classList.remove('wrong'), 500);
        }
    },

    solveTile(index, btn) {
        const tile = this.session.board[index];
        tile.solved = true;
        this.solvedCount++;

        btn.classList.remove('hidden');
        btn.classList.add('solved', 'revealed');
        btn.style.background = tile.hex;
        Sound.play('correct');

        // When every tile of the active color is found, close the group so the
        // next click starts a fresh color.
        const remainingOfColor = this.session.board.some(
            t => t.color === this.activeColor && !t.solved
        );
        if (!remainingOfColor) this.activeColor = null;

        if (this.solvedCount === this.session.board.length) {
            const isLast = this.currentExercise === this.session.totalExercises - 1;
            this.currentExercise++;
            this.updateProgress();
            if (isLast) {
                setTimeout(() => this.completeGame(), 700);
            } else {
                setTimeout(() => this.showExercise(), 800);
            }
        }
    },

    renderMemorizeStatus() {
        const choices = document.getElementById('choices-container');
        const seconds = Math.round(this.session.config.memMs / 1000);
        choices.innerHTML =
            '<div class="memory-status">👀 ' + I18n.t('memorize') +
            ' <span id="memory-count">' + seconds + '</span></div>';
    },

    renderPeekButton() {
        const choices = document.getElementById('choices-container');
        choices.innerHTML =
            '<button id="memory-peek-btn" class="memory-peek-btn">👁️ ' + I18n.t('memoryPeek') + '</button>';
        const btn = document.getElementById('memory-peek-btn');
        btn.addEventListener('click', () => this.peek());
    },

    peek() {
        if (!this.isRunning()) return;
        const grid = document.querySelector('.memory-grid');
        if (!grid || grid.classList.contains('locked')) return;

        this.peeksUsed++;
        grid.classList.add('locked');
        const peekBtn = document.getElementById('memory-peek-btn');
        if (peekBtn) peekBtn.disabled = true;

        grid.querySelectorAll('.memory-tile').forEach((btn, i) => {
            const tile = this.session.board[i];
            if (!tile.solved) {
                btn.classList.remove('hidden');
                btn.style.background = tile.hex;
            }
        });

        this.peekTimer = setTimeout(() => {
            this.peekTimer = null;
            if (!this.isRunning()) return;
            grid.querySelectorAll('.memory-tile').forEach((btn, i) => {
                if (!this.session.board[i].solved) {
                    btn.classList.add('hidden');
                    btn.style.background = '';
                }
            });
            grid.classList.remove('locked');
            if (peekBtn) peekBtn.disabled = false;
        }, 3000);
    },

    updateProgress() {
        const total = this.session.totalExercises;
        const current = this.currentExercise;
        const fill = document.getElementById('progress-fill');
        fill.style.width = (current / total * 100) + '%';
        document.getElementById('game-score').textContent = current + ' / ' + total;
    },

    completeGame() {
        this.clearTimers();
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

        const statsEl = document.getElementById('celebration-stats');
        statsEl.innerHTML =
            I18n.t('exercises') + ': ' + this.session.totalExercises + '<br>' +
            I18n.t('wrongAttempts') + ': ' + this.wrongAttempts + '<br>' +
            I18n.t('peeksUsed') + ': ' + this.peeksUsed + '<br>' +
            I18n.t('time') + ': ' + durationSeconds + 's';

        const title = document.getElementById('celebration-title');
        if (this.wrongAttempts === 0 && this.peeksUsed === 0) {
            title.textContent = I18n.t('perfectScore');
        } else if (this.wrongAttempts <= this.session.totalExercises) {
            title.textContent = I18n.t('greatJob');
        } else {
            title.textContent = I18n.t('wellDone');
        }

        Animation.showCelebration(document.getElementById('dancing-animals'));
        Animation.showConfetti(document.getElementById('confetti-container'));
        Sound.play('victory');
        App.showScreen('celebration');
    },
};
