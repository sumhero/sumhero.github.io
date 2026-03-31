const DiceGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,

    start(gameType, count, difficulty) {
        this.session = {
            gameType: gameType,
            difficulty: difficulty,
            totalExercises: count,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(count);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    generateExercises(count) {
        const difficulty = this.session.difficulty;
        const maxNum = difficulty === 'easy' ? 4 : (difficulty === 'normal' ? 5 : 6);
        const ordered = difficulty === 'easy' || difficulty === 'normal';

        const usedPairs = new Set();
        const exercises = [];
        for (let i = 0; i < count; i++) {
            let op1, op2, key;
            do {
                op1 = Math.floor(Math.random() * maxNum) + 1;
                op2 = Math.floor(Math.random() * maxNum) + 1;
                if (ordered && op1 > op2) {
                    [op1, op2] = [op2, op1];
                }
                key = op1 + ':' + op2;
            } while (usedPairs.has(key));
            usedPairs.add(key);
            exercises.push({
                operand1: op1,
                operand2: op2,
                correctAnswer: op1 + op2,
            });
        }

        if (difficulty === 'easy') {
            exercises.sort((a, b) => a.correctAnswer - b.correctAnswer || a.operand1 - b.operand1);
        }

        for (let i = 0; i < exercises.length; i++) {
            exercises[i].exerciseNumber = i + 1;
            exercises[i].choices = this.generateChoices(exercises[i].correctAnswer);
        }

        return exercises;
    },

    generateChoices(correct) {
        const difficulty = this.session.difficulty;
        const maxSum = difficulty === 'easy' ? 8 : (difficulty === 'normal' ? 10 : 12);
        const choices = [correct];
        while (choices.length < 5) {
            const wrong = Math.floor(Math.random() * (maxSum - 1)) + 2;
            if (!choices.includes(wrong)) choices.push(wrong);
        }
        choices.sort(() => Math.random() - 0.5);
        return choices;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const diceContainer = document.getElementById('dice-container');
        diceContainer.innerHTML =
            '<div class="dice-with-number">' + DiceRenderer.render(exercise.operand1) + '<span class="dice-number">' + exercise.operand1 + '</span></div>' +
            '<span class="dice-plus">+</span>' +
            '<div class="dice-with-number">' + DiceRenderer.render(exercise.operand2) + '<span class="dice-number">' + exercise.operand2 + '</span></div>';

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = exercise.choices.map(choice =>
            '<button class="choice-btn" data-answer="' + choice + '">' + choice + '</button>'
        ).join('');

        choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.answer), btn));
        });

        this.updateProgress();
    },

    answer(value, btn) {
        if (btn.dataset.wrongChoice) {
            btn.classList.remove('wrong');
            void btn.offsetWidth;
            btn.classList.add('wrong');
            Sound.play('wrong');
            return;
        }

        const exercise = this.session.exercises[this.currentExercise];
        const isCorrect = value === exercise.correctAnswer;

        if (isCorrect) {
            btn.classList.add('correct');
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

        const result = {
            gameType: this.session.gameType,
            difficulty: this.session.difficulty,
            totalExercises: this.session.totalExercises,
            wrongAttempts: this.wrongAttempts,
            durationSeconds: durationSeconds,
            playedAt: new Date().toISOString(),
        };


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
