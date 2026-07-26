import { GameList } from './game-list.js';
import { Animation } from './animation.js';
import { I18n } from './i18n/i18n.js';
import { showScreen, onScreenChange } from './engine/screens.js';

export const App = {
    init() {
        GameList.init();
        Animation.loadDotLottie();
        this.initOfflineIndicator();

        onScreenChange(name => {
            if (name === 'games') GameList.load();
        });

        document.getElementById('btn-exit-game').addEventListener('click', () => App.showScreen('games'));

        document.getElementById('btn-play-again').addEventListener('click', () => {
            Animation.destroyLottie();
            document.getElementById('confetti-container').innerHTML = '';
            App.showScreen('games');
        });

        window.addEventListener('online', () => {
            this.updateOfflineIndicator();
        });

        window.addEventListener('offline', () => {
            this.updateOfflineIndicator();
        });

        this.applyTranslations();
        this.showScreen('games');

        document.getElementById('screen-loading').remove();
    },

    initOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;' +
            'background:#f44336;color:#fff;text-align:center;padding:4px 8px;' +
            'font-size:0.85rem;z-index:100;';
        document.body.prepend(indicator);

        this.updateOfflineIndicator();
    },

    updateOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (!indicator) return;

        if (!navigator.onLine) {
            indicator.textContent = I18n.t('offline');
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    },

    showScreen,

    applyTranslations() {
        document.getElementById('page-title').textContent = I18n.t('appName');
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = I18n.t(el.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = I18n.t(el.dataset.i18nPlaceholder);
        });
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
