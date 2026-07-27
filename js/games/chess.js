import { drawDistinct, DRAW_TRIES } from '../engine/unique.js';

export const CHESS_SIZE = 3;

export const CHESS_PIECES = {
  king: '♚',
  rook: '♜',
  bishop: '♝',
  queen: '♛',
  knight: '♞',
};

export const CHESS_PIECE_KEYS = ['king', 'rook', 'bishop', 'queen', 'knight'];

export const ChessMoves = {
  inBounds(r, c) {
    return r >= 0 && r < CHESS_SIZE && c >= 0 && c < CHESS_SIZE;
  },

  // Legal target squares for a piece alone on the board (no blockers).
  targets(piece, r0, c0) {
    const out = [];
    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        if (r === r0 && c === c0) continue;
        if (this.canMove(piece, r0, c0, r, c)) out.push({ r: r, c: c });
      }
    }
    return out;
  },

  canMove(piece, r0, c0, r, c) {
    const dr = r - r0;
    const dc = c - c0;
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);

    switch (piece) {
      case 'king':
        return Math.max(adr, adc) === 1;
      case 'rook':
        return dr === 0 || dc === 0;
      case 'bishop':
        return adr === adc;
      case 'queen':
        return dr === 0 || dc === 0 || adr === adc;
      case 'knight':
        return (adr === 1 && adc === 2) || (adr === 2 && adc === 1);
      default:
        return false;
    }
  },
};

export const ChessGame = {
  id: 'chess',
  nameKey: 'chess',
  emoji: '♟️',
  domain: 'logique',
  rounds: { easy: 5, normal: 10, hard: 20 },
  layoutClass: 'chess-game-layout',
  correctClass: 'chess-correct',

  isCorrect(value, exercise) {
    return exercise.targets.includes(value);
  },

  // Two different rejections, kept apart on purpose. A knight on the centre
  // square of a 3x3 board has zero legal targets — an unanswerable board, so
  // that rejection is a *validity* rule and stays inside the draw, bounded by
  // its own guard. Whether a board has been seen before is an *identity*
  // question and belongs to drawDistinct. Folding validity into keyOf would
  // make an unanswerable board reachable.
  generate(difficulty, ctx) {
    const { rng, count } = ctx;

    return drawDistinct(count, () => {
      let piece, row, col, targets;
      let guard = 0;
      do {
        guard++;
        piece = CHESS_PIECE_KEYS[Math.floor(rng() * CHESS_PIECE_KEYS.length)];
        row = Math.floor(rng() * CHESS_SIZE);
        col = Math.floor(rng() * CHESS_SIZE);
        targets = ChessMoves.targets(piece, row, col);
      } while (targets.length === 0 && guard < DRAW_TRIES);

      return {
        piece,
        row,
        col,
        targets: targets.map(t => t.r + ',' + t.c),
        caption: ctx.t('chessPrompt'),
      };
    }, exercise => exercise.piece + exercise.row + exercise.col);
  },

  renderPrompt(el, exercise, submit) {
    let cells = '';
    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const dark = (r + c) % 2 === 1;
        const isPiece = r === exercise.row && c === exercise.col;
        cells += '<button class="chess-cell ' + (dark ? 'chess-dark' : 'chess-light') +
          (isPiece ? ' chess-piece-cell' : '') + '" data-cell="' + r + ',' + c + '">' +
          (isPiece ? '<span class="chess-piece">' + CHESS_PIECES[exercise.piece] + '</span>' : '') +
        '</button>';
      }
    }

    el.innerHTML =
      '<div class="chess-caption">' + exercise.caption + '</div>' +
      '<div class="chess-board">' + cells + '</div>';

    el.querySelectorAll('.chess-cell').forEach(btn => {
      btn.addEventListener('click', () => submit(btn.dataset.cell, btn));
    });
  },

  renderChoices(el) {
    el.innerHTML = '';
  },
};
