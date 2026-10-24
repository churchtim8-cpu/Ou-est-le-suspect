/**
 * A street scene as the game sees it: what stands where (landmarks) and every
 * place the suspect can hide (spots). The pictures only decorate this; the
 * spots and their positions are the truth that clues are checked against.
 *
 * Coordinates are game units: x along the street from its left end, y down
 * from the top of the screen (720 tall). Left and right are always from the
 * player's point of view, as in the deck.
 */

/** Where a spot is relative to its landmark. */
export type Zone =
  | 'front' // on the pavement in front of a building
  | 'inside' // in a building's doorway
  | 'roof' // on a building's roof
  | 'open' // out in the open on a square
  | 'under' // under a street thing (tree, bench)
  | 'behind' // hidden behind a street thing (a parked car)
  | 'gap' // on the pavement between two places (in front of a plain shop)
  | 'end' // on the pavement at the end of the street
  | 'beside' // standing right next to a street thing
  | 'against' // leaning on a street thing (a lamp post)
  | 'opposite'; // on the near pavement, across the road from a place

export interface Landmark {
  /** Tells apart two of the same thing ("bench_2"); defaults to `thing`. */
  id?: string;
  /** A key of THINGS. */
  thing: string;
  /** `street` is the whole street itself ("au bout de la rue"). */
  kind: 'building' | 'square' | 'prop' | 'street';
  x0: number;
  x1: number;
}

export interface Spot {
  id: string;
  zone: Zone;
  /** The landmark this spot was laid out from (its id, or its thing). */
  of: string;
  /** Tap area. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where the suspect's feet go when he is found here. */
  footX: number;
  footY: number;
}

export interface Street {
  id: string;
  /** District name in French, for the chapter card. */
  name: string;
  width: number;
  landmarks: Landmark[];
  spots: Spot[];
}

export const landmarkId = (l: Landmark): string => l.id ?? l.thing;

export const centreX = (s: Spot): number => s.x + s.w / 2;
export const centreY = (s: Spot): number => s.y + s.h / 2;

/** The spot under a tap, or null; overlapping areas go to the nearest centre. */
export function spotAt(street: Street, x: number, y: number, pad = 8): Spot | null {
  let best: Spot | null = null;
  let bestD = Infinity;
  for (const s of street.spots) {
    if (x < s.x - pad || x > s.x + s.w + pad || y < s.y - pad || y > s.y + s.h + pad) continue;
    const d = (x - centreX(s)) ** 2 + (y - centreY(s)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}
