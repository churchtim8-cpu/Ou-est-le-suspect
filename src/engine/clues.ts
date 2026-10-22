import { PREPOSITIONS, type PrepId } from './prepositions';
import { type Spot, type Street } from './street';
import { roofOf, THINGS, type Thing } from './things';

/**
 * A clue is structured: a preposition and what it points at. The French and
 * English sentences are derived from it, and before a clue reaches a student
 * it must be TRUE of the hiding spot and of no other spot in the street
 * (`isUnambiguous`), the same rule the chase game applies to directions.
 */
export interface Clue {
  prep: PrepId;
  /** A key of THINGS. */
  ref: string;
  /** "sur le toit de la poste" points at the roof of a building. */
  part?: 'roof';
}

export interface Subject {
  fr: string;
  en: string;
}

export const SUBJECTS = {
  suspect: { fr: 'Le suspect', en: 'The suspect' },
  il: { fr: 'Il', en: 'He' },
  pie: { fr: 'La Pie', en: 'La Pie' },
  elle: { fr: 'Elle', en: 'She' },
} as const satisfies Record<string, Subject>;

/** Prepositions the street model can decide today (chapter 1). */
export const MODELLED: readonly PrepId[] = ['devant', 'derriere', 'sur', 'sous', 'dans'];

function thingOf(key: string): Thing {
  const t = THINGS[key];
  if (!t) throw new Error(`Unknown thing ${key}`);
  return t;
}

/** Does the clue describe this spot? */
export function holds(clue: Clue, spot: Spot, street: Street): boolean {
  const mark = street.landmarks.find((l) => l.thing === clue.ref);
  if (!mark) return false;
  const within = spot.footX >= mark.x0 && spot.footX <= mark.x1;
  if (!within) return false;
  switch (clue.prep) {
    case 'devant':
      return mark.kind === 'building' && !clue.part && spot.zone === 'front';
    case 'dans':
      return mark.kind === 'building' && !clue.part && spot.zone === 'inside';
    case 'sur':
      if (clue.part === 'roof') return mark.kind === 'building' && spot.zone === 'roof';
      return mark.kind === 'square' && spot.zone === 'open';
    case 'sous':
      return mark.kind === 'prop' && !clue.part && spot.zone === 'under';
    case 'derriere':
      return mark.kind === 'prop' && !clue.part && spot.zone === 'behind';
    default:
      return false;
  }
}

/** Every spot the clue describes. */
export function matches(clue: Clue, street: Street): Spot[] {
  return street.spots.filter((s) => holds(clue, s, street));
}

export function isUnambiguous(clue: Clue, target: Spot, street: Street): boolean {
  const m = matches(clue, street);
  return m.length === 1 && m[0] === target;
}

/** All true, unambiguous clues for a spot using the given prepositions. */
export function cluesFor(target: Spot, street: Street, preps: readonly PrepId[]): Clue[] {
  const out: Clue[] = [];
  for (const prep of preps) {
    for (const mark of street.landmarks) {
      const parts: (undefined | 'roof')[] = prep === 'sur' && mark.kind === 'building' ? ['roof'] : [undefined];
      for (const part of parts) {
        const clue: Clue = part ? { prep, ref: mark.thing, part } : { prep, ref: mark.thing };
        if (isUnambiguous(clue, target, street)) out.push(clue);
      }
    }
  }
  return out;
}

/** "devant la banque", "à côté du café", "sur le toit de la poste". */
export function phraseFr(clue: Clue): string {
  const prep = PREPOSITIONS[clue.prep];
  const t = thingOf(clue.ref);
  if (clue.part === 'roof') {
    const roof = roofOf(t).word;
    return prep.takesDe ? `${prep.fr} du ${roof.slice(3)}` : `${prep.fr} ${roof}`;
  }
  return prep.takesDe ? `${prep.fr} ${t.de}` : `${prep.fr} ${t.word}`;
}

export function phraseEn(clue: Clue): string {
  const prep = PREPOSITIONS[clue.prep];
  const t = thingOf(clue.ref);
  if (clue.part === 'roof') return `${prep.en} ${roofOf(t).en}`;
  if (clue.prep === 'sur' && clue.ref === 'square') return `in ${t.en}`;
  return `${prep.en} ${t.en}`;
}

export function sentenceFr(subject: Subject, clue: Clue): string {
  return `${subject.fr} est ${phraseFr(clue)}.`;
}

export function sentenceEn(subject: Subject, clue: Clue): string {
  return `${subject.en} is ${phraseEn(clue)}.`;
}
