const CountriesGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,

    start(difficulty) {
        const roundCount = difficulty === 'easy' ? 5 : (difficulty === 'normal' ? 10 : 20);
        const pool = getCountryPool(difficulty);

        this.session = {
            gameType: 'countries',
            difficulty: difficulty,
            totalExercises: roundCount,
            pool: pool,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(roundCount, pool);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    generateExercises(count, pool) {
        const exercises = [];
        const used = new Set();

        for (let i = 0; i < count; i++) {
            let idx;
            do {
                idx = Math.floor(Math.random() * pool.length);
            } while (used.has(idx) && used.size < pool.length);
            used.add(idx);

            const country = pool[idx];
            exercises.push({
                exerciseNumber: i + 1,
                country: country,
                choices: this.generateChoices(country, pool),
            });
        }

        return exercises;
    },

    generateChoices(correctCountry, pool) {
        const correctName = getCountryName(correctCountry);
        const choices = [correctName];
        const others = pool.filter(c => c.name !== correctCountry.name);

        while (choices.length < 5 && others.length > 0) {
            const idx = Math.floor(Math.random() * others.length);
            const name = getCountryName(others[idx]);
            if (!choices.includes(name)) {
                choices.push(name);
            }
            others.splice(idx, 1);
        }

        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        return choices;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('geo-game-layout');

        const diceContainer = document.getElementById('dice-container');
        diceContainer.innerHTML =
            '<img src="/flags/' + exercise.country.flag + '.svg" class="geo-flag" alt="">';

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.style.gridTemplateColumns = '';
        choicesContainer.innerHTML = exercise.choices.map(choice =>
            '<button class="choice-btn geo-choice-btn" data-answer="' + choice + '">' + choice + '</button>'
        ).join('');

        choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.answer(btn.dataset.answer, btn));
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
        const isCorrect = value === getCountryName(exercise.country);

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
