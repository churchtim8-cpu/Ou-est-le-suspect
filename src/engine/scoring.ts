import { SCORING } from './difficulty';

export interface CaseResult {
  /** Suspects caught, out of `suspects`. */
  caught: number;
  suspects: number;
  secondsUsed: number;
  secondsLeft: number;
  wrongTaps: number;
  englishHelps: number;
  repeats: number;
}

export function points(r: CaseResult): number {
  if (r.caught === 0) return 0;
  const raw =
    r.caught * SCORING.perCatch +
    Math.round(r.secondsLeft) * SCORING.perSecondLeft -
    r.wrongTaps * SCORING.perWrongTap -
    r.englishHelps * SCORING.perEnglishHelp -
    r.repeats * SCORING.perRepeat;
  return Math.max(SCORING.minimum, raw);
}

export function stars(r: CaseResult): 0 | 1 | 2 | 3 {
  if (r.caught < r.suspects) return 0;
  if (r.wrongTaps === 0 && r.englishHelps === 0) return 3;
  if (r.wrongTaps <= SCORING.twoStarWrong) return 2;
  return 1;
}

/** Saved progress on this device: best stars and points per case. */
export interface Profile {
  version: 1;
  best: Record<string, { stars: number; points: number }>;
}

export const EMPTY_PROFILE: Profile = { version: 1, best: {} };

export function parseProfile(text: string | null): Profile {
  if (!text) return { ...EMPTY_PROFILE, best: {} };
  try {
    const data = JSON.parse(text) as Partial<Profile>;
    const best: Profile['best'] = {};
    for (const [id, v] of Object.entries(data.best ?? {})) {
      if (v && Number.isFinite(v.stars) && Number.isFinite(v.points)) best[id] = { stars: Math.min(3, Math.max(0, v.stars)), points: Math.max(0, v.points) };
    }
    return { version: 1, best };
  } catch {
    return { ...EMPTY_PROFILE, best: {} };
  }
}

export function record(profile: Profile, caseId: string, r: CaseResult): Profile {
  const old = profile.best[caseId] ?? { stars: 0, points: 0 };
  return {
    ...profile,
    best: { ...profile.best, [caseId]: { stars: Math.max(old.stars, stars(r)), points: Math.max(old.points, points(r)) } },
  };
}

/** A case opens once the one before it has been solved (the whole gang caught: at least one star). */
export function isOpen(profile: Profile, order: readonly string[], caseId: string): boolean {
  const i = order.indexOf(caseId);
  if (i <= 0) return true;
  const before = order[i - 1];
  return before !== undefined && (profile.best[before]?.stars ?? 0) > 0;
}
