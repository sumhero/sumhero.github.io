const GAMES = [
    {
        type: 'dice_addition',
        nameKey: 'diceAddition',
        emoji: '🎲',
    },
    {
        type: 'count_objects',
        nameKey: 'countObjects',
        emoji: '🔢',
    },
    {
        type: 'uno',
        nameKey: 'uno',
        emoji: '🃏',
    },
    {
        type: 'dice_recognition',
        nameKey: 'diceRecognition',
        emoji: '\uD83C\uDFAF',
    },
    {
        type: 'countries',
        nameKey: 'countries',
        emoji: '\uD83C\uDF0D',
    },
    {
        type: 'capitals',
        nameKey: 'capitals',
        emoji: '\uD83C\uDFDB\uFE0F',
    },
    {
        type: 'guess_time',
        nameKey: 'guessTime',
        emoji: '\uD83D\uDD50',
    },
    {
        type: 'double_crash',
        nameKey: 'doubleCrash',
        emoji: '\uD83C\uDFA1',
    },
];

const DIFFICULTY_LEVELS = [
    { key: 'easy', labelKey: 'easy' },
    { key: 'normal', labelKey: 'normal' },
    { key: 'hard', labelKey: 'hard' },
];

const GameList = {
    selectedGame: null,
    selectedCategory: null,

    getDifficulty() {
        return localStorage.getItem('game_difficulty') || 'easy';
    },

    setDifficulty(difficulty) {
        localStorage.setItem('game_difficulty', difficulty);
    },

    init() {
        document.getElementById('btn-back-games').addEventListener('click', () => App.showScreen('games'));
        document.getElementById('btn-back-category').addEventListener('click', () => App.showScreen('games'));
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-back-settings').addEventListener('click', () => App.showScreen('games'));
        document.getElementById('btn-reload-app').addEventListener('click', () => {
            if ('caches' in window) {
                caches.keys().then(names => names.forEach(name => caches.delete(name)));
            }
            window.location.reload();
        });
    },

    load() {
        const container = document.getElementById('game-list');
        container.innerHTML = GAMES.map(game =>
            '<div class="game-card" data-type="' + game.type + '">' +
                '<span class="game-card-emoji">' + game.emoji + '</span>' +
                '<span class="game-card-name">' + I18n.t(game.nameKey) + '</span>' +
            '</div>'
        ).join('');

        container.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedGame = card.dataset.type;
                if (this.selectedGame === 'count_objects') {
                    this.showCategoryPicker();
                } else if (this.selectedGame === 'uno') {
                    UnoGame.start(this.getDifficulty());
                } else if (this.selectedGame === 'dice_recognition') {
                    DiceRecognitionGame.start(this.getDifficulty());
                } else if (this.selectedGame === 'countries') {
                    CountriesGame.start(this.getDifficulty());
                } else if (this.selectedGame === 'capitals') {
                    CapitalsGame.start(this.getDifficulty());
                } else if (this.selectedGame === 'guess_time') {
                    GuessTimeGame.start(this.getDifficulty());
                } else if (this.selectedGame === 'double_crash') {
                    DoubleCrashGame.start(this.getDifficulty());
                } else {
                    this.showPicker();
                }
            });
        });
    },

    showCategoryPicker() {
        const container = document.getElementById('category-picker');
        container.innerHTML = OBJECT_CATEGORIES.map(cat =>
            '<button class="category-btn" data-category="' + cat.key + '">' +
                '<span class="category-icon">' + cat.icon + '</span>' +
                '<span class="category-label">' + I18n.t(cat.labelKey) + '</span>' +
            '</button>'
        ).join('');

        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedCategory = btn.dataset.category;
                CountObjectsGame.start(this.getDifficulty(), this.selectedCategory);
            });
        });

        App.showScreen('category');
    },

    showPicker() {
        const container = document.getElementById('exercise-picker');
        container.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'picker-btn';
            btn.textContent = i;
            btn.addEventListener('click', () => DiceGame.start(this.selectedGame, i, this.getDifficulty()));
            container.appendChild(btn);
        }
        App.showScreen('picker');
    },

    showSettings() {
        const langContainer = document.getElementById('settings-language');
        const currentLang = I18n.getLanguage();

        langContainer.innerHTML = LANGUAGES.map(lang =>
            '<button class="difficulty-btn' + (lang.code === currentLang ? ' active' : '') + '" data-lang="' + lang.code + '">' +
                lang.flag + ' ' + lang.label +
            '</button>'
        ).join('');

        langContainer.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                I18n.setLanguage(btn.dataset.lang);
                App.applyTranslations();
                this.showSettings();
            });
        });

        const container = document.getElementById('settings-difficulty');
        const current = this.getDifficulty();

        container.innerHTML = DIFFICULTY_LEVELS.map(level =>
            '<button class="difficulty-btn' + (level.key === current ? ' active' : '') + '" data-difficulty="' + level.key + '">' +
                I18n.t(level.labelKey) +
            '</button>'
        ).join('');

        container.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setDifficulty(btn.dataset.difficulty);
                this.showSettings();
            });
        });

        App.showScreen('settings');
    },
};
