import { App } from './app.js';
import { I18n } from './translations.js';
import { Sound } from './sound.js';
import { Animation } from './animation.js';

export const CHESS_SIZE = 3;

export const CHESS_PIECES = {
    king: '♚',
    rook: '♜',
    bishop: '♝',
    queen: '♛',
    knight: '♞',
};

export const CHESS_PIECE_KEYS = ['king', 'rook', 'bishop', 'queen', 'knight'];

export const ChessMoves = {
    inBounds(r, c) {
        return r >= 0 && r < CHESS_SIZE && c >= 0 && c < CHESS_SIZE;
    },

    // Legal target squares for a piece alone on the board (no blockers).
    targets(piece, r0, c0) {
        const out = [];
        for (let r = 0; r < CHESS_SIZE; r++) {
            for (let c = 0; c < CHESS_SIZE; c++) {
                if (r === r0 && c === c0) continue;
                if (this.canMove(piece, r0, c0, r, c)) out.push({ r: r, c: c });
            }
        }
        return out;
    },

    canMove(piece, r0, c0, r, c) {
        const dr = r - r0;
        const dc = c - c0;
        const adr = Math.abs(dr);
        const adc = Math.abs(dc);

        switch (piece) {
            case 'king':
                return Math.max(adr, adc) === 1;
            case 'rook':
                return dr === 0 || dc === 0;
            case 'bishop':
                return adr === adc;
            case 'queen':
                return dr === 0 || dc === 0 || adr === adc;
            case 'knight':
                return (adr === 1 && adc === 2) || (adr === 2 && adc === 1);
            default:
                return false;
        }
    },
};

export const ChessGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,

    start(difficulty) {
        const roundCount = difficulty === 'easy' ? 5 : (difficulty === 'normal' ? 10 : 20);

        this.session = {
            gameType: 'chess',
            difficulty: difficulty,
            totalExercises: roundCount,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(roundCount);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    randInt(n) {
        return Math.floor(Math.random() * n);
    },

    generateExercises(count) {
        const exercises = [];
        let prevKey = null;

        for (let i = 0; i < count; i++) {
            let piece, r, c, targets, key;
            do {
                piece = CHESS_PIECE_KEYS[this.randInt(CHESS_PIECE_KEYS.length)];
                r = this.randInt(CHESS_SIZE);
                c = this.randInt(CHESS_SIZE);
                targets = ChessMoves.targets(piece, r, c);
                key = piece + r + c;
            } while (targets.length === 0 || key === prevKey);
            prevKey = key;

            exercises.push({
                piece: piece,
                row: r,
                col: c,
                targets: targets.map(t => t.r + ',' + t.c),
            });
        }

        return exercises;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('chess-game-layout');

        const diceContainer = document.getElementById('dice-container');

        let cells = '';
        for (let r = 0; r < CHESS_SIZE; r++) {
            for (let c = 0; c < CHESS_SIZE; c++) {
                const dark = (r + c) % 2 === 1;
                const isPiece = r === exercise.row && c === exercise.col;
                cells += '<button class="chess-cell ' + (dark ? 'chess-dark' : 'chess-light') +
                    (isPiece ? ' chess-piece-cell' : '') + '" data-cell="' + r + ',' + c + '">' +
                    (isPiece ? '<span class="chess-piece">' + CHESS_PIECES[exercise.piece] + '</span>' : '') +
                    '</button>';
            }
        }

        diceContainer.innerHTML =
            '<div class="chess-caption">' + I18n.t('chessPrompt') + '</div>' +
            '<div class="chess-board">' + cells + '</div>';

        diceContainer.querySelectorAll('.chess-cell').forEach(btn => {
            btn.addEventListener('click', () => this.answer(btn.dataset.cell, btn));
        });

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';

        this.updateProgress();
    },

    answer(cell, btn) {
        if (btn.dataset.wrongChoice) {
            btn.classList.remove('wrong');
            void btn.offsetWidth;
            btn.classList.add('wrong');
            Sound.play('wrong');
            return;
        }

        const exercise = this.session.exercises[this.currentExercise];
        const isCorrect = exercise.targets.indexOf(cell) !== -1;

        if (isCorrect) {
            btn.classList.add('chess-correct');
            Sound.play('correct');

            const isLast = this.currentExercise === this.session.totalExercises - 1;
            if (isLast) {
                setTimeout(() => this.completeGame(), 600);
            } else {
                this.currentExercise++;
                setTimeout(() => this.showExercise(), 600);
            }
        } else {
            this.wrongAttempts++;
            btn.classList.add('wrong');
            btn.dataset.wrongChoice = '1';
            Sound.play('wrong');
        }
    },

    updateProgress() {
        const total = this.session.totalExercises;
        const current = this.currentExercise;
        const fill = document.getElementById('progress-fill');
        fill.style.width = (current / total * 100) + '%';
        document.getElementById('game-score').textContent = current + ' / ' + total;
    },

    completeGame() {
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);

        const statsEl = document.getElementById('celebration-stats');
        statsEl.innerHTML =
            I18n.t('exercises') + ': ' + this.session.totalExercises + '<br>' +
            I18n.t('wrongAttempts') + ': ' + this.wrongAttempts + '<br>' +
            I18n.t('time') + ': ' + durationSeconds + 's';

        const title = document.getElementById('celebration-title');
        if (this.wrongAttempts === 0) {
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
