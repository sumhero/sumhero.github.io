const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];

const UNO_COLOR_VALUES = {
    red: { bg: '#E53935', border: '#B71C1C', text: '#fff' },
    blue: { bg: '#1E88E5', border: '#0D47A1', text: '#fff' },
    green: { bg: '#43A047', border: '#1B5E20', text: '#fff' },
    yellow: { bg: '#FDD835', border: '#F9A825', text: '#333' },
};

const UNO_NUMBER_ANIMALS = {
    0: '\uD83E\uDD81', // lion
    1: '\uD83D\uDC18', // elephant
    2: '\uD83D\uDC2C', // dolphin
    3: '\uD83E\uDD92', // giraffe
    4: '\uD83D\uDC3B', // bear
    5: '\uD83D\uDC28', // koala
    6: '\uD83E\uDD8A', // fox
    7: '\uD83D\uDC30', // rabbit
    8: '\uD83D\uDC3C', // panda
    9: '\uD83D\uDC35', // monkey
};

const UnoGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,
    deck: [],

    start(difficulty) {
        const roundCount = difficulty === 'easy' ? 5 : (difficulty === 'normal' ? 10 : 20);
        this.session = {
            gameType: 'uno',
            difficulty: difficulty,
            totalExercises: roundCount,
            exercises: [],
        };
        this.deck = this.buildDeck();
        this.session.exercises = this.generateExercises(roundCount);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    buildDeck() {
        const cards = [];
        for (const color of UNO_COLORS) {
            for (let num = 0; num <= 9; num++) {
                cards.push({ color: color, number: num, animal: UNO_NUMBER_ANIMALS[num] });
            }
        }

        return cards;
    },

    generateExercises(count) {
        const exercises = [];
        for (let i = 0; i < count; i++) {
            exercises.push(this.generateOneExercise(i + 1));
        }

        return exercises;
    },

    generateOneExercise(exerciseNumber) {
        const mainCard = this.deck[Math.floor(Math.random() * this.deck.length)];

        const matchType = Math.random() < 0.5 ? 'number' : 'color';

        let correctCard;
        if (matchType === 'number') {
            const otherColors = UNO_COLORS.filter(c => c !== mainCard.color);
            const color = otherColors[Math.floor(Math.random() * otherColors.length)];
            correctCard = { color: color, number: mainCard.number, animal: mainCard.animal };
        } else {
            let num;
            do {
                num = Math.floor(Math.random() * 10);
            } while (num === mainCard.number);
            correctCard = { color: mainCard.color, number: num, animal: UNO_NUMBER_ANIMALS[num] };
        }

        const choices = [correctCard];
        const usedKeys = new Set();
        usedKeys.add(mainCard.color + ':' + mainCard.number);
        usedKeys.add(correctCard.color + ':' + correctCard.number);

        while (choices.length < 5) {
            const color = UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)];
            const num = Math.floor(Math.random() * 10);
            const key = color + ':' + num;
            if (usedKeys.has(key)) continue;
            if (color === mainCard.color || num === mainCard.number) continue;
            usedKeys.add(key);
            choices.push({ color: color, number: num, animal: UNO_NUMBER_ANIMALS[num] });
        }

        choices.sort(() => Math.random() - 0.5);

        return {
            exerciseNumber: exerciseNumber,
            mainCard: mainCard,
            choices: choices,
            correctIndex: choices.indexOf(correctCard),
        };
    },

    renderCard(card, size) {
        const cv = UNO_COLOR_VALUES[card.color];
        const cls = size === 'small' ? 'uno-card uno-card-small' : 'uno-card uno-card-main';

        return '<div class="' + cls + '" style="background:' + cv.bg + ';border-color:' + cv.border + ';color:' + cv.text + '">' +
            '<span class="uno-card-corner uno-card-corner-tl">' + card.number + '</span>' +
            '<span class="uno-card-animal">' + card.animal + '</span>' +
            '<span class="uno-card-corner uno-card-corner-br">' + card.number + '</span>' +
        '</div>';
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        document.querySelector('.game-body').classList.add('uno-game-body');

        const diceContainer = document.getElementById('dice-container');
        diceContainer.innerHTML = this.renderCard(exercise.mainCard, 'main');

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = exercise.choices.map((choice, idx) =>
            '<button class="uno-choice-btn" data-index="' + idx + '">' +
                this.renderCard(choice, 'small') +
            '</button>'
        ).join('');

        choicesContainer.querySelectorAll('.uno-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.index), btn));
        });

        this.updateProgress();
    },

    answer(index, btn) {
        if (btn.dataset.wrongChoice) {
            btn.classList.remove('wrong');
            void btn.offsetWidth;
            btn.classList.add('wrong');
            Sound.play('wrong');

            return;
        }

        const exercise = this.session.exercises[this.currentExercise];
        const isCorrect = index === exercise.correctIndex;

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
