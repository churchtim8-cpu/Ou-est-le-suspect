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

/** What can happen at a street thing; each becomes a hiding spot. */
interface PropZones {
  under?: true;
  behind?: true;
  /** Standing right next to it, on this side. */
  beside?: 'left' | 'right';
  /** Leaning on it (a lamp post). */
  against?: true;
}

export interface PropPlacement {
  /** Unique in the street: "bench_2". */
  id: string;
  /** A key of THINGS, or null for decoration nobody hides by. */
  thing: string | null;
  /** Picture key. */
  picture: string;
  x: number;
  footY: number;
  /** Display height and width (width from the picture's shape at that height). */
  height: number;
  width: number;
  flip?: boolean;
  zones: PropZones;
}

const NEAR = 706;

/**
 * Street things. The far pavement keeps the places' doors clear; the near
 * pavement (in front of the road) has the street furniture: two of some
 * things (benches, bins, lamp posts) so that "près de" / "loin de" are needed
 * to say which one.
 */
export const PROPS_LAYOUT: readonly PropPlacement[] = [
  { id: 'bench_2', thing: 'bench', picture: 'bench', x: 500, footY: 692, height: 64, width: 108, zones: { under: true, beside: 'right' } },
  { id: 'red_car', thing: 'red_car', picture: 'car_0', x: 900, footY: STREET_LINES.parkedY, height: 92, width: 137, zones: { behind: true, beside: 'right' } },
  { id: 'bin_1', thing: 'bin', picture: 'bin', x: 1250, footY: NEAR, height: 58, width: 43, zones: { behind: true } },
  { id: 'tree', thing: 'tree', picture: 'tree', x: 1609, footY: 712, height: 236, width: 159, zones: { under: true, beside: 'right' } },
  { id: 'lamp_1', thing: 'lamp', picture: 'lamp', x: 2050, footY: NEAR, height: 200, width: 34, zones: { against: true } },
  { id: 'parasol', thing: 'parasol', picture: 'parasol', x: 2800, footY: NEAR, height: 125, width: 98, zones: { under: true } },
  { id: 'flower_stall', thing: null, picture: 'flower_stall', x: 3080, footY: NEAR, height: 105, width: 84, zones: {} },
  { id: 'kiosk', thing: 'kiosk', picture: 'kiosk', x: 3740, footY: NEAR, height: 150, width: 92, zones: { behind: true, beside: 'right' } },
  { id: 'bench', thing: 'bench', picture: 'bench', x: 4129, footY: 690, height: 64, width: 108, zones: { under: true, beside: 'right' } },
  { id: 'lamp_2', thing: 'lamp', picture: 'lamp', x: 4450, footY: NEAR, height: 200, width: 34, zones: { against: true } },
  { id: 'bin_2', thing: 'bin', picture: 'bin', x: 4800, footY: NEAR, height: 58, width: 43, zones: { behind: true } },
  { id: 'blue_car', thing: 'blue_car', picture: 'car_1', x: 4990, footY: STREET_LINES.parkedY, height: 92, width: 194, flip: true, zones: { behind: true, beside: 'right' } },
  { id: 'bus_stop', thing: 'bus_stop', picture: 'bus_shelter', x: 5450, footY: NEAR, height: 140, width: 165, zones: { behind: true, beside: 'right' } },
  { id: 'phone_box', thing: 'phone_box', picture: 'phone_box', x: 6250, footY: NEAR, height: 150, width: 65, zones: { behind: true, beside: 'right' } },
];

/** Where someone stands on the near pavement "en face de" each place (clear of the street things). */
const OPPOSITE: Record<string, number> = {
  police_station: 300,
  post_office: 1420,
  town_hall: 2250,
  square: 2560,
  bank: 3560,
  library: 4630,
  school: 5200,
  museum: 6480,
};

/** How far from a street thing's edge someone stands "à côté" of it. */
const BESIDE_GAP = 50;

/** Narrower gaps than this between two places are left as plain wall (no hiding spot). */
const MIN_GAP = 120;

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
  // The pavement between two places (in front of the plain shops), and the far end of the street.
  // The street starts at the police station, so only its right-hand end counts as "au bout de la rue".
  const row = [...layout.buildings].sort((a, b) => a.x0 - b.x0);
  const pavement = (id: string, zone: 'gap' | 'end', x: number) =>
    spots.push({ id, zone, of: zone === 'end' ? 'street' : id, x: x - 55, y: base - 70, w: 110, h: 108, footX: x, footY: base + 22 });
  row.forEach((b, i) => {
    const next = row[i + 1];
    if (next && next.x0 - b.x1 >= MIN_GAP) pavement(`gap.${b.place}.${next.place}`, 'gap', (b.x1 + next.x0) / 2);
  });
  const last = row.at(-1)!;
  if (layout.width - last.x1 >= MIN_GAP) pavement('street.end', 'end', (last.x1 + layout.width) / 2);
  landmarks.push({ thing: 'street', kind: 'street', x0: 0, x1: layout.width });
  for (const [place, x] of Object.entries(OPPOSITE)) {
    spots.push({ id: `${place}.opposite`, zone: 'opposite', of: place, x: x - 50, y: NEAR - 110, w: 100, h: 110, footX: x, footY: NEAR - 2 });
  }
  for (const p of PROPS_LAYOUT) {
    if (!p.thing) continue;
    const w = p.width;
    landmarks.push({ id: p.id, thing: p.thing, kind: 'prop', x0: p.x - w / 2, x1: p.x + w / 2 });
    const z = p.zones;
    if (z.under) {
      if (p.thing === 'tree') spots.push({ id: `${p.id}.under`, zone: 'under', of: p.id, x: p.x - 80, y: p.footY - 150, w: 160, h: 150, footX: p.x + 34, footY: p.footY - 2 });
      else spots.push({ id: `${p.id}.under`, zone: 'under', of: p.id, x: p.x - Math.max(50, w / 2 + 4), y: p.footY - Math.min(110, p.height), w: Math.max(100, w + 8), h: Math.min(110, p.height), footX: p.x + (p.thing === 'parasol' ? 10 : 0), footY: p.footY - 2 });
    }
    if (z.behind) {
      // Low things (cars, bins): the head shows over the top. Tall ones (a kiosk): half the body peeks out at the side.
      const tall = p.height > 120;
      spots.push({ id: `${p.id}.behind`, zone: 'behind', of: p.id, x: p.x - w / 2, y: p.footY - p.height, w: Math.max(w, 60), h: p.height, footX: tall ? p.x + w / 2 - 6 : p.x + w * 0.25, footY: p.footY - (p.thing === 'bin' ? 6 : 14) });
    }
    if (z.against) {
      spots.push({ id: `${p.id}.against`, zone: 'against', of: p.id, x: p.x - 70, y: p.footY - 110, w: 90, h: 110, footX: p.x - 20, footY: p.footY - 2 });
    }
    if (z.beside) {
      const bx = z.beside === 'right' ? p.x + w / 2 + BESIDE_GAP : p.x - w / 2 - BESIDE_GAP;
      const footY = p.footY - 2;
      spots.push({ id: `${p.id}.beside`, zone: 'beside', of: p.id, x: bx - 50, y: footY - 110, w: 100, h: 110, footX: bx, footY });
    }
  }
  return { id: 'centre-ville', name: 'Le centre-ville', width: layout.width, landmarks, spots };
}

export const TILES = { count: layout.tiles, width: layout.tileWidth, scale: layout.textureScale };
