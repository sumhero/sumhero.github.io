const OBJECT_CATEGORIES = [
    {
        key: 'animals',
        labelKey: 'animals',
        icon: '🐶',
        emojis: ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐸', '🐵', '🐷', '🐮', '🐔', '🦆', '🐧'],
    },
    {
        key: 'food',
        labelKey: 'food',
        icon: '🍕',
        emojis: ['🍎', '🍕', '🍔', '🍩', '🍪', '🧁', '🍰', '🍉', '🍇', '🍓', '🍌', '🍒', '🥕', '🌽', '🍫'],
    },
    {
        key: 'flags',
        labelKey: 'flags',
        icon: '🏁',
        emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🇺🇦', '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇯🇵', '🇰🇷', '🇧🇷', '🇨🇦'],
    },
    {
        key: 'figures',
        labelKey: 'figures',
        icon: '🔵',
        emojis: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⬛', '🔶', '🔷', '💎', '🔺', '🔻', '⭐', '💜'],
    },
    {
        key: 'transport',
        labelKey: 'transport',
        icon: '🚗',
        emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚀', '🛸', '🚁', '⛵', '🚂'],
    },
    {
        key: 'sports',
        labelKey: 'sports',
        icon: '⚽',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🏆', '🥇', '🎯', '🏋️'],
    },
    {
        key: 'nature',
        labelKey: 'nature',
        icon: '🌸',
        emojis: ['🌸', '🌻', '🌺', '🌷', '🌹', '🍀', '🌴', '🌵', '🍄', '🌈', '⭐', '🌙', '☀️', '❄️', '🔥'],
    },
    {
        key: 'sea',
        labelKey: 'seaLife',
        icon: '🐠',
        emojis: ['🐠', '🐟', '🐙', '🦀', '🦞', '🦑', '🐳', '🐬', '🦈', '🐚', '🪸', '🐡', '🦐', '🐢', '🪼'],
    },
    {
        key: 'insects',
        labelKey: 'insects',
        icon: '🦋',
        emojis: ['🦋', '🐛', '🐝', '🐞', '🦗', '🐜', '🪲', '🪳', '🦟', '🪰', '🐌', '🕷️', '🦂', '🪱', '🐾'],
    },
    {
        key: 'music',
        labelKey: 'music',
        icon: '🎵',
        emojis: ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎷', '🪘', '🎻', '🪗', '🎤', '🎧', '🔔', '📯', '🪈'],
    },
];

const CountObjectsGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,
    selectedCategory: null,

    start(difficulty, category) {
        this.selectedCategory = OBJECT_CATEGORIES.find(c => c.key === category);
        this.session = {
            gameType: 'count_objects',
            difficulty: difficulty,
            totalExercises: 10,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(10);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    generateExercises(count) {
        const difficulty = this.session.difficulty;
        let minNum, maxNum;
        if (difficulty === 'easy') { minNum = 1; maxNum = 5; }
        else if (difficulty === 'normal') { minNum = 2; maxNum = 7; }
        else { minNum = 5; maxNum = 10; }

        const availableEmojis = [...this.selectedCategory.emojis];
        for (let i = availableEmojis.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableEmojis[i], availableEmojis[j]] = [availableEmojis[j], availableEmojis[i]];
        }

        const exercises = [];
        let lastCount = -1;
        for (let i = 0; i < count; i++) {
            let objectCount;
            do {
                objectCount = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
            } while (objectCount === lastCount && maxNum - minNum >= 1);
            lastCount = objectCount;

            exercises.push({
                exerciseNumber: i + 1,
                objectCount: objectCount,
                emoji: availableEmojis[i % availableEmojis.length],
                choices: this.generateChoices(objectCount, minNum, maxNum),
            });
        }

        return exercises;
    },

    generateChoices(correct, minNum, maxNum) {
        const choices = [correct];
        while (choices.length < 5) {
            const wrong = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
            if (!choices.includes(wrong)) choices.push(wrong);
        }
        choices.sort(() => Math.random() - 0.5);

        return choices;
    },

    generatePositions(count) {
        const positions = [];
        const minDistance = 18;

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let x, y;
            do {
                x = 10 + Math.random() * 80;
                y = 10 + Math.random() * 80;
                attempts++;
            } while (attempts < 100 && positions.some(p => {
                const dx = p.x - x;
                const dy = p.y - y;

                return Math.sqrt(dx * dx + dy * dy) < minDistance;
            }));
            positions.push({ x, y });
        }

        return positions;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const diceContainer = document.getElementById('dice-container');
        const positions = this.generatePositions(exercise.objectCount);
        diceContainer.innerHTML =
            '<div class="objects-field">' +
            positions.map(pos =>
                '<span class="count-object" style="left:' + pos.x + '%;top:' + pos.y + '%">' + exercise.emoji + '</span>'
            ).join('') +
            '</div>';

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
        const isCorrect = value === exercise.objectCount;

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
