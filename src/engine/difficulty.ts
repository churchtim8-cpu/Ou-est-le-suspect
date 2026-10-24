/**
 * Every tunable number lives here, never inline in game code. Starting values
 * for Mr Henry's play-test of the sample (2026-10-22); Hard and Expert follow
 * once the French is recorded, since they hide the written clue.
 */

export type LevelId = 'easy' | 'medium' | 'hard';

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
  /** Hard: some clues use the CSEC stretch wording (à l'intérieur de, à l'extérieur de, au-dessous de). */
  stretch: boolean;
}

export const LEVELS: Record<LevelId, Level> = {
  easy: { id: 'easy', label: 'Easy', suspects: 3, secondsPerSuspect: 45, clueSeconds: null, repeats: null, englishHelp: true, wrongTapSeconds: 4, stretch: false },
  medium: { id: 'medium', label: 'Medium', suspects: 5, secondsPerSuspect: 36, clueSeconds: 8, repeats: 3, englishHelp: false, wrongTapSeconds: 6, stretch: false },
  hard: { id: 'hard', label: 'Hard', suspects: 5, secondsPerSuspect: 32, clueSeconds: 6, repeats: 2, englishHelp: false, wrongTapSeconds: 8, stretch: true },
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

export const NEAR_FAR = {
  /** "Près de la poste": the thing is at most this far from the place (world px, centre to centre)… */
  nearPx: 700,
  /** …and the other one is at least this many times further. "Loin de" is the same, the other way round. */
  ratio: 2,
} as const;

export const STRETCH = {
  /** On Hard, the share of clues that switch to their stretch wording. */
  share: 0.5,
} as const;

export const TWISTS = {
  /** "Attention, elle bouge !": the boss moves this many seconds after the clue (or at her first near miss). */
  moveAfterSeconds: 14,
} as const;
