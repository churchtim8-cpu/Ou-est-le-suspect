import { NEAR_FAR } from './difficulty';
import { PREPOSITIONS, type PrepId } from './prepositions';
import { landmarkId, type Landmark, type Spot, type Street } from './street';
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
  /**
   * Which one, when the street has two: "sous le banc près de la poste",
   * "derrière la poubelle loin de l'école". `ref` here is a place.
   */
  near?: { prep: Qualifier; ref: string };
}

/** The prepositions that pick one of two look-alike things. */
export type Qualifier = 'pres' | 'loin';
export const QUALIFIERS: readonly Qualifier[] = ['pres', 'loin'];
const isQualifier = (p: PrepId): p is Qualifier => p === 'pres' || p === 'loin';

/** The prepositions a clue teaches: its own, plus près / loin when it picks one of two. */
export function teaches(clue: Clue): PrepId[] {
  return clue.near ? [clue.prep, clue.near.prep] : [clue.prep];
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
export const MODELLED: readonly PrepId[] = ['devant', 'derriere', 'sur', 'sous', 'dans', 'entre', 'a_cote', 'a_gauche', 'a_droite', 'au_bout', 'en_face', 'contre', 'pres', 'loin'];

/** Clues about a street thing, which "près de" / "loin de" can narrow down when there are two of it. */
const NARROWABLE: readonly PrepId[] = ['sous', 'derriere', 'contre', 'a_cote'];

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
  if (clue.near) return holdsNarrowed(clue, clue.near, spot, street);
  const marks = street.landmarks.filter((l) => l.thing === clue.ref);
  return marks.some((mark) => holdsAt(clue, mark, spot, street));
}

function holdsAt(clue: Clue, mark: Landmark, spot: Spot, street: Street): boolean {
  if (clue.part && clue.prep !== 'sur') return false;
  if (clue.ref2 && clue.prep !== 'entre') return false;
  const within = spot.footX >= mark.x0 && spot.footX <= mark.x1;
  const mine = spot.of === landmarkId(mark);
  switch (clue.prep) {
    case 'devant':
      return within && mark.kind === 'building' && spot.zone === 'front';
    case 'dans':
      return within && mark.kind === 'building' && spot.zone === 'inside';
    case 'sur':
      if (clue.part === 'roof') return within && mark.kind === 'building' && spot.zone === 'roof';
      return within && mark.kind === 'square' && spot.zone === 'open';
    case 'sous':
      return mark.kind === 'prop' && mine && spot.zone === 'under';
    case 'derriere':
      return mark.kind === 'prop' && mine && spot.zone === 'behind';
    case 'contre':
      return mark.kind === 'prop' && mine && spot.zone === 'against';
    case 'en_face':
      // Across the road: on the near pavement, opposite the place.
      return within && (mark.kind === 'building' || mark.kind === 'square') && spot.zone === 'opposite';
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
      if (mark.kind === 'prop') return spot.zone === 'beside' && mine && (clue.prep === 'a_gauche' ? spot.footX < mark.x0 : spot.footX > mark.x1);
      if (!onPavement(spot)) return false;
      const n = neighbours(spot, street);
      return (clue.prep === 'a_gauche' ? n.right : n.left) === mark;
    }
    case 'a_cote':
      // Only street things: a place has two sides, so "à côté de la banque" would point two ways.
      return mark.kind === 'prop' && spot.zone === 'beside' && mine;
    case 'au_bout':
      return mark.kind === 'street' && spot.zone === 'end';
    default:
      return false;
  }
}

/** "Sous le banc près de la poste": the clue alone fits two spots; the place picks the nearer (or further) one. */
function holdsNarrowed(clue: Clue, near: NonNullable<Clue['near']>, spot: Spot, street: Street): boolean {
  const base: Clue = { prep: clue.prep, ref: clue.ref };
  const place = street.landmarks.find((l) => l.thing === near.ref && (l.kind === 'building' || l.kind === 'square'));
  if (!place || !holds(base, spot, street)) return false;
  const fits = matches(base, street);
  if (fits.length < 2) return false; // only one: "près de" would be padding
  const at = (place.x0 + place.x1) / 2;
  const d = (s: Spot) => Math.abs(s.footX - at);
  const others = fits.filter((s) => s !== spot).map(d);
  // Only when it is plain to see: "près de" the place right by it, "loin de" the place right by the other one.
  if (near.prep === 'pres') return d(spot) <= NEAR_FAR.nearPx && others.every((o) => o >= d(spot) * NEAR_FAR.ratio);
  return others.every((o) => o <= NEAR_FAR.nearPx && d(spot) >= o * NEAR_FAR.ratio);
}

/** Streets never change once built, so what each clue matches is worked out once. */
const matchCache = new WeakMap<Street, Map<string, Spot[]>>();

/** Every spot the clue describes. */
export function matches(clue: Clue, street: Street): Spot[] {
  let cache = matchCache.get(street);
  if (!cache) matchCache.set(street, (cache = new Map()));
  const key = JSON.stringify(clue);
  let found = cache.get(key);
  if (!found) cache.set(key, (found = street.spots.filter((s) => holds(clue, s, street))));
  return found;
}

export function isUnambiguous(clue: Clue, target: Spot, street: Street): boolean {
  const m = matches(clue, street);
  return m.length === 1 && m[0] === target;
}

/** Clues with this one preposition (no "près de" / "loin de" yet). */
function plainClues(target: Spot, street: Street, prep: PrepId): Clue[] {
  const out: Clue[] = [];
  if (prep === 'entre') {
    const row = backRow(street);
    for (let i = 0; i + 1 < row.length; i++) out.push({ prep, ref: row[i]!.thing, ref2: row[i + 1]!.thing });
    return out;
  }
  for (const thing of new Set(street.landmarks.map((l) => l.thing))) {
    const mark = street.landmarks.find((l) => l.thing === thing)!;
    out.push(prep === 'sur' && mark.kind === 'building' ? { prep, ref: thing, part: 'roof' } : { prep, ref: thing });
  }
  return out;
}

/** "Près de" / "loin de" versions of a clue that fits more than one spot. */
function narrowed(clue: Clue, street: Street, quals: readonly Qualifier[]): Clue[] {
  return quals.flatMap((q) => backRow(street).map((place) => ({ ...clue, near: { prep: q, ref: place.thing } })));
}

/**
 * All true, unambiguous clues for a spot using the given prepositions. "Près"
 * and "loin" in `preps` mean clues that pick one of two look-alike things;
 * `quals` lets other prepositions use them too (once près / loin are taught).
 */
export function cluesFor(target: Spot, street: Street, preps: readonly PrepId[], quals: readonly Qualifier[] = []): Clue[] {
  const out: Clue[] = [];
  const keep = (c: Clue) => {
    if (isUnambiguous(c, target, street)) out.push(c);
  };
  for (const prep of preps) {
    if (isQualifier(prep)) {
      for (const base of NARROWABLE) for (const c of plainClues(target, street, base)) if (holds(c, target, street)) narrowed(c, street, [prep]).forEach(keep);
      continue;
    }
    for (const c of plainClues(target, street, prep)) {
      if (isUnambiguous(c, target, street)) out.push(c);
      else if (quals.length > 0 && NARROWABLE.includes(prep) && holds(c, target, street)) narrowed(c, street, quals).forEach(keep);
    }
  }
  return out;
}

/** "devant la banque", "à côté du café", "sur le toit de la poste". */
export function phraseFr(clue: Clue): string {
  if (clue.near) {
    const q = PREPOSITIONS[clue.near.prep];
    return `${phraseFr({ prep: clue.prep, ref: clue.ref })} ${q.fr} ${thingOf(clue.near.ref).de}`;
  }
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
  if (clue.near) {
    const q = PREPOSITIONS[clue.near.prep];
    return `${phraseEn({ prep: clue.prep, ref: clue.ref })} ${q.en} ${thingOf(clue.near.ref).en}`;
  }
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
