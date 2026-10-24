import { describe, expect, it } from 'vitest';
import { buildCentreVille } from '../../src/content/centreVille';
import { CHAPTER_1, planCase } from '../../src/engine/cases';
import { cluesFor, isUnambiguous, matches, MODELLED, QUALIFIERS, teaches, phraseFr, sentenceEn, sentenceFr, SUBJECTS } from '../../src/engine/clues';
import { PREPOSITIONS } from '../../src/engine/prepositions';
import { spotAt } from '../../src/engine/street';
import { PLACES, PROPS } from '../../src/engine/things';
import { spotsFromSentence } from './readerBot';

const street = buildCentreVille();

describe('French forms', () => {
  it('has all 30 places of the deck and 26 prepositions', () => {
    expect(Object.keys(PLACES)).toHaveLength(30);
    expect(Object.keys(PREPOSITIONS)).toHaveLength(26);
  });

  it('contracts de + le and keeps de la / de l\'', () => {
    expect(PLACES.cafe.de).toBe('du café');
    expect(PLACES.bank.de).toBe('de la banque');
    expect(PLACES.school.de).toBe("de l'école");
    expect(PLACES.police_station.de).toBe('du commissariat de police');
    expect(PROPS.tree.de).toBe("de l'arbre");
  });

  it('writes clean phrases', () => {
    expect(phraseFr({ prep: 'a_cote', ref: 'cafe' })).toBe('à côté du café');
    expect(phraseFr({ prep: 'devant', ref: 'bank' })).toBe('devant la banque');
    expect(phraseFr({ prep: 'sur', ref: 'museum', part: 'roof' })).toBe('sur le toit du musée');
    expect(phraseFr({ prep: 'sur', ref: 'school', part: 'roof' })).toBe("sur le toit de l'école");
    expect(phraseFr({ prep: 'en_face', ref: 'hotel' })).toBe("en face de l'hôtel");
    expect(sentenceEn(SUBJECTS.suspect, { prep: 'sur', ref: 'square' })).toBe('The suspect is in the square.');
    expect(phraseFr({ prep: 'entre', ref: 'post_office', ref2: 'town_hall' })).toBe('entre la poste et la mairie');
    expect(phraseFr({ prep: 'au_bout', ref: 'street' })).toBe('au bout de la rue');
    expect(phraseFr({ prep: 'a_gauche', ref: 'museum' })).toBe('à gauche du musée');
    expect(phraseFr({ prep: 'a_droite', ref: 'red_car' })).toBe('à droite de la voiture rouge');
    expect(sentenceEn(SUBJECTS.suspect, { prep: 'entre', ref: 'bank', ref2: 'library' })).toBe('The suspect is between the bank and the library.');
  });

  it('never writes "de le" or "de les"', () => {
    for (const p of Object.values(PLACES)) expect(p.de).not.toMatch(/\bde (le|les) /);
  });
});

describe('centre-ville street', () => {
  it('has every centre-ville place', () => {
    for (const key of ['police_station', 'town_hall', 'post_office', 'square', 'bank', 'library', 'school', 'museum']) {
      expect(street.landmarks.some((l) => l.thing === key)).toBe(true);
    }
  });

  it('gives every spot at least one true, unambiguous clue', () => {
    for (const spot of street.spots) expect(cluesFor(spot, street, MODELLED).length, spot.id).toBeGreaterThan(0);
  });

  it('a tap in the middle of a spot finds that spot', () => {
    for (const spot of street.spots) expect(spotAt(street, spot.x + spot.w / 2, spot.y + spot.h / 2)?.id).toBe(spot.id);
  });

  it('keeps tap areas from overlapping too much', () => {
    for (const a of street.spots)
      for (const b of street.spots) {
        if (a === b) continue;
        const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
        const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        expect(ox * oy, `${a.id} / ${b.id}`).toBeLessThan(0.25 * Math.min(a.w * a.h, b.w * b.h));
      }
  });
});

describe('chapter 1 cases', () => {
  const seeds = Array.from({ length: 150 }, (_, i) => `seed-${i}`);
  const plans = (def: (typeof CHAPTER_1)[number]) => [3, 5].flatMap((n) => seeds.map((seed) => planCase(def, street, seed, n)));

  it.each(CHAPTER_1.map((c) => [c.id, c] as const))('%s: every planned clue is true and unambiguous', (_, def) => {
    for (const plan of plans(def))
      for (const s of plan.suspects)
        for (const step of [s.first, s.move]) {
          if (!step) continue;
          expect(isUnambiguous(step.clue, step.target, street)).toBe(true);
          for (const p of teaches(step.clue)) expect(MODELLED).toContain(p);
        }
  });

  it.each(CHAPTER_1.map((c) => [c.id, c] as const))('%s: a gang of 3 or 5, each in a different place, spread along the street', (_, def) => {
    for (const plan of plans(def)) {
      const firsts = plan.suspects.map((s) => s.first.target);
      expect([3, 5]).toContain(firsts.length);
      expect(new Set(firsts.map((t) => t.id)).size).toBe(firsts.length);
      const xs = firsts.map((t) => t.footX);
      // A case set in the square keeps its new places close; a gang of 5 still spills out along the street.
      const spread = Math.max(...xs) - Math.min(...xs);
      if (!def.together) expect(spread, def.id).toBeGreaterThan(1500);
      else if (firsts.length === 5) expect(spread, def.id).toBeGreaterThan(700);
      const boss = plan.suspects.at(-1)!;
      if (def.boss) {
        expect(boss.boss).toBe(true);
        expect(firsts).not.toContain(boss.move!.target);
      }
    }
  });

  it('the new preposition comes first: review only fills a gang the new one cannot', () => {
    for (const def of CHAPTER_1.filter((d) => !d.boss))
      for (const plan of plans(def)) {
        const own = plan.suspects.filter((s) => teaches(s.first.clue).some((p) => def.preps.includes(p))).length;
        const quals = QUALIFIERS.filter((q) => def.preps.includes(q) || CHAPTER_1.some((c) => c.number < def.number && c.preps.includes(q)));
        const room = new Set(street.spots.filter((sp) => cluesFor(sp, street, def.preps, quals).length > 0).map((sp) => sp.id)).size;
        expect(own, def.id).toBe(Math.min(plan.suspects.length, room));
      }
  });

  it('the reader, hearing only the French, always finds the one right spot', () => {
    for (const def of CHAPTER_1)
      for (const plan of plans(def))
        for (const s of plan.suspects) {
          const sentence = sentenceFr(s.subject, s.first.clue);
          expect(spotsFromSentence(sentence, street).map((x) => x.id), sentence).toEqual([s.first.target.id]);
          if (s.move) expect(spotsFromSentence(sentenceFr(s.pronoun, s.move.clue), street).map((x) => x.id)).toEqual([s.move.target.id]);
        }
  });

  it('replays vary the hiding spots', () => {
    for (const def of CHAPTER_1) {
      const targets = new Set(seeds.map((s) => planCase(def, street, s, 3).suspects[0]!.first.target.id));
      expect(targets.size, def.id).toBeGreaterThan(2);
    }
  });

  it('entre works either way round, and only for places side by side', () => {
    const gap = street.spots.find((sp) => sp.id === 'gap.post_office.town_hall')!;
    expect(isUnambiguous({ prep: 'entre', ref: 'post_office', ref2: 'town_hall' }, gap, street)).toBe(true);
    expect(isUnambiguous({ prep: 'entre', ref: 'town_hall', ref2: 'post_office' }, gap, street)).toBe(true);
    expect(cluesFor(gap, street, ['entre']).length).toBe(1);
    expect(matches({ prep: 'entre', ref: 'police_station', ref2: 'town_hall' }, street)).toEqual([]);
  });

  it('à côté is only used for street things (a place has two sides)', () => {
    for (const sp of street.spots) for (const c of cluesFor(sp, street, ['a_cote'], ['pres', 'loin'])) expect(street.landmarks.find((l) => l.thing === c.ref)?.kind).toBe('prop');
  });

  it('près de / loin de pick one of two look-alikes, and only then', () => {
    const near = { prep: 'sous', ref: 'bench', near: { prep: 'pres', ref: 'police_station' } } as const;
    expect(matches(near, street).map((x) => x.id)).toEqual(['bench_2.under']);
    expect(matches({ ...near, near: { prep: 'loin', ref: 'police_station' } }, street).map((x) => x.id)).toEqual(['bench.under']);
    expect(phraseFr(near)).toBe('sous le banc près du commissariat de police');
    expect(sentenceEn(SUBJECTS.suspect, near)).toBe('The suspect is under the bench near the police station.');
    // The kiosk is one of a kind: "près de" would be padding.
    expect(matches({ prep: 'derriere', ref: 'kiosk', near: { prep: 'pres', ref: 'bank' } }, street)).toEqual([]);
    // Halfway between the two bins, neither is clearly nearer.
    expect(matches({ prep: 'derriere', ref: 'bin', near: { prep: 'pres', ref: 'square' } }, street)).toEqual([]);
  });

  it('the square: three people in it are all "sur la place", so the clue says where in it', () => {
    expect(matches({ prep: 'sur', ref: 'square' }, street)).toHaveLength(3);
    expect(matches({ prep: 'au_milieu', ref: 'square' }, street).map((x) => x.id)).toEqual(['square.open']);
    expect(matches({ prep: 'au_fond', ref: 'square' }, street).map((x) => x.id)).toEqual(['square.back']);
    expect(matches({ prep: 'au_bord', ref: 'fountain' }, street).map((x) => x.id)).toEqual(['fountain.edge']);
    expect(phraseFr({ prep: 'au_bord', ref: 'fountain' })).toBe('au bord de la fontaine');
    expect(phraseFr({ prep: 'au_fond', ref: 'square' })).toBe('au fond de la place');
  });

  it('en face de is across the road, devant is this side', () => {
    expect(matches({ prep: 'en_face', ref: 'bank' }, street).map((x) => x.id)).toEqual(['bank.opposite']);
    expect(matches({ prep: 'devant', ref: 'bank' }, street).map((x) => x.id)).toEqual(['bank.front']);
  });

  it.each([
    [4, ['entre', 'a_cote']],
    [5, ['a_gauche', 'a_droite', 'au_bout']],
    [6, ['en_face']],
    [7, ['pres', 'loin', 'contre']],
    [8, ['au_milieu', 'au_bord', 'au_fond']],
  ] as const)('case %i uses each of its new prepositions', (i, want) => {
    const preps = new Set(seeds.flatMap((s) => planCase(CHAPTER_1[i]!, street, s, 5).suspects.flatMap((x) => teaches(x.first.clue))));
    for (const p of want) expect(preps.has(p), p).toBe(true);
  });

  it('case 4 uses both sous and derrière', () => {
    const preps = new Set(seeds.flatMap((s) => planCase(CHAPTER_1[3]!, street, s, 3).suspects.map((x) => x.first.clue.prep)));
    expect(preps.has('sous') && preps.has('derriere')).toBe(true);
  });
});
