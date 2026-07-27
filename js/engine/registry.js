import { DiceAdditionGame } from '../games/dice-addition.js';
import { CountObjectsGame } from '../games/count-objects.js';
import { DiceRecognitionGame } from '../games/dice-recognition.js';
import { UnoGame } from '../games/uno.js';
import { CountriesGame } from '../games/countries.js';
import { CapitalsGame } from '../games/capitals.js';
import { GuessTimeGame } from '../games/guess-time.js';
import { MemoryGame } from '../games/memory.js';
import { ChessGame } from '../games/chess.js';
import { DoubleCrashGame } from '../games/double-crash.js';
import { ComplementsGame } from '../games/complements.js';
import { SubtractionGame } from '../games/subtraction.js';
import { DoublesGame } from '../games/doubles.js';
import { CompareGame } from '../games/compare.js';
import { MissingNumberGame } from '../games/missing-number.js';
import { TensUnitsGame } from '../games/tens-units.js';
import { MoneyGame } from '../games/money.js';
import { NumberWordsGame } from '../games/number-words.js';
import { WordProblemsGame } from '../games/word-problems.js';
import { ShapesGame } from '../games/shapes.js';

export const DOMAINS = [
  { key: 'nombres', labelKey: 'domainNombres', emoji: '🔢' },
  { key: 'mesures', labelKey: 'domainMesures', emoji: '📏' },
  { key: 'geometrie', labelKey: 'domainGeometrie', emoji: '🔷' },
  { key: 'logique', labelKey: 'domainLogique', emoji: '🃏' },
  { key: 'monde', labelKey: 'domainMonde', emoji: '🌍' },
];

export const GAMES = [
  DiceAdditionGame,
  CountObjectsGame,
  DiceRecognitionGame,
  GuessTimeGame,
  UnoGame,
  MemoryGame,
  ChessGame,
  DoubleCrashGame,
  CountriesGame,
  CapitalsGame,
  ComplementsGame,
  SubtractionGame,
  DoublesGame,
  CompareGame,
  MissingNumberGame,
  TensUnitsGame,
  MoneyGame,
  NumberWordsGame,
  WordProblemsGame,
  ShapesGame,
];

// domains/games default to the real registry; a test can pass its own
// synthetic lists to prove the empty-domain filter without depending on the
// live registry happening to contain an unpopulated domain.
export function gamesByDomain(domains = DOMAINS, games = GAMES) {
  return domains
    .map(domain => ({ domain, games: games.filter(g => g.domain === domain.key) }))
    .filter(group => group.games.length > 0);
}
