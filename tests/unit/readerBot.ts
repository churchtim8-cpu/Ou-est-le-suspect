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
  const m = /^(?:Le suspect|Le (?:premier|deuxième|troisième|quatrième|cinquième) suspect|Il|La Pie|Elle) est (.+)\.$/.exec(sentence);
  if (!m || !m[1]) return null;
  let rest = m[1];
  // "sous le banc près de la poste": a place at the end says which of two.
  let near: Clue['near'];
  for (const q of [PREPOSITIONS.pres, PREPOSITIONS.loin]) {
    const at = rest.lastIndexOf(` ${q.fr} `);
    if (at <= 0) continue;
    const place = Object.values(THINGS).find((x) => x.de === rest.slice(at + q.fr.length + 2));
    if (!place) continue;
    near = { prep: q.id as 'pres' | 'loin', ref: place.key };
    rest = rest.slice(0, at);
  }
  const base = readPlain(rest);
  return base && near ? { ...base, near } : base;
}

function readPlain(rest: string): Clue | null {
  // Longest preposition first ("à côté" before "à").
  const preps = Object.values(PREPOSITIONS).sort((a, b) => b.fr.length - a.fr.length);
  for (const prep of preps) {
    if (!rest.startsWith(prep.fr + ' ')) continue;
    let obj = rest.slice(prep.fr.length + 1);
    if (prep.id === 'entre') {
      // "entre la poste et la mairie": two places, split at the "et" that leaves a known place on each side.
      for (const { index: i } of obj.matchAll(/ et /g)) {
        const a = Object.values(THINGS).find((x) => x.word === obj.slice(0, i));
        const b = Object.values(THINGS).find((x) => x.word === obj.slice(i + 4));
        if (a && b) return { prep: 'entre', ref: a.key, ref2: b.key };
      }
      return null;
    }
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
