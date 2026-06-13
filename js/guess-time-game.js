const ClockRenderer = {
    render(hour, minute, size = 200) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 6;

        let ticks = '';
        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) * Math.PI / 180;
            const outer = r - 4;
            const inner = r - 16;
            const x1 = cx + outer * Math.sin(angle);
            const y1 = cy - outer * Math.cos(angle);
            const x2 = cx + inner * Math.sin(angle);
            const y2 = cy - inner * Math.cos(angle);
            ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
                '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
                '" stroke="#333" stroke-width="3" stroke-linecap="round"/>';
        }

        let numbers = '';
        const numR = r - 30;
        for (let n = 1; n <= 12; n++) {
            const angle = (n * 30) * Math.PI / 180;
            const x = cx + numR * Math.sin(angle);
            const y = cy - numR * Math.cos(angle);
            numbers += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
                '" font-size="' + (size * 0.11) + '" font-weight="700" fill="#333"' +
                ' text-anchor="middle" dominant-baseline="central" font-family="sans-serif">' + n + '</text>';
        }

        const minuteAngle = (minute * 6) * Math.PI / 180;
        const hourAngle = ((hour % 12) * 30 + minute * 0.5) * Math.PI / 180;

        const hourLen = r * 0.5;
        const minLen = r * 0.78;

        const hx = cx + hourLen * Math.sin(hourAngle);
        const hy = cy - hourLen * Math.cos(hourAngle);
        const mx = cx + minLen * Math.sin(minuteAngle);
        const my = cy - minLen * Math.cos(minuteAngle);

        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" class="clock-svg dice-enter">' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="#333" stroke-width="5"/>' +
            ticks +
            numbers +
            '<line x1="' + cx + '" y1="' + cy + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) +
                '" stroke="#333" stroke-width="7" stroke-linecap="round"/>' +
            '<line x1="' + cx + '" y1="' + cy + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) +
                '" stroke="#4a90d9" stroke-width="5" stroke-linecap="round"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + (size * 0.04) + '" fill="#333"/>' +
            '</svg>';
    },
};

const GuessTimeGame = {
    session: null,
    currentExercise: 0,
    wrongAttempts: 0,
    startTime: null,

    start(difficulty) {
        const roundCount = difficulty === 'easy' ? 5 : (difficulty === 'normal' ? 10 : 20);

        this.session = {
            gameType: 'guess_time',
            difficulty: difficulty,
            totalExercises: roundCount,
            exercises: [],
        };
        this.session.exercises = this.generateExercises(roundCount, difficulty);
        this.currentExercise = 0;
        this.wrongAttempts = 0;
        this.startTime = Date.now();
        this.showExercise();
        App.showScreen('game');
    },

    pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    },

    formatTime(t) {
        return this.pad2(t.hour) + ':' + this.pad2(t.minute);
    },

    randomTime(difficulty) {
        if (difficulty === 'easy') {
            const hour = Math.floor(Math.random() * 12) + 1; // 1-12
            return { hour: hour, minute: 0 };
        }
        const minutes = difficulty === 'hard' ? [0, 15, 30, 45] : [0, 30];
        const hour = Math.floor(Math.random() * 24); // 0-23
        const minute = minutes[Math.floor(Math.random() * minutes.length)];
        return { hour: hour, minute: minute };
    },

    generateExercises(count, difficulty) {
        const exercises = [];
        let prevStr = null;

        for (let i = 0; i < count; i++) {
            let time;
            do {
                time = this.randomTime(difficulty);
            } while (this.formatTime(time) === prevStr);
            prevStr = this.formatTime(time);

            exercises.push({
                exerciseNumber: i + 1,
                time: time,
                choices: this.generateChoices(time, difficulty),
            });
        }

        return exercises;
    },

    generateChoices(correct, difficulty) {
        const correctStr = this.formatTime(correct);
        const seen = new Set([correctStr]);
        const choices = [correctStr];

        while (choices.length < 4) {
            const t = this.randomTime(difficulty);
            const str = this.formatTime(t);
            if (!seen.has(str)) {
                seen.add(str);
                choices.push(str);
            }
        }

        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        return choices;
    },

    isDaytime(time) {
        return time.hour >= 6 && time.hour < 18;
    },

    showExercise() {
        const exercise = this.session.exercises[this.currentExercise];
        if (!exercise) return;

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('time-game-layout');

        const diceContainer = document.getElementById('dice-container');
        let dayNight = '';
        document.body.classList.remove('time-theme-day', 'time-theme-night');
        if (this.session.difficulty !== 'easy') {
            const isDay = this.isDaytime(exercise.time);
            document.body.classList.add(isDay ? 'time-theme-day' : 'time-theme-night');
            const icon = isDay ? '☀️' : '🌙';
            dayNight = '<div class="time-daynight">' + icon + '</div>';
        }
        diceContainer.innerHTML = dayNight + ClockRenderer.render(exercise.time.hour, exercise.time.minute);

        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.style.gridTemplateColumns = '';
        choicesContainer.innerHTML = exercise.choices.map(choice =>
            '<button class="choice-btn time-choice-btn" data-answer="' + choice + '">' + choice + '</button>'
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
        const isCorrect = value === this.formatTime(exercise.time);

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
