/**
 * Every tunable number lives here, never inline in game code. Starting values
 * for Mr Henry's play-test of the sample (2026-10-22); Hard and Expert follow
 * once the French is recorded, since they hide the written clue.
 */

export type LevelId = 'easy' | 'medium';

export interface Level {
  id: LevelId;
  label: string;
  /** Seconds before the suspect escapes. */
  seconds: number;
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
  easy: { id: 'easy', label: 'Easy', seconds: 90, clueSeconds: null, repeats: null, englishHelp: true, wrongTapSeconds: 4 },
  medium: { id: 'medium', label: 'Medium', seconds: 75, clueSeconds: 8, repeats: 3, englishHelp: false, wrongTapSeconds: 6 },
};

export const SCORING = {
  base: 500,
  perSecondLeft: 8,
  perWrongTap: 100,
  perEnglishHelp: 100,
  perRepeat: 40,
  minimum: 100,
  /** Three stars: no wrong tap and found within this many seconds. */
  threeStarSeconds: 30,
  /** Two stars: at most this many wrong taps. */
  twoStarWrong: 1,
} as const;

export const TWISTS = {
  /** "Attention, elle bouge !": the boss moves this many seconds after the clue (or at her first near miss). */
  moveAfterSeconds: 14,
} as const;
