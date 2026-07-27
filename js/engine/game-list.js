import { App } from '../app.js';
import { I18n } from '../i18n/i18n.js';
import { LANGUAGES } from '../i18n/translations.js';
import { OBJECT_CATEGORIES } from '../games/object-categories.js';
import { CountObjectsGame } from '../games/count-objects.js';
import { DiceAdditionGame } from '../games/dice-addition.js';
import { GameEngine } from './game-engine.js';
import { showScreen } from './screens.js';
import { GAMES, gamesByDomain } from './registry.js';

export const DIFFICULTY_LEVELS = [
    { key: 'easy', labelKey: 'easy' },
    { key: 'normal', labelKey: 'normal' },
    { key: 'hard', labelKey: 'hard' },
];

export const GameList = {
    selectedGame: null,
    selectedCategory: null,

    getDifficulty() {
        return localStorage.getItem('game_difficulty') || 'easy';
    },

    setDifficulty(difficulty) {
        localStorage.setItem('game_difficulty', difficulty);
    },

    init() {
        document.getElementById('btn-back-games').addEventListener('click', () => showScreen('games'));
        document.getElementById('btn-back-category').addEventListener('click', () => showScreen('games'));
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-back-settings').addEventListener('click', () => showScreen('games'));
        document.getElementById('btn-reload-app').addEventListener('click', () => {
            if ('caches' in window) {
                caches.keys().then(names => names.forEach(name => caches.delete(name)));
            }
            window.location.reload();
        });
    },

    load() {
        const container = document.getElementById('game-list');
        container.innerHTML = gamesByDomain().map(({ domain, games }) =>
            '<section class="game-group">' +
                '<h3 class="game-group-title">' + domain.emoji + ' ' + I18n.t(domain.labelKey) + '</h3>' +
                '<div class="game-group-cards">' +
                    games.map(game =>
                        '<div class="game-card" data-id="' + game.id + '">' +
                            '<span class="game-card-emoji">' + game.emoji + '</span>' +
                            '<span class="game-card-name">' + I18n.t(game.nameKey) + '</span>' +
                        '</div>'
                    ).join('') +
                '</div>' +
            '</section>'
        ).join('');

        container.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const game = GAMES.find(g => g.id === card.dataset.id);
                this.selectedGame = game;

                if (game.legacy) {
                    game.start(this.getDifficulty());
                } else if (game.setup === 'category') {
                    this.showCategoryPicker();
                } else if (game.rounds === 'ask') {
                    this.showPicker();
                } else {
                    GameEngine.start(game, { difficulty: this.getDifficulty() });
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
                GameEngine.start(this.selectedGame, { difficulty: this.getDifficulty(), category: this.selectedCategory });
            });
        });

        showScreen('category');
    },

    showPicker() {
        const container = document.getElementById('exercise-picker');
        container.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'picker-btn';
            btn.textContent = i;
            btn.addEventListener('click', () => GameEngine.start(this.selectedGame, { difficulty: this.getDifficulty(), count: i }));
            container.appendChild(btn);
        }
        showScreen('picker');
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

        showScreen('settings');
    },
};
