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
];

export function gamesByDomain() {
  return DOMAINS
    .map(domain => ({ domain, games: GAMES.filter(g => g.domain === domain.key) }))
    .filter(group => group.games.length > 0);
}
