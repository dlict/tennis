/**
 * Player Roster utility to manage, persist, and retrieve custom player names
 * Stored in browser localStorage under 'tennispro_saved_roster'
 * 
 * STRICT POLICY:
 * - NO fake / starter / dummy names (Federer, Nadal, Djokovic, Alcaraz, Sinner, etc.)
 * - Roster starts completely EMPTY ([])
 * - User has full control to Add (+ เพิ่ม) and Delete (ลบ) names themselves
 */

const ROSTER_STORAGE_KEY = 'tennispro_saved_roster';
const ROSTER_DELETED_KEY = 'tennispro_deleted_roster';

// Mock/starter names and generic placeholders that must NEVER be saved or shown as saved players
export const FORBIDDEN_MOCK_NAMES = new Set([
  'federer',
  'nadal',
  'djokovic',
  'alcaraz',
  'sinner',
  'player 1',
  'player 2',
  'partner 1',
  'partner 2',
  'ผู้เล่น 1',
  'ผู้เล่น 2',
  'คู่หู 1',
  'คู่หู 2',
  'ทีม 1',
  'ทีม 2',
  'นักกีฬา 1',
  'นักกีฬา 2',
  'ภราดร',
  'ดนัย',
  'แทมมารีน',
  'ลักษิกา',
]);

/**
 * Check if a name is a forbidden mock/placeholder name
 */
export function isForbiddenName(name: string): boolean {
  if (!name) return true;
  return FORBIDDEN_MOCK_NAMES.has(name.trim().toLowerCase());
}

/**
 * Get the set of names explicitly deleted by the user so they are NEVER resurrected
 */
function getDeletedBlacklist(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(ROSTER_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((s) => String(s).trim().toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

/**
 * Add a name to the deleted blacklist
 */
function addToDeletedBlacklist(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return;
  try {
    const blacklist = getDeletedBlacklist();
    blacklist.add(trimmed);
    localStorage.setItem(ROSTER_DELETED_KEY, JSON.stringify(Array.from(blacklist)));
  } catch (e) {
    console.error('Failed to blacklist deleted player:', e);
  }
}

/**
 * Remove a name from the deleted blacklist (e.g. when user manually re-adds it)
 */
function removeFromDeletedBlacklist(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim().toLowerCase();
  try {
    const blacklist = getDeletedBlacklist();
    if (blacklist.has(trimmed)) {
      blacklist.delete(trimmed);
      localStorage.setItem(ROSTER_DELETED_KEY, JSON.stringify(Array.from(blacklist)));
    }
  } catch (e) {
    console.error('Failed to update blacklist:', e);
  }
}

/**
 * Load saved roster from browser localStorage.
 * Automatically purges any mock/starter names if they were previously stored.
 * Starts completely EMPTY ([]) for new users.
 */
export function getSavedPlayerRoster(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    const blacklist = getDeletedBlacklist();

    // Sanitize: filter out mock names, deleted names, empty strings, and duplicates
    const seen = new Set<string>();
    const sanitized: string[] = [];

    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const clean = item.trim();
      const lower = clean.toLowerCase();
      if (!clean) continue;
      if (FORBIDDEN_MOCK_NAMES.has(lower)) continue;
      if (blacklist.has(lower)) continue;
      if (seen.has(lower)) continue;

      seen.add(lower);
      sanitized.push(clean);
    }

    // If any mock or invalid names were filtered out, re-save the pristine list
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch {
    return [];
  }
}

/**
 * Explicitly add a new player name to the roster (user-driven action)
 */
export function addPlayerToRoster(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed || isForbiddenName(trimmed)) {
    return getSavedPlayerRoster();
  }

  // If user deliberately adds this name, un-blacklist it
  removeFromDeletedBlacklist(trimmed);

  try {
    const current = getSavedPlayerRoster();
    const existingIndex = current.findIndex((p) => p.toLowerCase() === trimmed.toLowerCase());
    let updated: string[];

    if (existingIndex >= 0) {
      // Move to top
      updated = [trimmed, ...current.filter((_, idx) => idx !== existingIndex)];
    } else {
      updated = [trimmed, ...current];
    }

    // Keep up to 50 players
    const limited = updated.slice(0, 50);
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(limited));
    return limited;
  } catch (e) {
    console.error('Failed to add player to roster:', e);
    return getSavedPlayerRoster();
  }
}

/**
 * Save multiple player names to roster (only if they are valid non-mock names)
 */
export function saveMultiplePlayersToRoster(names: (string | undefined | null)[]): void {
  try {
    let current = getSavedPlayerRoster();
    const blacklist = getDeletedBlacklist();
    let modified = false;

    names.forEach((name) => {
      const trimmed = name?.trim();
      if (!trimmed || isForbiddenName(trimmed)) return;
      const lower = trimmed.toLowerCase();
      if (blacklist.has(lower)) return;

      if (!current.some((p) => p.toLowerCase() === lower)) {
        current = [trimmed, ...current];
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(current.slice(0, 50)));
    }
  } catch (e) {
    console.error('Failed to save players to roster:', e);
  }
}

/**
 * Permanently remove a player name from the roster.
 * Adds to blacklist so it will NEVER reappear automatically.
 */
export function removePlayerFromRoster(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getSavedPlayerRoster();

  try {
    addToDeletedBlacklist(trimmed);
    const current = getSavedPlayerRoster();
    const updated = current.filter((p) => p.toLowerCase() !== trimmed.toLowerCase());
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Permanently clear ALL saved player names from the roster
 */
export function clearAllSavedRoster(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getSavedPlayerRoster();
    current.forEach((name) => addToDeletedBlacklist(name));
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch {
    return [];
  }
}
