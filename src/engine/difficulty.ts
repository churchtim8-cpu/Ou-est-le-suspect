/**
 * Every tunable number lives here, never inline in game code. Starting values
 * for Mr Henry's play-test of the sample (2026-10-22); Hard and Expert follow
 * once the French is recorded, since they hide the written clue.
 */

export type LevelId = 'easy' | 'medium';

export interface Level {
  id: LevelId;
  label: string;
  /** How many suspects hide in each case (Mr Henry 2026-10-23: "three or five suspects"). */
  suspects: number;
  /** Seconds on the case clock for each suspect; when it runs out the rest escape. */
  secondsPerSuspect: number;
  /** The written clue stays on screen (Easy) or fades after this many seconds (Medium). */
  clueSeconds: number | null;
  /** Times the clue can be shown again; null = as often as you like. */
  repeats: number | null;
  /** English help button (Easy only, Mr Henry 2026-10-22). */
  englishHelp: boolean;
  /** Seconds lost for tapping the wrong spot. */
  wrongTapSeconds: number;
}

export const LEVELS: Record<LevelId, Level> = {
  easy: { id: 'easy', label: 'Easy', suspects: 3, secondsPerSuspect: 45, clueSeconds: null, repeats: null, englishHelp: true, wrongTapSeconds: 4 },
  medium: { id: 'medium', label: 'Medium', suspects: 5, secondsPerSuspect: 36, clueSeconds: 8, repeats: 3, englishHelp: false, wrongTapSeconds: 6 },
};

export const SCORING = {
  /** Points for each suspect caught. */
  perCatch: 300,
  perSecondLeft: 8,
  perWrongTap: 100,
  perEnglishHelp: 100,
  perRepeat: 40,
  minimum: 100,
  /** Two stars: the whole gang caught with at most this many wrong taps (three stars: none, and no English). */
  twoStarWrong: 2,
} as const;

export const GANG = {
  /** Suspects hide at least this far apart along the street when they can (world px; the street is ~6800). */
  spreadPx: 700,
} as const;

export const TWISTS = {
  /** "Attention, elle bouge !": the boss moves this many seconds after the clue (or at her first near miss). */
  moveAfterSeconds: 14,
} as const;
