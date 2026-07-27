import { describe, it, expect, vi } from 'vitest';
import { ChessGame, ChessMoves, CHESS_SIZE, CHESS_PIECES } from '../../js/games/chess.js';

function ctx(count, rng = Math.random) {
  return { rng, t: k => k, lang: 'fr', count, category: null };
}

describe('ChessMoves', () => {
  it('gives a rook a full rank and file from a corner', () => {
    expect(ChessMoves.targets('rook', 0, 0)).toHaveLength((CHESS_SIZE - 1) * 2);
  });

  it('gives a knight two moves from a corner', () => {
    expect(ChessMoves.targets('knight', 0, 0)).toHaveLength(2);
  });

  it('gives a king three moves from a corner', () => {
    expect(ChessMoves.targets('king', 0, 0)).toHaveLength(3);
  });

  it('gives a bishop two moves from a corner', () => {
    expect(ChessMoves.targets('bishop', 0, 0)).toHaveLength(2);
  });

  it('gives a queen six moves from a corner (rook + bishop combined)', () => {
    expect(ChessMoves.targets('queen', 0, 0)).toHaveLength(6);
  });

  it('leaves a knight with no legal move from the centre of a 3x3 board', () => {
    // This is the entire reason generate() has a retry loop: a knight
    // dropped in the centre square has nowhere legal to go.
    expect(ChessMoves.targets('knight', 1, 1)).toHaveLength(0);
  });
});

describe('ChessGame', () => {
  it('sits in the logic domain with its own correct class', () => {
    expect(ChessGame.id).toBe('chess');
    expect(ChessGame.domain).toBe('logique');
    expect(ChessGame.layoutClass).toBe('chess-game-layout');
    expect(ChessGame.correctClass).toBe('chess-correct');
  });

  it('has the standard round counts', () => {
    expect(ChessGame.rounds).toEqual({ easy: 5, normal: 10, hard: 20 });
  });

  it('generates the difficulty round count', () => {
    expect(ChessGame.generate('easy', ctx(5))).toHaveLength(5);
  });

  it('never generates a piece with no legal move', () => {
    for (const ex of ChessGame.generate('hard', ctx(20))) {
      expect(ex.targets.length).toBeGreaterThan(0);
    }
  });

  it('retries when the roll lands on a knight stuck in the centre', () => {
    // First triple of rng draws forces piece=knight, row=1, col=1 — the one
    // square/piece combination on a 3x3 board with zero legal targets (see
    // the ChessMoves suite above). This is the entire reason generate()
    // has a retry loop: without it, the child would be handed an
    // unsolvable board with no square to tap. The second triple forces a
    // rook in the corner, which has legal moves, so a correct retry loop
    // must land there instead.
    const rng = cyclingRngFactory([0.85, 0.5, 0.5, 0.3, 0.1, 0.1]);
    const ex = ChessGame.generate('easy', ctx(1, rng))[0];

    expect(ex.targets.length).toBeGreaterThan(0);
    expect(ex.piece).toBe('rook');
    expect(ex.row).toBe(0);
    expect(ex.col).toBe(0);
  });

  it('keeps every target on the board', () => {
    for (const ex of ChessGame.generate('hard', ctx(20))) {
      for (const target of ex.targets) {
        const [r, c] = target.split(',').map(Number);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(CHESS_SIZE);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(CHESS_SIZE);
      }
    }
  });

  it('never repeats the same piece and square consecutively', () => {
    // Seeded, cycling rng (length 12: 4 triples of 3 draws each) instead of
    // Math.random, so this is deterministic rather than "usually" catching a
    // regression:
    //  - draws 0-2 give exercise 0: queen at (1,1) (has legal moves).
    //  - draws 3-5 replay the exact same triple, so a correct anti-repeat
    //    check must reject it as exercise 1 and retry.
    //  - draws 6-8 give a rook at (0,0) (also has legal moves, and differs
    //    from queen(1,1)), which the loop must accept as exercise 1.
    //  - draws 9-11 are unused padding by correct code (which already
    //    resolved exercise 1 at draws 6-8) but matter for the mutant below.
    // A mutant whose keyOf returns a constant can never satisfy the used-set
    // check, so drawDistinct's used-set is never actually populated with a
    // real key, and exercise 1's draw runs to completion of BOTH of
    // drawDistinct's internal phases (the first DRAW_TRIES-try loop, then
    // the reseed-and-retry DRAW_TRIES-try loop) before falling through with
    // whatever candidate it last drew. Each phase draws exactly DRAW_TRIES
    // candidates (3 rng() calls each, since every candidate here has legal
    // moves on the first roll), so the final candidate lands at rng-cycle
    // position (2 * DRAW_TRIES * 3) mod 12, measured from right after
    // exercise 0's own 3 draws.
    //
    // MEASURED DIRECTLY (not assumed): with this 12-value cycle, that final
    // candidate is queen(1,1) — the same as exercise 0, so the mutant is
    // caught — whenever DRAW_TRIES is EVEN (checked 20, 30, 40, 50), and is
    // rook(0,0) — coincidentally matching this test's own expected values
    // for a *correct* exercise 1, so the mutant escapes and the test passes
    // on broken code — whenever DRAW_TRIES is ODD (checked 39, 41, 45). The
    // condition is DRAW_TRIES's parity, not any "multiple of 12" property:
    // 30 and 50 are not multiples of 12 and are still caught; 39 and 41 are
    // adjacent to 40 and both escape. If DRAW_TRIES ever changes, re-run
    // this mutation (keyOf -> () => 'CONST') before trusting this test —
    // don't assume from the arithmetic above, measure it, the way this
    // comment's numbers were measured rather than derived from the old
    // (also wrong) "500 tries is a multiple of 12" story this replaced.
    const rng = cyclingRngFactory([
      0.65, 0.5, 0.5,
      0.65, 0.5, 0.5,
      0.3, 0.1, 0.1,
      0.5, 0.5, 0.5,
    ]);
    const exercises = ChessGame.generate('easy', ctx(2, rng));

    expect(exercises[0].piece).toBe('queen');
    expect(exercises[0].row).toBe(1);
    expect(exercises[0].col).toBe(1);
    expect(exercises[1].piece).toBe('rook');
    expect(exercises[1].row).toBe(0);
    expect(exercises[1].col).toBe(0);

    const keys = exercises.map(e => e.piece + e.row + e.col);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).not.toBe(keys[i - 1]);
    }
  });

  it('takes the caption from ctx.t rather than reading I18n directly', () => {
    const ex = ChessGame.generate('easy', ctx(1))[0];
    expect(ex.caption).toBe('chessPrompt');
  });

  it('is deterministic for a fixed rng seed', () => {
    let calls = 0;
    const seededRng = () => {
      // Deterministic pseudo-sequence, reset per run via the closure below.
      calls++;
      return (calls * 0.137) % 1;
    };

    function run() {
      calls = 0;
      return ChessGame.generate('normal', ctx(10, seededRng)).map(e => ({
        piece: e.piece,
        row: e.row,
        col: e.col,
      }));
    }

    expect(run()).toEqual(run());
  });

  it('accepts every legal target and rejects every non-target', () => {
    const ex = ChessGame.generate('easy', ctx(1))[0];

    for (const target of ex.targets) {
      expect(ChessGame.isCorrect(target, ex)).toBe(true);
    }

    for (let r = 0; r < CHESS_SIZE; r++) {
      for (let c = 0; c < CHESS_SIZE; c++) {
        const cell = r + ',' + c;
        if (ex.targets.includes(cell)) continue;
        expect(ChessGame.isCorrect(cell, ex)).toBe(false);
      }
    }
  });

  it('renders a full board and wires submit on every cell', () => {
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1))[0];
    const submit = vi.fn();

    ChessGame.renderPrompt(el, ex, submit);

    const cells = el.querySelectorAll('.chess-cell');
    expect(cells).toHaveLength(CHESS_SIZE * CHESS_SIZE);
    expect(el.querySelectorAll('.chess-piece')).toHaveLength(1);

    el.querySelector('[data-cell="' + ex.targets[0] + '"]').click();
    expect(submit).toHaveBeenCalledWith(ex.targets[0], expect.anything());
  });

  it('renders the caption text supplied by ctx.t', () => {
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1))[0];

    ChessGame.renderPrompt(el, ex, vi.fn());

    expect(el.querySelector('.chess-caption').textContent).toBe('chessPrompt');
  });

  it('places the piece on its own square, not some other cell', () => {
    // Pinned rng: piece=rook, row=1, col=2 (not the (0,0) corner), so a
    // hard-coded `r === 0 && c === 0` placement bug cannot coincidentally
    // match the real square and slip through.
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1, cyclingRngFactory([0.3, 0.5, 0.9])))[0];
    expect(ex.piece).toBe('rook');
    expect(ex.row).toBe(1);
    expect(ex.col).toBe(2);

    ChessGame.renderPrompt(el, ex, vi.fn());

    const pieceCell = el.querySelector('[data-cell="1,2"]');
    expect(pieceCell.classList.contains('chess-piece-cell')).toBe(true);
    expect(pieceCell.querySelector('.chess-piece')).not.toBeNull();

    // No other cell should carry the piece.
    el.querySelectorAll('.chess-cell').forEach(cell => {
      if (cell === pieceCell) return;
      expect(cell.classList.contains('chess-piece-cell')).toBe(false);
      expect(cell.querySelector('.chess-piece')).toBeNull();
    });
  });

  it('renders the glyph matching the exercise piece', () => {
    // Pinned to a non-king piece so a `CHESS_PIECES[exercise.piece]` ->
    // `CHESS_PIECES.king` mutation cannot coincidentally pass.
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1, cyclingRngFactory([0.3, 0.5, 0.9])))[0];
    expect(ex.piece).toBe('rook');

    ChessGame.renderPrompt(el, ex, vi.fn());

    const glyphEl = el.querySelector('.chess-piece');
    expect(glyphEl.textContent).toBe(CHESS_PIECES.rook);
    expect(glyphEl.textContent).toBe(CHESS_PIECES[ex.piece]);
  });

  it('checkerboards the cells starting light at (0,0)', () => {
    document.body.innerHTML = '<div id="prompt"></div>';
    const el = document.getElementById('prompt');
    const ex = ChessGame.generate('easy', ctx(1))[0];

    ChessGame.renderPrompt(el, ex, vi.fn());

    expect(el.querySelector('[data-cell="0,0"]').classList.contains('chess-light')).toBe(true);
    expect(el.querySelector('[data-cell="0,1"]').classList.contains('chess-dark')).toBe(true);
  });

  it('leaves the choices container empty', () => {
    document.body.innerHTML = '<div id="choices">stale</div>';
    const el = document.getElementById('choices');
    ChessGame.renderChoices(el, ChessGame.generate('easy', ctx(1))[0], vi.fn());
    expect(el.innerHTML).toBe('');
  });

  it('never repeats a piece-and-square across a whole session', () => {
    // Five pieces x nine squares minus the centre knight = 44 answerable
    // boards, against at most twenty rounds. Full distinctness held in 500 000
    // of 500 000 simulated sessions. Before this change 30.7% of hard sessions
    // showed the same board three or more times, despite the one-slot
    // previousKey guard — A B A B A reads to a child exactly as badly as A A A.
    for (const [difficulty, rounds] of [['easy', 5], ['normal', 10], ['hard', 20]]) {
      for (let session = 0; session < 30; session++) {
        const keys = ChessGame.generate(difficulty, ctx(rounds))
          .map(ex => ex.piece + ex.row + ex.col);

        expect(new Set(keys).size, difficulty).toBe(rounds);
      }
    }
  });
});

function cyclingRngFactory(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
