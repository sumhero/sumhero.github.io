const Animation = {
    DotLottie: null,
    lottieInstance: null,

    celebrationAnimations: [
        'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json',
        'https://assets9.lottiefiles.com/packages/lf20_u4yrau.json',
        'https://assets10.lottiefiles.com/packages/lf20_obhph3sh.json',
        'https://assets8.lottiefiles.com/packages/lf20_pkanqwys.json',
        'https://assets4.lottiefiles.com/packages/lf20_rovf9gzu.json',
        'https://assets1.lottiefiles.com/packages/lf20_s2lryxtd.json',
        'https://assets3.lottiefiles.com/packages/lf20_aEFaHc.json',
        'https://assets5.lottiefiles.com/packages/lf20_wcnjmdp1.json',
    ],

    async loadDotLottie() {
        if (this.DotLottie) return;
        try {
            const module = await import('https://esm.sh/@lottiefiles/dotlottie-web@0.67.0');
            this.DotLottie = module.DotLottie;
        } catch (e) {
            this.DotLottie = null;
        }
    },

    showCelebration(container) {
        this.destroyLottie();
        container.innerHTML = '';

        if (!this.DotLottie) {
            this.showDancingAnimalsFallback(container);
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'lottie-canvas';
        container.appendChild(canvas);

        const animations = [...this.celebrationAnimations];
        const src = animations[Math.floor(Math.random() * animations.length)];

        this.lottieInstance = new this.DotLottie({
            canvas: canvas,
            src: src,
            loop: true,
            autoplay: true,
        });
    },

    showDancingAnimalsFallback(container) {
        const animals = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐸', '🐵'];
        const selected = [];
        const pool = [...animals];
        for (let i = 0; i < 3; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            selected.push(pool.splice(idx, 1)[0]);
        }
        container.innerHTML = selected.map(a =>
            '<span class="dancing-animal">' + a + '</span>'
        ).join('');
    },

    showConfetti(container) {
        container.innerHTML = '';
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3', '#4CAF50', '#FFEB3B', '#FF9800'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = -10 + 'px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (2 + Math.random() * 3) + 's';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.width = (6 + Math.random() * 8) + 'px';
            confetti.style.height = (6 + Math.random() * 8) + 'px';
            container.appendChild(confetti);
        }
    },

    destroyLottie() {
        if (this.lottieInstance) {
            this.lottieInstance.destroy();
            this.lottieInstance = null;
        }
    },
};
