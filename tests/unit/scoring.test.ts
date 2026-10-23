import { describe, expect, it } from 'vitest';
import { EMPTY_PROFILE, isOpen, parseProfile, points, record, stars, type CaseResult } from '../../src/engine/scoring';

const fast: CaseResult = { caught: 3, suspects: 3, secondsUsed: 40, secondsLeft: 78, wrongTaps: 0, englishHelps: 0, repeats: 0 };

describe('scoring', () => {
  it('gives three stars for the whole gang, no wrong tap, no English', () => expect(stars(fast)).toBe(3));
  it('gives two stars with up to two wrong taps', () => expect(stars({ ...fast, wrongTaps: 2 })).toBe(2));
  it('gives one star with more wrong taps', () => expect(stars({ ...fast, wrongTaps: 3 })).toBe(1));
  it('English help costs the third star', () => expect(stars({ ...fast, englishHelps: 1 })).toBe(2));
  it('no stars unless the whole gang is caught, but each catch still scores', () => {
    expect(stars({ ...fast, caught: 2 })).toBe(0);
    expect(points({ ...fast, caught: 2 })).toBeGreaterThan(0);
    expect(points({ ...fast, caught: 0 })).toBe(0);
  });
  it('never scores a catch below the minimum', () => expect(points({ ...fast, secondsLeft: 0, wrongTaps: 20 })).toBe(100));

  it('keeps the best result and opens the next case', () => {
    let p = record(EMPTY_PROFILE, 'c1-1', { ...fast, wrongTaps: 3 });
    p = record(p, 'c1-1', fast);
    p = record(p, 'c1-1', { ...fast, caught: 1 });
    expect(p.best['c1-1']?.stars).toBe(3);
    expect(isOpen(p, ['c1-1', 'c1-2', 'c1-3'], 'c1-2')).toBe(true);
    expect(isOpen(p, ['c1-1', 'c1-2', 'c1-3'], 'c1-3')).toBe(false);
  });

  it('survives a broken save', () => expect(parseProfile('{oops')).toEqual(EMPTY_PROFILE));
});
