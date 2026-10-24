import { GANG } from './difficulty';
import { cluesFor, ORDINALS, QUALIFIERS, SUBJECTS, type Clue, type Qualifier, type Subject } from './clues';
import type { PrepId } from './prepositions';
import { Rng } from './rng';
import type { Spot, Street } from './street';

/**
 * Chapter 1 (le centre-ville): one or more new prepositions per case, then the boss
 * mixes them all with a twist. Each case is a gang (3 suspects on Easy, 5 on
 * Medium) hiding all along the street, found one by one. A case is planned
 * from its seed, so it replays with different hiding spots each time.
 */

export interface CaseDef {
  id: string;
  number: number;
  /** French title on the case card. */
  title: string;
  /** English line under it (menus are English). */
  blurb: string;
  preps: readonly PrepId[];
  /** The chapter's boss case. */
  boss?: 'pie';
  /** The new places are all in one spot (the square), so the gang may hide close together. */
  together?: true;
}

export const CHAPTER_1: readonly CaseDef[] = [
  { id: 'c1-1', number: 1, title: 'Affaire n°1', blurb: 'A gang on the street', preps: ['devant'] },
  { id: 'c1-2', number: 2, title: 'Affaire n°2', blurb: 'They slipped inside', preps: ['dans'] },
  { id: 'c1-3', number: 3, title: 'Affaire n°3', blurb: 'Look up high', preps: ['sur'] },
  { id: 'c1-4', number: 4, title: 'Affaire n°4', blurb: 'Hiding low', preps: ['sous', 'derriere'] },
  { id: 'c1-5', number: 5, title: 'Affaire n°5', blurb: 'In between', preps: ['entre', 'a_cote'] },
  { id: 'c1-6', number: 6, title: 'Affaire n°6', blurb: 'Left, right, the very end', preps: ['a_gauche', 'a_droite', 'au_bout'] },
  { id: 'c1-7', number: 7, title: 'Affaire n°7', blurb: 'Across the road', preps: ['en_face'] },
  { id: 'c1-8', number: 8, title: 'Affaire n°8', blurb: 'Near, far, leaning', preps: ['pres', 'loin', 'contre'] },
  { id: 'c1-9', number: 9, title: 'Affaire n°9', blurb: 'A gang in the square', preps: ['au_milieu', 'au_bord', 'au_fond'], together: true },
  { id: 'c1-10', number: 10, title: 'Affaire n°10', blurb: 'Up, down, round the corner', preps: ['en_haut', 'en_bas', 'au_coin'], together: true },
  {
    id: 'c1-11',
    number: 11,
    title: 'La Pie',
    blurb: "BOSS: La Pie's gang",
    preps: ['devant', 'dans', 'sur', 'sous', 'derriere', 'entre', 'a_cote', 'a_gauche', 'a_droite', 'au_bout', 'en_face', 'contre', 'pres', 'loin', 'au_milieu', 'au_bord', 'au_fond', 'en_haut', 'en_bas', 'au_coin'],
    boss: 'pie',
  },
];

export interface PlannedClue {
  target: Spot;
  clue: Clue;
}

export interface PlannedSuspect {
  /** "Le deuxième suspect", "La Pie". */
  subject: Subject;
  /** Short form after the first line: "Il", "Elle". */
  pronoun: Subject;
  first: PlannedClue;
  /** The boss moves: a second hiding spot and clue. */
  move?: PlannedClue;
  boss?: boolean;
}

export interface PlannedCase {
  def: CaseDef;
  /** In the order la centrale calls them. */
  suspects: PlannedSuspect[];
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  const item = list[rng.int(0, list.length - 1)];
  if (item === undefined) throw new Error('pick from an empty list');
  return item;
}

function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const plannableCache = new WeakMap<Street, Map<string, PlannedClue[]>>();

function plannable(street: Street, preps: readonly PrepId[], quals: readonly Qualifier[] = []): PlannedClue[] {
  let cache = plannableCache.get(street);
  if (!cache) plannableCache.set(street, (cache = new Map()));
  const key = `${preps.join(',')}|${quals.join(',')}`;
  let list = cache.get(key);
  if (!list) cache.set(key, (list = street.spots.flatMap((target) => cluesFor(target, street, preps, quals).map((clue) => ({ target, clue })))));
  return list;
}

/** "Près de" / "loin de" may narrow other clues once they are taught (in this case or before). */
function qualifiersFor(def: CaseDef): Qualifier[] {
  const known = new Set([...def.preps, ...earlier(def)]);
  return QUALIFIERS.filter((q) => known.has(q));
}

/** Prepositions taught in the cases before this one (review for a big gang). */
function earlier(def: CaseDef): PrepId[] {
  return [...new Set(CHAPTER_1.filter((c) => c.number < def.number && !c.boss).flatMap((c) => c.preps))];
}

/**
 * Chooses `count` hiding places, each on a different spot and spread out
 * along the street (never all in one corner). The case's own prepositions
 * come first, taking turns; only if they run out of spots do earlier ones
 * fill in.
 */
function chooseGang(rng: Rng, street: Street, def: CaseDef, count: number, taken: Spot[] = []): PlannedClue[] {
  const quals = qualifiersFor(def);
  const own = def.preps.map((prep) => shuffle(rng.fork(`own-${prep}`), plannable(street, [prep], quals)));
  const review = shuffle(rng.fork('review'), plannable(street, earlier(def), quals));
  const chosen: PlannedClue[] = [];
  const used = new Set(taken.map((s) => s.id));
  const far = (c: PlannedClue, gap: number) => [...taken, ...chosen.map((x) => x.target)].every((s) => Math.abs(s.footX - c.target.footX) >= gap);
  const take = (c: PlannedClue) => {
    chosen.push(c);
    used.add(c.target.id);
  };
  // The case's own prepositions take turns, as far apart as the street allows.
  const start = rng.int(0, own.length - 1);
  for (const gap of [GANG.spreadPx, GANG.spreadPx / 2, 0]) {
    let progress = true;
    while (chosen.length < count && progress) {
      progress = false;
      for (let k = 0; k < own.length && chosen.length < count; k++) {
        const c = own[(start + k) % own.length]!.find((x) => !used.has(x.target.id) && far(x, gap));
        if (c) {
          take(c);
          progress = true;
        }
      }
    }
  }
  for (const gap of [GANG.spreadPx / 2, 0]) {
    for (const c of review) {
      if (chosen.length >= count) break;
      if (!used.has(c.target.id) && far(c, gap)) take(c);
    }
  }
  if (chosen.length < count) throw new Error(`${def.id}: only ${chosen.length} hiding places for ${count} suspects`);
  return shuffle(rng.fork('order'), chosen);
}

export function planCase(def: CaseDef, street: Street, seed: string, count: number): PlannedCase {
  const rng = Rng.fromSeed(`${def.id}/${seed}/${count}`);
  if (def.boss === 'pie') {
    // Her gang first, then La Pie herself: she starts on a roof (she loves high places), then flies elsewhere.
    const gang = chooseGang(rng.fork('gang'), street, def, count - 1);
    const taken = gang.map((g) => g.target);
    const roofs = plannable(street, ['sur']).filter((p) => p.clue.part === 'roof' && !taken.includes(p.target));
    const apart = (gap: number) => roofs.filter((p) => taken.every((t) => Math.abs(t.footX - p.target.footX) >= gap));
    const spread = [GANG.spreadPx, GANG.spreadPx / 2, 0].map(apart).find((l) => l.length > 0)!;
    const first = pick(rng.fork('first'), spread);
    const away = plannable(street, def.preps, qualifiersFor(def)).filter((p) => p.target !== first.target && !taken.includes(p.target) && Math.abs(p.target.footX - first.target.footX) > 900);
    const move = pick(rng.fork('move'), away);
    return {
      def,
      suspects: [
        ...gang.map((g, i) => ({ subject: ORDINALS[i]!, pronoun: SUBJECTS.il, first: g })),
        { subject: SUBJECTS.pie, pronoun: SUBJECTS.elle, first, move, boss: true },
      ],
    };
  }
  const gang = chooseGang(rng.fork('gang'), street, def, count);
  return { def, suspects: gang.map((g, i) => ({ subject: ORDINALS[i]!, pronoun: SUBJECTS.il, first: g })) };
}
