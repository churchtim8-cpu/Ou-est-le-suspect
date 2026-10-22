import { cluesFor, SUBJECTS, type Clue, type Subject } from './clues';
import type { PrepId } from './prepositions';
import { Rng } from './rng';
import type { Spot, Street } from './street';

/**
 * Chapter 1 (le centre-ville): one new preposition per case, then the boss
 * mixes them all with a twist. A case is planned from its seed, so the same
 * case replays with a different hiding spot each time.
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
}

export const CHAPTER_1: readonly CaseDef[] = [
  { id: 'c1-1', number: 1, title: 'Affaire n°1', blurb: 'A suspect on the street', preps: ['devant'] },
  { id: 'c1-2', number: 2, title: 'Affaire n°2', blurb: 'Someone slipped inside', preps: ['dans'] },
  { id: 'c1-3', number: 3, title: 'Affaire n°3', blurb: 'Look up high', preps: ['sur'] },
  { id: 'c1-4', number: 4, title: 'Affaire n°4', blurb: 'Hiding low', preps: ['sous', 'derriere'] },
  { id: 'c1-5', number: 5, title: 'La Pie', blurb: 'BOSS: loves high places', preps: ['devant', 'dans', 'sur', 'sous', 'derriere'], boss: 'pie' },
];

export interface PlannedClue {
  target: Spot;
  clue: Clue;
}

export interface PlannedCase {
  def: CaseDef;
  subject: Subject;
  /** Short form used after the first line: "Il", "Elle". */
  pronoun: Subject;
  first: PlannedClue;
  /** The boss moves: a second hiding spot and clue. */
  move?: PlannedClue;
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  const item = list[rng.int(0, list.length - 1)];
  if (item === undefined) throw new Error('pick from an empty list');
  return item;
}

function plannable(street: Street, preps: readonly PrepId[], exclude?: Spot): PlannedClue[] {
  return street.spots.filter((s) => s !== exclude).flatMap((target) => cluesFor(target, street, preps).map((clue) => ({ target, clue })));
}

export function planCase(def: CaseDef, street: Street, seed: string): PlannedCase {
  const rng = Rng.fromSeed(`${def.id}/${seed}`);
  if (def.boss === 'pie') {
    // La Pie starts on a roof (she loves high places), then flies somewhere else.
    const onRoof = plannable(street, ['sur']).filter((p) => p.clue.part === 'roof');
    const first = pick(rng.fork('first'), onRoof);
    const away = plannable(street, def.preps, first.target).filter((p) => Math.abs(p.target.footX - first.target.footX) > 900);
    const move = pick(rng.fork('move'), away);
    return { def, subject: SUBJECTS.pie, pronoun: SUBJECTS.elle, first, move };
  }
  const options = plannable(street, def.preps);
  // Case 4 mixes two prepositions: choose the preposition first so both come up as often.
  const prep = pick(rng.fork('prep'), def.preps);
  const first = pick(rng.fork('spot'), options.filter((o) => o.clue.prep === prep));
  return { def, subject: SUBJECTS.suspect, pronoun: SUBJECTS.il, first };
}
