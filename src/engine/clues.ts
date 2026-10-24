import { PREPOSITIONS, type PrepId } from './prepositions';
import { type Landmark, type Spot, type Street } from './street';
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
  /** "entre la poste et la mairie": the second place (written left to right, as the player sees them). */
  ref2?: string;
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

/** "Le premier suspect", "Le deuxième suspect"…: one subject per member of the gang. */
export const ORDINALS: readonly Subject[] = [
  { fr: 'Le premier suspect', en: 'The first suspect' },
  { fr: 'Le deuxième suspect', en: 'The second suspect' },
  { fr: 'Le troisième suspect', en: 'The third suspect' },
  { fr: 'Le quatrième suspect', en: 'The fourth suspect' },
  { fr: 'Le cinquième suspect', en: 'The fifth suspect' },
];

/** Prepositions the street model can decide today (chapter 1). */
export const MODELLED: readonly PrepId[] = ['devant', 'derriere', 'sur', 'sous', 'dans', 'entre', 'a_cote', 'a_gauche', 'a_droite', 'au_bout'];

/** Pavement spots that are not in front of a place: the gaps between places and the street's end. */
const onPavement = (spot: Spot): boolean => spot.zone === 'gap' || spot.zone === 'end';

/** Places along the back of the street (buildings and the square), left to right. */
function backRow(street: Street): Landmark[] {
  return street.landmarks.filter((l) => l.kind === 'building' || l.kind === 'square').sort((a, b) => a.x0 - b.x0);
}

/** The places either side of a pavement spot: the nearest one on its left and on its right. */
function neighbours(spot: Spot, street: Street): { left?: Landmark; right?: Landmark } {
  const row = backRow(street);
  return { left: row.filter((l) => l.x1 <= spot.footX).at(-1), right: row.find((l) => l.x0 >= spot.footX) };
}

function thingOf(key: string): Thing {
  const t = THINGS[key];
  if (!t) throw new Error(`Unknown thing ${key}`);
  return t;
}

/** Does the clue describe this spot? */
export function holds(clue: Clue, spot: Spot, street: Street): boolean {
  const mark = street.landmarks.find((l) => l.thing === clue.ref);
  if (!mark) return false;
  if (clue.part && clue.prep !== 'sur') return false;
  if (clue.ref2 && clue.prep !== 'entre') return false;
  const within = spot.footX >= mark.x0 && spot.footX <= mark.x1;
  switch (clue.prep) {
    case 'devant':
      return within && mark.kind === 'building' && spot.zone === 'front';
    case 'dans':
      return within && mark.kind === 'building' && spot.zone === 'inside';
    case 'sur':
      if (clue.part === 'roof') return within && mark.kind === 'building' && spot.zone === 'roof';
      return within && mark.kind === 'square' && spot.zone === 'open';
    case 'sous':
      return within && mark.kind === 'prop' && spot.zone === 'under';
    case 'derriere':
      return within && mark.kind === 'prop' && spot.zone === 'behind';
    case 'entre': {
      // Between two places that stand side by side, with nothing else in between (either order).
      if (!clue.ref2 || !onPavement(spot)) return false;
      const n = neighbours(spot, street);
      const pair = [n.left?.thing, n.right?.thing];
      return pair.includes(clue.ref) && pair.includes(clue.ref2) && clue.ref !== clue.ref2;
    }
    case 'a_gauche':
    case 'a_droite': {
      // From the player's point of view. Next to a street thing, or the pavement
      // straight beside a place, with no other place in between.
      if (mark.kind === 'prop') return spot.zone === 'beside' && spot.of === mark.thing && (clue.prep === 'a_gauche' ? spot.footX < mark.x0 : spot.footX > mark.x1);
      if (!onPavement(spot)) return false;
      const n = neighbours(spot, street);
      return (clue.prep === 'a_gauche' ? n.right : n.left) === mark;
    }
    case 'a_cote':
      // Only street things: a place has two sides, so "à côté de la banque" would point two ways.
      return mark.kind === 'prop' && spot.zone === 'beside' && spot.of === mark.thing;
    case 'au_bout':
      return mark.kind === 'street' && spot.zone === 'end';
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
    if (prep === 'entre') {
      const row = backRow(street);
      for (let i = 0; i + 1 < row.length; i++) {
        const clue: Clue = { prep, ref: row[i]!.thing, ref2: row[i + 1]!.thing };
        if (isUnambiguous(clue, target, street)) out.push(clue);
      }
      continue;
    }
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
  if (clue.ref2) return `${prep.fr} ${t.word} et ${thingOf(clue.ref2).word}`;
  if (clue.part === 'roof') {
    const roof = roofOf(t).word;
    return prep.takesDe ? `${prep.fr} du ${roof.slice(3)}` : `${prep.fr} ${roof}`;
  }
  return prep.takesDe ? `${prep.fr} ${t.de}` : `${prep.fr} ${t.word}`;
}

export function phraseEn(clue: Clue): string {
  const prep = PREPOSITIONS[clue.prep];
  const t = thingOf(clue.ref);
  if (clue.ref2) return `${prep.en} ${t.en} and ${thingOf(clue.ref2).en}`;
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
