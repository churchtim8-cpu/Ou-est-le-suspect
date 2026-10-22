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
  | 'behind'; // hidden behind a street thing (a parked car)

export interface Landmark {
  /** A key of THINGS. */
  thing: string;
  kind: 'building' | 'square' | 'prop';
  x0: number;
  x1: number;
}

export interface Spot {
  id: string;
  zone: Zone;
  /** The landmark this spot was laid out from (its key). */
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
