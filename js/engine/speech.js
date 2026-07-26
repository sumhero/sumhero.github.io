export const Speech = {
  LANG_TAGS: {
    en: 'en-GB',
    fr: 'fr-FR',
    de: 'de-DE',
    uk: 'uk-UA',
    ru: 'ru-RU',
  },

  isAvailable() {
    return typeof speechSynthesis !== 'undefined' && !!speechSynthesis;
  },

  cancel() {
    if (!this.isAvailable()) return;
    speechSynthesis.cancel();
  },

  speak(text, lang) {
    if (!this.isAvailable() || !text) return;

    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.LANG_TAGS[lang] || this.LANG_TAGS.en;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  },
};
