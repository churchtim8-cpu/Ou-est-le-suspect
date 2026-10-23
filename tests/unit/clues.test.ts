import { describe, expect, it } from 'vitest';
import { buildCentreVille } from '../../src/content/centreVille';
import { CHAPTER_1, planCase } from '../../src/engine/cases';
import { cluesFor, isUnambiguous, MODELLED, phraseFr, sentenceEn, sentenceFr, SUBJECTS } from '../../src/engine/clues';
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
          expect(MODELLED).toContain(step.clue.prep);
        }
  });

  it.each(CHAPTER_1.map((c) => [c.id, c] as const))('%s: a gang of 3 or 5, each in a different place, spread along the street', (_, def) => {
    for (const plan of plans(def)) {
      const firsts = plan.suspects.map((s) => s.first.target);
      expect([3, 5]).toContain(firsts.length);
      expect(new Set(firsts.map((t) => t.id)).size).toBe(firsts.length);
      const xs = firsts.map((t) => t.footX);
      expect(Math.max(...xs) - Math.min(...xs), def.id).toBeGreaterThan(1500);
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
        const own = plan.suspects.filter((s) => def.preps.includes(s.first.clue.prep)).length;
        const room = new Set(street.spots.filter((sp) => cluesFor(sp, street, def.preps).length > 0).map((sp) => sp.id)).size;
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

  it('case 4 uses both sous and derrière', () => {
    const preps = new Set(seeds.flatMap((s) => planCase(CHAPTER_1[3]!, street, s, 3).suspects.map((x) => x.first.clue.prep)));
    expect(preps.has('sous') && preps.has('derriere')).toBe(true);
  });
});
