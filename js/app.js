const App = {
    init() {
        GameList.init();
        Animation.loadDotLottie();
        this.initOfflineIndicator();

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

    showScreen(name) {
        const current = document.querySelector('.screen.active');
        const next = document.getElementById('screen-' + name);

        if (current && current !== next) {
            current.classList.add('screen-out');
            current.classList.remove('active');
            current.addEventListener('animationend', () => {
                current.classList.remove('screen-out');
            }, {once: true});
        }

        next.classList.add('active');

        if (name !== 'game') {
            document.body.classList.remove('time-theme-day', 'time-theme-night');
            const gameBody = document.querySelector('.game-body');
            if (gameBody) {
                gameBody.classList.remove('uno-game-body');
                gameBody.classList.remove('dice-recognition-layout');
                gameBody.classList.remove('geo-game-layout');
                gameBody.classList.remove('time-game-layout');
                const choices = document.getElementById('choices-container');
                if (choices) choices.style.gridTemplateColumns = '';
            }
        }

        if (name === 'games') {
            GameList.load();
        }
    },

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
