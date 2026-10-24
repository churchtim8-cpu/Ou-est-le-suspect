import type { LevelId } from '../engine/difficulty';
import { parseProfile, record, type CaseResult, type Profile } from '../engine/scoring';

/** Progress and settings saved on this device (no accounts, nothing leaves the computer). */

const PROFILE_KEY = 'suspect.profile';
const LEVEL_KEY = 'suspect.level';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private window: progress lasts for this visit only */
  }
}

let profile: Profile = parseProfile(read(PROFILE_KEY));

export function getProfile(): Profile {
  return profile;
}

export function saveResult(caseId: string, r: CaseResult): Profile {
  profile = record(profile, caseId, r);
  write(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function getLevel(): LevelId {
  const v = new URLSearchParams(window.location.search).get('level') ?? read(LEVEL_KEY);
  return v === 'medium' || v === 'hard' ? v : 'easy';
}

export function setLevel(level: LevelId): void {
  write(LEVEL_KEY, level);
}
