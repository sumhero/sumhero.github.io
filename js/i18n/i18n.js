import { TRANSLATIONS } from './translations.js';

const DEFAULT_LANGUAGE = 'en';

export const I18n = {
    getLanguage() {
        return localStorage.getItem('game_language') || DEFAULT_LANGUAGE;
    },

    setLanguage(code) {
        localStorage.setItem('game_language', code);
    },

    format(template, params) {
        if (!params) return template;

        return template.replace(/\{(\w+)\}/g, (match, name) =>
            Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
        );
    },

    t(key, params) {
        const lang = this.getLanguage();
        const template = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key])
            || TRANSLATIONS[DEFAULT_LANGUAGE][key]
            || key;

        return this.format(template, params);
    },
};
