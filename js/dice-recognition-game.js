const DiceRecognitionGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,

    start(difficulty) {
        const roundCount = difficulty === 'easy' ? 5 : (difficulty === 'normal' ? 10 : 20);
        const minNum = difficulty === 'hard' ? 2 : 1;
        const maxNum = difficulty === 'easy' ? 4 : (difficulty === 'normal' ? 5 : 6);

        this.session = {
            gameType: 'dice_recognition',
            difficulty: difficulty,
            totalExercises: roundCount,
            minNum: minNum,
            maxNum: maxNum,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(roundCount, minNum, maxNum);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    generateExercises(count, minNum, maxNum) {
        const exercises = [];
        let prevNumber = null;

        for (let i = 0; i < count; i++) {
            let num;
            do {
                num = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
            } while (num === prevNumber);
            prevNumber = num;

            exercises.push({
                exerciseNumber: i + 1,
                diceValue: num,
            });
        }

        return exercises;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('dice-recognition-layout');

        const diceContainer = document.getElementById('dice-container');
        diceContainer.innerHTML = DiceRenderer.render(exercise.diceValue);

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.style.gridTemplateColumns = 'repeat(6, 1fr)';
        choicesContainer.innerHTML = [1, 2, 3, 4, 5, 6].map(choice =>
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
        const isCorrect = value === exercise.diceValue;

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
