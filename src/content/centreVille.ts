import type { Landmark, Spot, Street } from '../engine/street';
import layout from './centre-ville.layout.json';

/**
 * Le centre-ville: the 8 places of the deck's first district on one street,
 * built from the measured picture layout (centre-ville.layout.json, written
 * by the art tool) plus the street things placed by hand below.
 */

export const STREET_LINES = {
  /** Foot of the buildings / far pavement. */
  base: layout.base,
  farPavement: layout.farPavement as [number, number],
  road: layout.road as [number, number],
  nearPavement: layout.nearPavement as [number, number],
  /** Where moving traffic drives (wheels), and where parked cars stand. */
  trafficY: 578,
  parkedY: 608,
};

/** Roof lines measured by eye where the automatic one caught a tower behind or a pediment's tip. */
const ROOF_FIX: Record<string, number> = { bank: 214, museum: 206 };

/** Street things, placed in front of the plain shops so they never hide a place's door. */
export const PROPS_LAYOUT = {
  tree: { x: 1609, footY: 712, height: 236 },
  bench: { x: 4129, footY: 690, height: 64 },
  red_car: { x: 900, footY: STREET_LINES.parkedY, height: 92 },
  blue_car: { x: 4990, footY: STREET_LINES.parkedY, height: 92 },
} as const;

/** Display widths of the street things (from their pictures' shapes, at the heights above). */
const PROP_WIDTH = { tree: 159, bench: 108, red_car: 137, blue_car: 194 } as const;

export function buildCentreVille(): Street {
  const landmarks: Landmark[] = [];
  const spots: Spot[] = [];
  const base = STREET_LINES.base;
  layout.buildings.forEach((b, i) => {
    const w = b.x1 - b.x0;
    if (b.place === 'square') {
      landmarks.push({ thing: 'square', kind: 'square', x0: b.x0, x1: b.x1 });
      const cx = b.x0 + w * 0.5;
      spots.push({ id: 'square.open', zone: 'open', of: 'square', x: cx - 150, y: 380, w: 300, h: 100, footX: cx, footY: 478 });
      return;
    }
    landmarks.push({ thing: b.place, kind: 'building', x0: b.x0, x1: b.x1 });
    const roof = ROOF_FIX[b.place] ?? b.roof;
    // The suspect waits on the pavement to one side of the door, alternating sides along the street.
    const frontAt = i % 2 === 0 ? 0.24 : 0.76;
    const fx = b.x0 + w * frontAt;
    spots.push({ id: `${b.place}.front`, zone: 'front', of: b.place, x: fx - 60, y: base - 70, w: 120, h: 108, footX: fx, footY: base + 22 });
    const dx = b.x0 + w * 0.5;
    spots.push({ id: `${b.place}.inside`, zone: 'inside', of: b.place, x: dx - 58, y: base - 100, w: 116, h: 96, footX: dx, footY: base - 6 });
    spots.push({ id: `${b.place}.roof`, zone: 'roof', of: b.place, x: b.x0 + w * 0.25, y: roof - 70, w: w * 0.5, h: 90, footX: b.x0 + w * (i % 2 === 0 ? 0.62 : 0.38), footY: roof + 8 });
  });
  for (const [key, p] of Object.entries(PROPS_LAYOUT) as [keyof typeof PROPS_LAYOUT, (typeof PROPS_LAYOUT)[keyof typeof PROPS_LAYOUT]][]) {
    const w = PROP_WIDTH[key];
    landmarks.push({ thing: key, kind: 'prop', x0: p.x - w / 2, x1: p.x + w / 2 });
    if (key === 'tree') {
      spots.push({ id: 'tree.under', zone: 'under', of: key, x: p.x - 80, y: p.footY - 150, w: 160, h: 150, footX: p.x + 34, footY: p.footY - 2 });
    } else if (key === 'bench') {
      spots.push({ id: 'bench.under', zone: 'under', of: key, x: p.x - 58, y: p.footY - 64, w: 116, h: 64, footX: p.x, footY: p.footY - 2 });
    } else {
      spots.push({ id: `${key}.behind`, zone: 'behind', of: key, x: p.x - w / 2, y: p.footY - p.height, w, h: p.height, footX: p.x + w * 0.25, footY: p.footY - 14 });
    }
  }
  return { id: 'centre-ville', name: 'Le centre-ville', width: layout.width, landmarks, spots };
}

export const TILES = { count: layout.tiles, width: layout.tileWidth, scale: layout.textureScale };
