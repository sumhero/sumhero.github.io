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
    // Cent rounding always favours the house: amounts the player RECEIVES
    // (payouts, cashout, refunds) round down; amounts the player PAYS
    // (boost cost, flip stake) round up. Matters most at small stakes.
    floorTo2(value) {
        return Math.floor(value * 100) / 100;
    },

    ceilTo2(value) {
        return Math.ceil(value * 100) / 100;
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
            chanceHistory: [],
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
        this.recordChance('Start');
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
            this.recordChance('W1 Final');
        } else {
            this.state = GAME_STATES.WHEEL_1_DECISION;
            this.recordChance('W1 R' + this.round.wheel1RevealIndex);
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
            this.recordChance('W2 Final');
            this.resolveRound();
        } else {
            this.state = GAME_STATES.WHEEL_2_DECISION;
            this.recordChance('W2 R' + this.round.wheel2RevealIndex);
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

    // record the current side's win probability for the chance-history tracker
    recordChance(label) {
        const r = this.round;
        const side = this.getCurrentMainSide();
        const probability = this.calculateProbability(side, r.threshold, r.remainingWheel1, r.remainingWheel2);
        r.chanceHistory.push({ side: side, probability: probability, label: label });
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
    // current fair odds — null when boosting is impossible. Player pays this,
    // so it rounds up (house-favourable).
    boostCost() {
        const side = this.getCurrentMainSide();
        const odds = this.calculateOdds(
            side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        if (odds === null) return null;
        const payout = this.currentOpenPayout();
        if (payout <= 0) return null;
        return this.ceilTo2(payout / odds);
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
        // player pays the new stake (round up), receives the credit (round down)
        const newStake = this.ceilTo2(payout / oddsOther);
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
        const addedWin = this.floorTo2(cost * odds);
        this.log('Boost: spent €' + this.fmt(cost) + ' on ' + side +
            ' for +€' + this.fmt(addedWin) + ' possible win (potential payout now €' +
            this.fmt(this.currentOpenPayout()) + ').');
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

    // fair value of a position before the cashout penalty/cap
    positionValue(bet) {
        if (bet.status !== 'OPEN') return 0;
        const probability = this.calculateProbability(
            bet.side, this.round.threshold,
            this.round.remainingWheel1, this.round.remainingWheel2,
        );
        return bet.stake * bet.lockedOdds * probability;
    },

    totalPositionValue() {
        return this.getOpenBets().reduce((sum, bet) => sum + this.positionValue(bet), 0);
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

    // Flip: sell the current position and buy the opposite side at the
    // current live price (keeping an equivalent potential payout)
    swap() {
        const info = this.swapInfo();
        if (!info) {
            this.log('Flip unavailable: other side has no winning pairs.');
            return false;
        }
        if (info.net > this.balance) {
            this.log('Flip unavailable: insufficient balance.');
            return false;
        }
        for (const bet of this.round.bets) {
            if (bet.status === 'OPEN') {
                bet.status = 'CASHED_OUT';
                bet.payout = 0;
            }
        }
        // sell the old position at its fair value, buy the new one
        this.balance += info.credit;
        this.balance -= info.newStake;
        this.round.bets.push({
            id: this.generateId(),
            type: 'FLIP',
            side: info.other,
            stake: info.newStake,
            lockedOdds: info.oddsOther,
            status: 'OPEN',
            payout: 0,
            createdAtPhase: this.round.currentPhase,
        });
        this.log('Sold ' + info.main + ' position: +€' + this.fmt(info.credit) + '.');
        this.log('Bought ' + info.other + ' position: -€' + this.fmt(info.newStake) + '.');
        this.log(info.net >= 0
            ? 'Flip cost: €' + this.fmt(info.net) + '.'
            : 'Flip refund: +€' + this.fmt(-info.net) + '.');
        this.recordChance('Flip to ' + info.other);
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

    // prominent banner showing the player's side and win condition relative
    // to the threshold (uses the pending side before a bet is placed)
    renderYourBet() {
        const r = this.round;
        const side = this.getCurrentMainSide();
        const isBetting = this.state === GAME_STATES.BETTING;
        const verb = isBetting ? 'Betting' : 'Your bet';
        if (side === 'HIGHER') {
            return '<div class="crash-yourbet higher">' + verb +
                ': ▲ HIGHER — win if score &gt; ' + r.threshold + '</div>';
        }
        return '<div class="crash-yourbet lower">' + verb +
            ': ▼ LOWER — win if score &lt; ' + r.threshold + '</div>';
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
            this.renderYourBet() +
            '<button id="crash-rules" class="crash-rules-btn">📖 Rules</button>' +
            '</div>';

        // betting panel
        if (this.state === GAME_STATES.BETTING) {
            const hiOdds = this.calculateOdds('HIGHER', r.threshold, r.remainingWheel1, r.remainingWheel2);
            const loOdds = this.calculateOdds('LOWER', r.threshold, r.remainingWheel1, r.remainingWheel2);
            html += '<div class="crash-panel crash-betting">' +
                '<div class="crash-tagline">Two wheels. One target. Watch your position change.</div>' +
                '<label class="crash-bet-row">Bet Amount €' +
                    '<input id="crash-stake" type="number" min="' + MIN_BET + '" max="' + MAX_BET + '" step="0.1" value="' + this.pendingStake + '">' +
                '</label>' +
                '<div class="crash-side-buttons">' +
                    '<button class="crash-side-btn higher' + (this.pendingSide === 'HIGHER' ? ' active' : '') + '" data-side="HIGHER">' +
                        'Higher<br><small>&gt; ' + r.threshold + ' · x' + (hiOdds === null ? '—' : hiOdds) + '</small></button>' +
                    '<button class="crash-side-btn lower' + (this.pendingSide === 'LOWER' ? ' active' : '') + '" data-side="LOWER">' +
                        'Lower<br><small>&lt; ' + r.threshold + ' · x' + (loOdds === null ? '—' : loOdds) + '</small></button>' +
                '</div>' +
                '<button id="crash-start" class="crash-action-btn primary">Start Round</button>' +
                '</div>';
        }

        // actions panel — kept above the wheels so it is visible without
        // scrolling; each of the four buttons advances the spin
        if (this.isDecisionPhase()) {
            const totalCashout = this.floorTo2(this.calculateTotalCashout());
            const boostCost = this.boostCost();
            const addedWin = this.floorTo2(this.currentOpenPayout());
            const swapInfo = this.swapInfo();

            const boostDis = (boostCost === null || boostCost <= 0 || this.balance < boostCost) ? ' disabled' : '';
            const swapDis = (!swapInfo || swapInfo.net > this.balance) ? ' disabled' : '';
            const cashDis = totalCashout <= 0 ? ' disabled' : '';

            const boostLabel = boostCost === null
                ? 'Boost'
                : 'Boost<br><small>+€' + this.fmt(addedWin) + ' win · €' + this.fmt(boostCost) + '</small>';
            let flipLabel = 'Flip';
            if (swapInfo) {
                const flipTo = 'Flip to ' + swapInfo.other;
                flipLabel = swapInfo.net >= 0
                    ? flipTo + '<br><small>Cost €' + this.fmt(swapInfo.net) + '</small>'
                    : flipTo + '<br><small>Refund €' + this.fmt(-swapInfo.net) + '</small>';
            }

            html += '<div class="crash-panel crash-actions">' +
                '<button id="crash-hold" class="crash-action-btn">Hold</button>' +
                '<button id="crash-boost" class="crash-action-btn"' + boostDis + '>' + boostLabel + '</button>' +
                '<button id="crash-flip" class="crash-action-btn"' + swapDis + '>' + flipLabel + '</button>' +
                '<button id="crash-cashout" class="crash-action-btn"' + cashDis + '>Cashout<br><small>€' + this.fmt(totalCashout) + '</small></button>' +
                '</div>';
        }

        const finished = this.state === GAME_STATES.RESOLVED || this.state === GAME_STATES.CASHED_OUT;

        // result panel + New Round, kept above the wheel so they are visible
        // on the first screen once the round ends
        if (finished) {
            html += this.renderResult();
            html += '<button id="crash-newround" class="crash-action-btn primary crash-newround">New Round</button>';
        }

        // wheel area — only the active wheel is shown at a time; once the
        // round is finished, show just each wheel's result and their sum
        if (finished) {
            html += '<div class="crash-final">' +
                '<div class="crash-final-item"><span class="crash-final-label">Wheel 1</span>' +
                    '<span class="crash-final-num">' + r.wheel1Final + '</span></div>' +
                '<div class="crash-final-op">+</div>' +
                '<div class="crash-final-item"><span class="crash-final-label">Wheel 2</span>' +
                    '<span class="crash-final-num">' + r.wheel2Final + '</span></div>' +
                '<div class="crash-final-op">=</div>' +
                '<div class="crash-final-item"><span class="crash-final-label">Final</span>' +
                    '<span class="crash-final-num sum">' + this.calculateFinalScore() + '</span></div>' +
                '</div>';
        } else {
            let wheelsHtml = '';
            if (this.wheel1Locked()) {
                // wheel 1 done: show its result compactly, focus on wheel 2
                wheelsHtml += '<div class="crash-wheel-badge">Wheel 1: <b>' + r.wheel1Final + '</b></div>';
                wheelsHtml += '<div class="crash-wheel"><div class="crash-wheel-label">Wheel 2</div>' +
                    '<div class="crash-wheel-grid">' + this.renderWheel(2) + '</div></div>';
            } else {
                wheelsHtml += '<div class="crash-wheel"><div class="crash-wheel-label">Wheel 1</div>' +
                    '<div class="crash-wheel-grid">' + this.renderWheel(1) + '</div></div>';
            }
            html += '<div class="crash-wheels">' + wheelsHtml + '</div>';
        }

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

        // your position panel — shows fair Position Value alongside Cashout Now
        if (r.bets.length > 0) {
            const openBets = this.getOpenBets();
            let posHtml = '';
            if (openBets.length > 0) {
                const side = this.getCurrentMainSide();
                const totalStake = openBets.reduce((s, b) => s + b.stake, 0);
                const potential = this.currentOpenPayout();
                const posValue = this.totalPositionValue();
                const cashNow = this.calculateTotalCashout();
                posHtml +=
                    '<div class="crash-pos-row">Side: <b>' + side + '</b></div>' +
                    '<div class="crash-pos-row">Total Stake: <b>€' + this.fmt(totalStake) + '</b></div>' +
                    '<div class="crash-pos-row">Potential Payout: <b>€' + this.fmt(potential) + '</b></div>' +
                    '<div class="crash-pos-row">Position Value: <b>€' + this.fmt(posValue) + '</b></div>' +
                    '<div class="crash-pos-row cashnow">Cashout Now: <b>€' + this.fmt(cashNow) + '</b></div>';
            }
            let betsHtml = '';
            r.bets.forEach((bet, i) => {
                const statusTxt = bet.status === 'OPEN' ? 'open' : bet.status.toLowerCase() +
                    (bet.status === 'WON' ? ' €' + this.fmt(bet.payout) : '');
                betsHtml += '<div class="crash-bet ' + bet.status.toLowerCase() + '">' +
                    '#' + (i + 1) + ' ' + bet.type + ' · ' + bet.side +
                    ' · €' + this.fmt(bet.stake) + ' @ x' + bet.lockedOdds + ' · ' + statusTxt + '</div>';
            });
            html += '<div class="crash-panel crash-bets"><div class="crash-panel-title">Your Position</div>' +
                posHtml + betsHtml + '</div>';
        }

        // chance history tracker
        if (r.chanceHistory.length > 0) html += this.renderChanceHistory();

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
                '<p class="crash-rules-tag">Two wheels. One target. Watch your position change. ' +
                    'Boost, flip, or cash out before the final number lands.</p>' +
                '<p>Two wheels spin. The final score is <b>Wheel 1 + Wheel 2</b> (0–72). ' +
                    'Bet whether the final score will be <b>Higher</b> or <b>Lower</b> than the ' +
                    'target. As numbers disappear, your chance changes. You can Hold, Boost, ' +
                    'Flip, or Cashout before the final result.</p>' +
                '<p><b>Center.</b> If the final score equals the target, both Higher and Lower ' +
                    'lose — this is called <b>Center</b>. Center is a losing outcome for both ' +
                    'sides, similar to zero in roulette. It is included in the odds calculation, ' +
                    'while the target RTP is controlled by dynamic pricing.</p>' +
                '<p><b>The reveal.</b> Each wheel narrows down over <b>5 steps</b>: numbers that ' +
                    'can no longer come up are burned away until only the result remains. ' +
                    'Wheel 1 settles first, then Wheel 2.</p>' +
                '<p><b>Your moves</b> between steps:</p>' +
                '<ul>' +
                    '<li><b>Hold</b> — keep your position and reveal the next step.</li>' +
                    '<li><b>Boost</b> — increases your possible win at the current live price. ' +
                        'The Boost cost changes as numbers disappear and probabilities change. ' +
                        'Boost never reuses your original odds — it is always priced using the ' +
                        'current live position.</li>' +
                    '<li><b>Flip</b> — sells your current position and buys the opposite side at ' +
                        'the current live price. Depending on the live prices, flipping may cost ' +
                        'extra or return part of the position value.</li>' +
                    '<li><b>Cashout</b> — take your position\'s current value (with a small ' +
                        'penalty) and end the round early.</li>' +
                '</ul>' +
                '<p><b>Position Value vs Cashout.</b> Position Value is the current fair value ' +
                    'of your open position; Cashout Now is what you actually receive after the ' +
                    'penalty.</p>' +
                '<p><b>Fairness.</b> Every price is recalculated live from the remaining numbers ' +
                    'at a <b>98% RTP</b>, so Boost and Flip are always priced fairly — no ' +
                    'exploit, math always under control.</p>' +
                '<button id="crash-rules-close" class="crash-action-btn primary">Got it</button>' +
            '</div>' +
            '</div>';
    },

    renderResult() {
        const r = this.round;
        const resolved = r.bets.filter(b => b.status === 'WON' || b.status === 'LOST');
        const totalPayout = resolved.reduce((s, b) => s + b.payout, 0);

        // wheel results and their sum are shown by the dedicated display; the
        // result panel focuses on threshold and the money outcome
        let body = '<div class="crash-result-row">Threshold: <b>' + r.threshold + '</b></div>';

        if (this.state === GAME_STATES.CASHED_OUT) {
            const amount = r.result ? r.result.amount : 0;
            body = '<div class="crash-result-title">CASHED OUT</div>' + body +
                '<div class="crash-result-row">You took: <b>€' + this.fmt(amount) + '</b></div>';
            return '<div class="crash-panel crash-result cashed">' + body + '</div>';
        }

        const winningSide = r.result ? r.result.winningSide : 'CENTER';
        if (winningSide === 'CENTER') {
            body += '<div class="crash-result-row">Result: <b>CENTER</b></div>' +
                '<div class="crash-result-row">Both Higher and Lower lose.</div>' +
                '<div class="crash-result-row">Center is included in the odds calculation.</div>';
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

    // small tracker of how the selected side's win chance changed this round
    renderChanceHistory() {
        const h = this.round.chanceHistory;
        let items = '';
        h.forEach((entry, i) => {
            let trend = 'neutral';
            let arrow = '';
            if (i > 0) {
                const prev = h[i - 1];
                if (entry.side !== prev.side) {
                    trend = 'flip';
                    arrow = '⇄';
                } else if (entry.probability > prev.probability + 1e-9) {
                    trend = 'up';
                    arrow = '▲';
                } else if (entry.probability < prev.probability - 1e-9) {
                    trend = 'down';
                    arrow = '▼';
                }
            }
            const pct = (entry.probability * 100).toFixed(1) + '%';
            items += '<span class="crash-chance ' + trend + '">' +
                '<span class="crash-chance-label">' + entry.label + '</span>' +
                '<span class="crash-chance-pct">' + (arrow ? arrow + ' ' : '') + pct + '</span></span>';
        });
        return '<div class="crash-panel crash-chance-wrap">' +
            '<div class="crash-panel-title">Chance History</div>' +
            '<div class="crash-chance-row">' + items + '</div></div>';
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

        // actions — Hold / Boost / Flip perform their action and advance the
        // spin; Cashout ends the round
        bind('crash-hold', () => { this.hold(); this.nextReveal(); });
        bind('crash-boost', () => { if (this.boost()) this.nextReveal(); else this.updateUI(); });
        bind('crash-flip', () => { if (this.swap()) this.nextReveal(); else this.updateUI(); });
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
