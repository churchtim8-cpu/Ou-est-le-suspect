import { PREPOSITIONS } from '../../src/engine/prepositions';
import type { Spot, Street } from '../../src/engine/street';
import { THINGS } from '../../src/engine/things';
import { holds, type Clue } from '../../src/engine/clues';

/**
 * A pretend student who only reads the French sentence. It works out the
 * preposition and the place from the words alone (so a wrong "du" or a
 * missing "de" makes it fail), then lists every spot that fits.
 */
export function readClue(sentence: string): Clue | null {
  const m = /^(?:Le suspect|Il|La Pie|Elle) est (.+)\.$/.exec(sentence);
  if (!m || !m[1]) return null;
  const rest = m[1];
  // Longest preposition first ("à côté" before "à").
  const preps = Object.values(PREPOSITIONS).sort((a, b) => b.fr.length - a.fr.length);
  for (const prep of preps) {
    if (!rest.startsWith(prep.fr + ' ')) continue;
    let obj = rest.slice(prep.fr.length + 1);
    let part: 'roof' | undefined;
    if (!prep.takesDe && obj.startsWith('le toit ')) {
      part = 'roof';
      obj = obj.slice('le toit '.length);
      const t = Object.values(THINGS).find((x) => x.de === obj);
      return t ? { prep: prep.id as Clue['prep'], ref: t.key, part } : null;
    }
    const t = Object.values(THINGS).find((x) => (prep.takesDe ? x.de : x.word) === obj);
    return t ? { prep: prep.id as Clue['prep'], ref: t.key } : null;
  }
  return null;
}

export function spotsFromSentence(sentence: string, street: Street): Spot[] {
  const clue = readClue(sentence);
  if (!clue) return [];
  return street.spots.filter((s) => holds(clue, s, street));
}
