const ROULETTE_NUMBERS = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30, 31, 32, 33, 34, 35, 36,
];

const GAME_STATES = {
    IDLE: 'IDLE',
    BETTING: 'BETTING',
    WHEEL_1_SPINNING: 'WHEEL_1_SPINNING',
    WHEEL_1_DECISION: 'WHEEL_1_DECISION',
    WHEEL_1_RESOLVED: 'WHEEL_1_RESOLVED',
    WHEEL_2_SPINNING: 'WHEEL_2_SPINNING',
    WHEEL_2_DECISION: 'WHEEL_2_DECISION',
    RESOLVED: 'RESOLVED',
    CASHED_OUT: 'CASHED_OUT',
};

// How many numbers each reveal removes from a wheel, over 5 iterations.
// Sums to 36 so that after the last reveal only the final number remains.
const REVEAL_PLAN = [8, 7, 7, 7, 7];

const RTP = 0.98;
const CASHOUT_PENALTY = 0.95;
const START_BALANCE = 1000;
const MIN_BET = 0.1;
const MAX_BET = 100;

const DoubleCrashGame = {
    balance: START_BALANCE,
    state: GAME_STATES.IDLE,
    round: null,
    logEntries: [],
    pendingStake: 0.1,
    pendingSide: 'HIGHER',
    showDebug: false,
    showRules: false,
    idCounter: 0,

    // ---- entry point (called from the game registry) ----
    start() {
        this.balance = START_BALANCE;
        this.logEntries = [];
        this.pendingStake = 0.1;
        this.pendingSide = 'HIGHER';
        this.showDebug = false;
        this.showRules = false;
        this.idCounter = 0;

        const gameBody = document.querySelector('.game-body');
        gameBody.classList.add('crash-game-layout');
        document.getElementById('choices-container').innerHTML = '';
        document.getElementById('game-score').textContent = '';
        document.getElementById('progress-fill').style.width = '0%';

        this.startNewRound();
        App.showScreen('game');
    },

    // ---- math helpers ----
    floorTo2(value) {
        return Math.floor(value * 100) / 100;
    },

    floorTo3(value) {
        return Math.floor(value * 1000) / 1000;
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    generateId() {
        this.idCounter++;
        return 'id_' + this.idCounter + '_' + Math.floor(Math.random() * 100000);
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    countPossiblePairs(remainingWheel1, remainingWheel2) {
        return remainingWheel1.length * remainingWheel2.length;
    },

    countWinningPairs(side, threshold, remainingWheel1, remainingWheel2) {
        let count = 0;
        for (const n1 of remainingWheel1) {
            for (const n2 of remainingWheel2) {
                const score = n1 + n2;
                if (side === 'HIGHER' && score > threshold) count++;
                if (side === 'LOWER' && score < threshold) count++;
            }
        }
        return count;
    },

    countEqualPairs(threshold, remainingWheel1, remainingWheel2) {
        let count = 0;
        for (const n1 of remainingWheel1) {
            for (const n2 of remainingWheel2) {
                if (n1 + n2 === threshold) count++;
            }
        }
        return count;
    },

    calculateProbability(side, threshold, remainingWheel1, remainingWheel2) {
        const possiblePairs = this.countPossiblePairs(remainingWheel1, remainingWheel2);
        if (possiblePairs === 0) return 0;
        const winningPairs = this.countWinningPairs(side, threshold, remainingWheel1, remainingWheel2);
        return winningPairs / possiblePairs;
    },

    calculateOdds(side, threshold, remainingWheel1, remainingWheel2) {
        const possiblePairs = this.countPossiblePairs(remainingWheel1, remainingWheel2);
        const winningPairs = this.countWinningPairs(side, threshold, remainingWheel1, remainingWheel2);
        if (winningPairs === 0) return null;
        const rawOdds = RTP * possiblePairs / winningPairs;
        return this.floorTo3(rawOdds);
    },

    // ---- round lifecycle ----
    createEliminationOrder(finalNumber) {
        const numbersToRemove = ROULETTE_NUMBERS.filter(n => n !== finalNumber);
        this.shuffle(numbersToRemove);
        return numbersToRemove;
    },

    startNewRound() {
        const threshold = this.randomInt(21, 51);
        const wheel1Final = this.randomInt(0, 36);
        const wheel2Final = this.randomInt(0, 36);

        this.round = {
            id: 'round_' + this.generateId(),
            threshold: threshold,
            wheel1Final: wheel1Final,
            wheel2Final: wheel2Final,
            finalScore: null,
            remainingWheel1: ROULETTE_NUMBERS.slice(),
            remainingWheel2: ROULETTE_NUMBERS.slice(),
            wheel1EliminationOrder: this.createEliminationOrder(wheel1Final),
            wheel2EliminationOrder: this.createEliminationOrder(wheel2Final),
            wheel1RevealIndex: 0,
            wheel2RevealIndex: 0,
            currentPhase: GAME_STATES.BETTING,
            initialStake: 0,
            startBalance: this.balance,
            bets: [],
            isResolved: false,
            result: null,
        };

        this.state = GAME_STATES.BETTING;
        this.round.currentPhase = this.state;
        this.log('Round started. Threshold: ' + threshold + '.');
        this.updateUI();
    },

    validateStake(stake) {
        if (!Number.isFinite(stake)) return 'Invalid bet amount.';
        if (stake < MIN_BET) return 'Bet must be at least €' + MIN_BET + '.';
        if (stake > MAX_BET) return 'Bet cannot exceed €' + MAX_BET + '.';
        if (stake > this.balance) return 'Insufficient balance.';
        return null;
    },

    startBet(side, stake) {
        const error = this.validateStake(stake);
        if (error) {
            this.log(error);
            this.updateUI();
            return;
        }

        const odds = this.calculateOdds(
            side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        if (odds === null) {
            this.log('Cannot bet ' + side + ': no winning pairs.');
            this.updateUI();
            return;
        }

        this.balance -= stake;
        this.round.initialStake = stake;
        this.round.bets.push({
            id: this.generateId(),
            type: 'INITIAL',
            side: side,
            stake: stake,
            lockedOdds: odds,
            status: 'OPEN',
            payout: 0,
            createdAtPhase: GAME_STATES.BETTING,
        });

        this.state = GAME_STATES.WHEEL_1_SPINNING;
        this.round.currentPhase = this.state;
        this.log('Player bet €' + this.fmt(stake) + ' on ' + side + ' at x' + odds + '.');
        this.log('Wheel 1 started.');
        // nothing is revealed yet, so there is no real decision to make —
        // advance the first reveal automatically before asking the player
        this.nextReveal();
    },

    nextReveal() {
        if (this.state === GAME_STATES.WHEEL_1_SPINNING || this.state === GAME_STATES.WHEEL_1_DECISION) {
            this.revealWheel1Step();
            return;
        }
        if (this.state === GAME_STATES.WHEEL_2_SPINNING || this.state === GAME_STATES.WHEEL_2_DECISION) {
            this.revealWheel2Step();
            return;
        }
    },

    removeNumbersFromWheel(wheelNumber, count) {
        const order = wheelNumber === 1 ? this.round.wheel1EliminationOrder : this.round.wheel2EliminationOrder;
        const batch = order.splice(0, Math.min(count, order.length));
        const batchSet = new Set(batch);
        if (wheelNumber === 1) {
            this.round.remainingWheel1 = this.round.remainingWheel1.filter(n => !batchSet.has(n));
        } else {
            this.round.remainingWheel2 = this.round.remainingWheel2.filter(n => !batchSet.has(n));
        }
        return batch;
    },

    revealWheel1Step() {
        const count = REVEAL_PLAN[this.round.wheel1RevealIndex] || this.round.wheel1EliminationOrder.length;
        this.round.wheel1RevealIndex++;
        const batch = this.removeNumbersFromWheel(1, count);
        this.log('Wheel 1 reveal: removed ' + batch.sort((a, b) => a - b).join(', ') + '.');
        this.logLiveOdds();

        if (this.round.wheel1EliminationOrder.length === 0) {
            this.lockWheel1();
            this.state = GAME_STATES.WHEEL_2_SPINNING;
        } else {
            this.state = GAME_STATES.WHEEL_1_DECISION;
        }
        this.round.currentPhase = this.state;
        this.updateUI();
    },

    lockWheel1() {
        this.round.remainingWheel1 = [this.round.wheel1Final];
        this.log('Wheel 1 result: ' + this.round.wheel1Final + '.');
    },

    revealWheel2Step() {
        const count = REVEAL_PLAN[this.round.wheel2RevealIndex] || this.round.wheel2EliminationOrder.length;
        this.round.wheel2RevealIndex++;
        const batch = this.removeNumbersFromWheel(2, count);
        this.log('Wheel 2 reveal: removed ' + batch.sort((a, b) => a - b).join(', ') + '.');
        this.logLiveOdds();

        if (this.round.wheel2EliminationOrder.length === 0) {
            this.lockWheel2();
            this.resolveRound();
        } else {
            this.state = GAME_STATES.WHEEL_2_DECISION;
            this.round.currentPhase = this.state;
            this.updateUI();
        }
    },

    lockWheel2() {
        this.round.remainingWheel2 = [this.round.wheel2Final];
        this.round.finalScore = this.calculateFinalScore();
        this.log('Wheel 2 result: ' + this.round.wheel2Final + '. Final score: ' + this.round.finalScore + '.');
    },

    calculateFinalScore() {
        return this.round.wheel1Final + this.round.wheel2Final;
    },

    logLiveOdds() {
        const r = this.round;
        const hi = this.calculateOdds('HIGHER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        const lo = this.calculateOdds('LOWER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        this.log('Live odds: HIGHER ' + (hi === null ? '—' : 'x' + hi) + ', LOWER ' + (lo === null ? '—' : 'x' + lo) + '.');
    },

    // ---- player actions ----
    getOpenBets() {
        return this.round.bets.filter(b => b.status === 'OPEN');
    },

    getCurrentMainSide() {
        const open = this.getOpenBets();
        if (open.length > 0) return open[open.length - 1].side;
        if (this.round.bets.length > 0) return this.round.bets[this.round.bets.length - 1].side;
        return this.pendingSide;
    },

    // total potential payout of the currently open position (all open bets
    // are on the same side)
    currentOpenPayout() {
        return this.getOpenBets().reduce((sum, b) => sum + b.stake * b.lockedOdds, 0);
    },

    // cash needed to double the current potential payout, priced at the
    // current fair odds — null when boosting is impossible
    boostCost() {
        const side = this.getCurrentMainSide();
        const odds = this.calculateOdds(
            side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        if (odds === null) return null;
        const payout = this.currentOpenPayout();
        if (payout <= 0) return null;
        return this.floorTo2(payout / odds);
    },

    // info needed to switch sides keeping an equivalent potential payout:
    // we refund the fair value of the current position and buy the same
    // potential payout on the other side at its current fair odds
    swapInfo() {
        const main = this.getCurrentMainSide();
        const other = main === 'HIGHER' ? 'LOWER' : 'HIGHER';
        const r = this.round;
        const oddsOther = this.calculateOdds(other, r.threshold, r.remainingWheel1, r.remainingWheel2);
        if (oddsOther === null) return null;
        const payout = this.currentOpenPayout();
        if (payout <= 0) return null;
        const probMain = this.calculateProbability(main, r.threshold, r.remainingWheel1, r.remainingWheel2);
        const newStake = this.floorTo2(payout / oddsOther);
        const credit = this.floorTo2(payout * probMain);
        const net = this.floorTo2(newStake - credit);
        return { main: main, other: other, oddsOther: oddsOther, payout: payout, newStake: newStake, credit: credit, net: net };
    },

    hold() {
        this.log('Player used Hold.');
        return true;
    },

    boost() {
        const side = this.getCurrentMainSide();
        const odds = this.calculateOdds(
            side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        const cost = this.boostCost();
        if (odds === null || cost === null) {
            this.log('Boost unavailable: no winning pairs for ' + side + '.');
            return false;
        }
        if (cost <= 0 || this.balance < cost) {
            this.log('Boost unavailable: insufficient balance.');
            return false;
        }
        this.balance -= cost;
        this.round.bets.push({
            id: this.generateId(),
            type: 'BOOST',
            side: side,
            stake: cost,
            lockedOdds: odds,
            status: 'OPEN',
            payout: 0,
            createdAtPhase: this.round.currentPhase,
        });
        this.log('Boost x2: added €' + this.fmt(cost) + ' on ' + side +
            ' (potential payout now €' + this.fmt(this.currentOpenPayout()) + ').');
        return true;
    },

    calculateBetCashout(bet) {
        if (bet.status !== 'OPEN') return 0;
        const probability = this.calculateProbability(
            bet.side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        const fairCashout = bet.stake * bet.lockedOdds * probability;
        const cashout = Math.min(
            bet.stake * CASHOUT_PENALTY,
            fairCashout * CASHOUT_PENALTY,
        );
        return this.floorTo2(cashout);
    },

    calculateTotalCashout() {
        return this.getOpenBets().reduce((sum, bet) => sum + this.calculateBetCashout(bet), 0);
    },

    cashout() {
        const amount = this.floorTo2(this.calculateTotalCashout());
        if (amount <= 0) {
            this.log('Cashout unavailable.');
            this.updateUI();
            return;
        }
        for (const bet of this.round.bets) {
            if (bet.status === 'OPEN') {
                bet.status = 'CASHED_OUT';
                bet.payout = 0;
            }
        }
        this.balance += amount;
        this.round.result = { type: 'CASHED_OUT', amount: amount };
        this.state = GAME_STATES.CASHED_OUT;
        this.round.currentPhase = this.state;
        this.round.isResolved = true;
        this.log('Player cashed out €' + this.fmt(amount) + '.');
        this.log('Final result would have been: Wheel 1 ' + this.round.wheel1Final +
            ', Wheel 2 ' + this.round.wheel2Final +
            ', Score ' + this.calculateFinalScore() + '.');
        this.updateUI();
    },

    swap() {
        const info = this.swapInfo();
        if (!info) {
            this.log('Swap unavailable: other side has no winning pairs.');
            return false;
        }
        if (info.net > this.balance) {
            this.log('Swap unavailable: insufficient balance.');
            return false;
        }
        for (const bet of this.round.bets) {
            if (bet.status === 'OPEN') {
                bet.status = 'CASHED_OUT';
                bet.payout = 0;
            }
        }
        // refund the fair value of the old position, pay for the new one
        this.balance += info.credit;
        this.balance -= info.newStake;
        this.round.bets.push({
            id: this.generateId(),
            type: 'SWAP',
            side: info.other,
            stake: info.newStake,
            lockedOdds: info.oddsOther,
            status: 'OPEN',
            payout: 0,
            createdAtPhase: this.round.currentPhase,
        });
        const netTxt = info.net >= 0 ? 'paid €' + this.fmt(info.net) : 'received €' + this.fmt(-info.net);
        this.log('Swap to ' + info.other + ': equivalent payout €' + this.fmt(info.payout) + ' (' + netTxt + ').');
        return true;
    },

    // ---- resolution ----
    resolveBet(bet) {
        if (bet.status !== 'OPEN') return;
        const isWin =
            (bet.side === 'HIGHER' && this.round.finalScore > this.round.threshold) ||
            (bet.side === 'LOWER' && this.round.finalScore < this.round.threshold);
        if (isWin) {
            bet.status = 'WON';
            bet.payout = this.floorTo2(bet.stake * bet.lockedOdds);
            this.balance += bet.payout;
        } else {
            bet.status = 'LOST';
            bet.payout = 0;
        }
    },

    resolveRound() {
        for (const bet of this.round.bets) {
            this.resolveBet(bet);
        }
        this.round.isResolved = true;
        this.state = GAME_STATES.RESOLVED;
        this.round.currentPhase = this.state;

        const fs = this.round.finalScore;
        const th = this.round.threshold;
        let winningSide;
        if (fs > th) winningSide = 'HIGHER';
        else if (fs < th) winningSide = 'LOWER';
        else winningSide = 'CENTER';

        this.round.result = { type: 'RESOLVED', winningSide: winningSide };

        if (winningSide === 'CENTER') {
            this.log('Final score = ' + fs + ' = threshold. CENTER: both sides lose.');
        } else {
            this.log(winningSide + ' wins.');
        }
        this.updateUI();
    },

    // ---- logging ----
    fmt(value) {
        return value.toFixed(2);
    },

    log(message) {
        this.logEntries.push(message);
    },

    // ---- UI ----
    statusLabel() {
        switch (this.state) {
            case GAME_STATES.BETTING: return 'BETTING';
            case GAME_STATES.WHEEL_1_SPINNING:
            case GAME_STATES.WHEEL_1_DECISION: return 'WHEEL 1 SPINNING';
            case GAME_STATES.WHEEL_2_SPINNING:
            case GAME_STATES.WHEEL_2_DECISION: return 'WHEEL 2 SPINNING';
            case GAME_STATES.RESOLVED: return 'RESOLVED';
            case GAME_STATES.CASHED_OUT: return 'CASHED OUT';
            default: return this.state;
        }
    },

    isDecisionPhase() {
        return this.state === GAME_STATES.WHEEL_1_SPINNING ||
            this.state === GAME_STATES.WHEEL_1_DECISION ||
            this.state === GAME_STATES.WHEEL_2_SPINNING ||
            this.state === GAME_STATES.WHEEL_2_DECISION;
    },

    wheel1Locked() {
        return this.state === GAME_STATES.WHEEL_2_SPINNING ||
            this.state === GAME_STATES.WHEEL_2_DECISION ||
            this.state === GAME_STATES.RESOLVED ||
            this.state === GAME_STATES.CASHED_OUT;
    },

    // class for a single number cell — colored green/red by how good this
    // number is for the player's chosen side, given the other wheel's
    // remaining numbers (so the player can read their odds at a glance)
    numClass(wheelNumber, n) {
        const r = this.round;
        const remaining = wheelNumber === 1 ? r.remainingWheel1 : r.remainingWheel2;
        const isRemaining = remaining.indexOf(n) !== -1;
        const isFinalLocked =
            (wheelNumber === 1 && this.wheel1Locked() && n === r.wheel1Final) ||
            (wheelNumber === 2 && (this.state === GAME_STATES.RESOLVED || this.state === GAME_STATES.CASHED_OUT) && n === r.wheel2Final);

        if (!isRemaining) return 'crash-num eliminated';

        let cls = 'crash-num';
        const side = this.getCurrentMainSide();
        const other = wheelNumber === 1 ? r.remainingWheel2 : r.remainingWheel1;
        if (other.length > 0) {
            // chance the player wins if this wheel lands on n
            let win = 0;
            for (const m of other) {
                const score = n + m;
                if (side === 'HIGHER' && score > r.threshold) win++;
                else if (side === 'LOWER' && score < r.threshold) win++;
            }
            const p = win / other.length;
            if (p > 0.5) cls += ' good';
            else if (p < 0.5) cls += ' bad';
            else cls += ' even';
        }
        if (isFinalLocked) cls += ' final';
        return cls;
    },

    renderWheel(wheelNumber) {
        let cells = '';
        for (const n of ROULETTE_NUMBERS) {
            cells += '<span class="' + this.numClass(wheelNumber, n) + '">' + n + '</span>';
        }
        return cells;
    },

    sidePanel(side) {
        const r = this.round;
        const possible = this.countPossiblePairs(r.remainingWheel1, r.remainingWheel2);
        const winning = this.countWinningPairs(side, r.threshold, r.remainingWheel1, r.remainingWheel2);
        const prob = possible === 0 ? 0 : winning / possible;
        const odds = this.calculateOdds(side, r.threshold, r.remainingWheel1, r.remainingWheel2);
        return '<div class="crash-side ' + side.toLowerCase() + '">' +
            '<div class="crash-side-name">' + side + '</div>' +
            '<div class="crash-side-stat">' + winning + ' / ' + possible + '</div>' +
            '<div class="crash-side-stat">' + (prob * 100).toFixed(2) + '%</div>' +
            '<div class="crash-side-odds">' + (odds === null ? '—' : 'x' + odds) + '</div>' +
            '</div>';
    },

    render() {
        const r = this.round;
        const possible = this.countPossiblePairs(r.remainingWheel1, r.remainingWheel2);
        const equal = this.countEqualPairs(r.threshold, r.remainingWheel1, r.remainingWheel2);
        const equalProb = possible === 0 ? 0 : equal / possible;

        let html = '';

        // top panel
        html += '<div class="crash-top">' +
            '<div class="crash-title">🎡 Crash Roulette: Double Wheel</div>' +
            '<div class="crash-topline">' +
                '<span>Balance: <b>€' + this.fmt(this.balance) + '</b></span>' +
                '<span>Status: <b>' + this.statusLabel() + '</b></span>' +
            '</div>' +
            '<div class="crash-threshold">Threshold <span>' + r.threshold + '</span></div>' +
            '<button id="crash-rules" class="crash-rules-btn">📖 Rules</button>' +
            '</div>';

        // betting panel
        if (this.state === GAME_STATES.BETTING) {
            const hiOdds = this.calculateOdds('HIGHER', r.threshold, r.remainingWheel1, r.remainingWheel2);
            const loOdds = this.calculateOdds('LOWER', r.threshold, r.remainingWheel1, r.remainingWheel2);
            html += '<div class="crash-panel crash-betting">' +
                '<div class="crash-tagline">Two wheels. One final score. Bet Higher or Lower.</div>' +
                '<label class="crash-bet-row">Bet Amount €' +
                    '<input id="crash-stake" type="number" min="' + MIN_BET + '" max="' + MAX_BET + '" step="0.1" value="' + this.pendingStake + '">' +
                '</label>' +
                '<div class="crash-side-buttons">' +
                    '<button class="crash-side-btn higher' + (this.pendingSide === 'HIGHER' ? ' active' : '') + '" data-side="HIGHER">' +
                        'Higher<br><small>x' + (hiOdds === null ? '—' : hiOdds) + '</small></button>' +
                    '<button class="crash-side-btn lower' + (this.pendingSide === 'LOWER' ? ' active' : '') + '" data-side="LOWER">' +
                        'Lower<br><small>x' + (loOdds === null ? '—' : loOdds) + '</small></button>' +
                '</div>' +
                '<button id="crash-start" class="crash-action-btn primary">Start Round</button>' +
                '</div>';
        }

        // actions panel — kept above the wheels so it is visible without
        // scrolling; each of the four buttons advances the spin
        if (this.isDecisionPhase()) {
            const totalCashout = this.floorTo2(this.calculateTotalCashout());
            const boostCost = this.boostCost();
            const swapInfo = this.swapInfo();

            const boostDis = (boostCost === null || boostCost <= 0 || this.balance < boostCost) ? ' disabled' : '';
            const swapDis = (!swapInfo || swapInfo.net > this.balance) ? ' disabled' : '';
            const cashDis = totalCashout <= 0 ? ' disabled' : '';

            const boostLabel = boostCost === null ? 'x2' : 'x2 &middot; €' + this.fmt(boostCost);
            let swapLabel = 'Swap';
            if (swapInfo) {
                swapLabel = swapInfo.net >= 0
                    ? 'Swap &middot; €' + this.fmt(swapInfo.net)
                    : 'Swap &middot; +€' + this.fmt(-swapInfo.net);
            }

            html += '<div class="crash-panel crash-actions">' +
                '<button id="crash-hold" class="crash-action-btn">Hold</button>' +
                '<button id="crash-boost" class="crash-action-btn"' + boostDis + '>' + boostLabel + '</button>' +
                '<button id="crash-swap" class="crash-action-btn"' + swapDis + '>' + swapLabel + '</button>' +
                '<button id="crash-cashout" class="crash-action-btn"' + cashDis + '>Cashout €' + this.fmt(totalCashout) + '</button>' +
                '</div>';
        }

        // wheels — only the active wheel is shown at a time
        const finished = this.state === GAME_STATES.RESOLVED || this.state === GAME_STATES.CASHED_OUT;
        let wheelsHtml = '';
        if (this.wheel1Locked()) {
            // wheel 1 done: show its result compactly, focus on wheel 2
            wheelsHtml += '<div class="crash-wheel-badge">Wheel 1: <b>' + r.wheel1Final + '</b></div>';
            wheelsHtml += '<div class="crash-wheel"><div class="crash-wheel-label">Wheel 2' +
                (finished ? ' — <b>' + r.wheel2Final + '</b>' : '') + '</div>' +
                '<div class="crash-wheel-grid">' + this.renderWheel(2) + '</div></div>';
        } else {
            wheelsHtml += '<div class="crash-wheel"><div class="crash-wheel-label">Wheel 1</div>' +
                '<div class="crash-wheel-grid">' + this.renderWheel(1) + '</div></div>';
        }
        html += '<div class="crash-wheels">' + wheelsHtml + '</div>';

        // live probability panel
        html += '<div class="crash-panel crash-prob">' +
            '<div class="crash-prob-head">Possible pairs: <b>' + possible + '</b></div>' +
            '<div class="crash-sides">' +
                this.sidePanel('HIGHER') + this.sidePanel('LOWER') +
                '<div class="crash-side center">' +
                    '<div class="crash-side-name">CENTER</div>' +
                    '<div class="crash-side-stat">' + equal + ' / ' + possible + '</div>' +
                    '<div class="crash-side-stat">' + (equalProb * 100).toFixed(2) + '%</div>' +
                    '<div class="crash-side-odds">lose</div>' +
                '</div>' +
            '</div>' +
            '</div>';

        // bets panel
        if (r.bets.length > 0) {
            let betsHtml = '';
            r.bets.forEach((bet, i) => {
                const cashoutTxt = bet.status === 'OPEN'
                    ? ' · Cashout €' + this.fmt(this.calculateBetCashout(bet))
                    : '';
                const statusTxt = bet.status === 'OPEN' ? '' : ' · ' + bet.status +
                    (bet.status === 'WON' ? ' €' + this.fmt(bet.payout) : '');
                betsHtml += '<div class="crash-bet ' + bet.status.toLowerCase() + '">' +
                    '#' + (i + 1) + ' ' + bet.type + ' · ' + bet.side +
                    ' · €' + this.fmt(bet.stake) + ' @ x' + bet.lockedOdds +
                    cashoutTxt + statusTxt + '</div>';
            });
            html += '<div class="crash-panel crash-bets"><div class="crash-panel-title">Your Bets</div>' + betsHtml + '</div>';
        }

        // result panel
        if (this.state === GAME_STATES.RESOLVED || this.state === GAME_STATES.CASHED_OUT) {
            html += this.renderResult();
            html += '<button id="crash-newround" class="crash-action-btn primary crash-newround">New Round</button>';
        }

        // log
        let logHtml = '';
        for (const entry of this.logEntries) {
            logHtml += '<div class="crash-log-entry">' + entry + '</div>';
        }
        html += '<div class="crash-panel crash-log"><div class="crash-panel-title">Round Log</div>' +
            '<div id="crash-log-scroll" class="crash-log-scroll">' + logHtml + '</div></div>';

        // debug
        html += '<div class="crash-panel crash-debug-wrap">' +
            '<button id="crash-debug-toggle" class="crash-debug-toggle">' +
                (this.showDebug ? '▼' : '▶') + ' Debug</button>' +
            (this.showDebug ? this.renderDebug() : '') +
            '</div>';

        // rules overlay
        if (this.showRules) html += this.renderRules();

        return html;
    },

    renderRules() {
        return '<div class="crash-rules-overlay">' +
            '<div class="crash-rules-card">' +
                '<div class="crash-rules-title">How to play</div>' +
                '<p><b>Goal.</b> Bet whether the final score will be <b>Higher</b> or ' +
                    '<b>Lower</b> than a random <b>threshold</b> (21–51).</p>' +
                '<p><b>Two wheels.</b> Two independent roulette wheels (0–36) spin. The ' +
                    'final score is their sum: <i>Wheel 1 + Wheel 2</i> (0–72). ' +
                    'Adding two wheels pulls results toward the middle (~36), so extremes are ' +
                    'rare and the outcome stays tense to the very end.</p>' +
                '<p><b>Win conditions.</b> Higher wins if the final score is above the ' +
                    'threshold; Lower wins if it is below. If it lands <b>exactly</b> on the ' +
                    'threshold it is <b>Center</b> — both sides lose (like zero in roulette).</p>' +
                '<p><b>The reveal.</b> Each wheel narrows down over <b>5 steps</b>: numbers ' +
                    'that can no longer come up are burned away until only the result remains. ' +
                    'Wheel 1 settles first, then Wheel 2. You watch your odds shift live.</p>' +
                '<p><b>Your moves</b> between steps:</p>' +
                '<ul>' +
                    '<li><b>Hold</b> — keep your position and reveal the next step.</li>' +
                    '<li><b>x2</b> — double your potential payout. The button shows the cash it ' +
                        'costs at the current fair price.</li>' +
                    '<li><b>Swap</b> — flip to the other side, keeping an equivalent potential ' +
                        'payout. The button shows the net cash to switch.</li>' +
                    '<li><b>Cashout</b> — take your position\'s current value (with a small ' +
                        'penalty) and end the round early.</li>' +
                '</ul>' +
                '<p><b>Fairness.</b> Every price is recalculated live from the remaining ' +
                    'numbers at a <b>98% RTP</b>, so boosting or swapping is always priced ' +
                    'fairly — no exploit, math always under control.</p>' +
                '<button id="crash-rules-close" class="crash-action-btn primary">Got it</button>' +
            '</div>' +
            '</div>';
    },

    renderResult() {
        const r = this.round;
        const fs = r.finalScore !== null ? r.finalScore : this.calculateFinalScore();
        const resolved = r.bets.filter(b => b.status === 'WON' || b.status === 'LOST');
        const totalPayout = resolved.reduce((s, b) => s + b.payout, 0);

        let body = '<div class="crash-result-row">Threshold: <b>' + r.threshold + '</b></div>' +
            '<div class="crash-result-row">Wheel 1: <b>' + r.wheel1Final + '</b></div>' +
            '<div class="crash-result-row">Wheel 2: <b>' + r.wheel2Final + '</b></div>' +
            '<div class="crash-result-row">Final Score: <b>' + fs + '</b></div>';

        if (this.state === GAME_STATES.CASHED_OUT) {
            const amount = r.result ? r.result.amount : 0;
            body = '<div class="crash-result-title">CASHED OUT</div>' + body +
                '<div class="crash-result-row">You took: <b>€' + this.fmt(amount) + '</b></div>';
            return '<div class="crash-panel crash-result cashed">' + body + '</div>';
        }

        const winningSide = r.result ? r.result.winningSide : 'CENTER';
        if (winningSide === 'CENTER') {
            body += '<div class="crash-result-row">Result: <b>CENTER</b></div>' +
                '<div class="crash-result-row">Both Higher and Lower lose.</div>';
        } else {
            body += '<div class="crash-result-row">Winning side: <b>' + winningSide + '</b></div>';
        }
        // net is the real round P&L: balance change since the round started
        const net = this.floorTo2(this.balance - r.startBalance);
        const netStr = (net >= 0 ? '+' : '-') + '€' + this.fmt(Math.abs(net));
        body += '<div class="crash-result-row">Total payout: €' + this.fmt(totalPayout) + '</div>' +
            '<div class="crash-result-row crash-net ' + (net >= 0 ? 'win' : 'loss') + '">Net result: ' + netStr + '</div>';

        const cls = net > 0 ? 'win' : (net < 0 ? 'loss' : 'even');
        return '<div class="crash-panel crash-result ' + cls + '"><div class="crash-result-title">Round Result</div>' + body + '</div>';
    },

    renderDebug() {
        const r = this.round;
        const possible = this.countPossiblePairs(r.remainingWheel1, r.remainingWheel2);
        const hiWin = this.countWinningPairs('HIGHER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        const loWin = this.countWinningPairs('LOWER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        const equal = this.countEqualPairs(r.threshold, r.remainingWheel1, r.remainingWheel2);
        const hiOdds = this.calculateOdds('HIGHER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        const loOdds = this.calculateOdds('LOWER', r.threshold, r.remainingWheel1, r.remainingWheel2);
        const hiRtp = (hiOdds === null || possible === 0) ? 0 : hiOdds * hiWin / possible;
        const loRtp = (loOdds === null || possible === 0) ? 0 : loOdds * loWin / possible;

        const lines = [
            'wheel1Final: ' + r.wheel1Final,
            'wheel2Final: ' + r.wheel2Final,
            'finalScore: ' + (r.finalScore !== null ? r.finalScore : this.calculateFinalScore()),
            'threshold: ' + r.threshold,
            'remainingWheel1: ' + r.remainingWheel1.length,
            'remainingWheel2: ' + r.remainingWheel2.length,
            'possiblePairs: ' + possible,
            'higherWinningPairs: ' + hiWin,
            'lowerWinningPairs: ' + loWin,
            'equalPairs: ' + equal,
            'higherRTPCheck: ' + hiRtp.toFixed(4),
            'lowerRTPCheck: ' + loRtp.toFixed(4),
        ];
        return '<div class="crash-debug">' + lines.map(l => '<div>' + l + '</div>').join('') + '</div>';
    },

    updateUI() {
        const container = document.getElementById('dice-container');
        container.innerHTML = this.render();
        this.bindEvents();
        const logScroll = document.getElementById('crash-log-scroll');
        if (logScroll) logScroll.scrollTop = logScroll.scrollHeight;
    },

    bindEvents() {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        // betting
        const stakeInput = document.getElementById('crash-stake');
        if (stakeInput) {
            stakeInput.addEventListener('input', () => {
                const v = parseFloat(stakeInput.value);
                if (Number.isFinite(v)) this.pendingStake = v;
            });
        }
        document.querySelectorAll('.crash-side-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.pendingSide = btn.dataset.side;
                this.updateUI();
            });
        });
        bind('crash-start', () => {
            const input = document.getElementById('crash-stake');
            const stake = input ? parseFloat(input.value) : this.pendingStake;
            this.pendingStake = Number.isFinite(stake) ? stake : this.pendingStake;
            this.startBet(this.pendingSide, this.pendingStake);
        });

        // actions — Hold / Boost / Swap perform their action and advance the
        // spin; Cashout ends the round
        bind('crash-hold', () => { this.hold(); this.nextReveal(); });
        bind('crash-boost', () => { if (this.boost()) this.nextReveal(); else this.updateUI(); });
        bind('crash-swap', () => { if (this.swap()) this.nextReveal(); else this.updateUI(); });
        bind('crash-cashout', () => this.cashout());
        bind('crash-newround', () => this.startNewRound());

        // debug
        bind('crash-debug-toggle', () => {
            this.showDebug = !this.showDebug;
            this.updateUI();
        });

        // rules
        bind('crash-rules', () => { this.showRules = true; this.updateUI(); });
        bind('crash-rules-close', () => { this.showRules = false; this.updateUI(); });
    },
};
