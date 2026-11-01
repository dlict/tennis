/**
 * Player Roster utility to persist and retrieve player names across sessions
 * Stored in browser localStorage under 'tennispro_saved_roster'
 */

const ROSTER_STORAGE_KEY = 'tennispro_saved_roster';
const ROSTER_DELETED_KEY = 'tennispro_deleted_roster';
const ROSTER_INITIALIZED_KEY = 'tennispro_roster_init';

// Initial starter names for fresh installs only (never resurrected once deleted)
const INITIAL_STARTER_PLAYERS = [
  'Federer',
  'Nadal',
  'Djokovic',
  'Alcaraz',
  'Sinner',
];

const IGNORED_GENERIC_NAMES = new Set([
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
]);

/**
 * Get the set of names explicitly deleted by the user so they are NEVER resurrected
 */
function getDeletedBlacklist(): Set<string> {
  try {
    const raw = localStorage.getItem(ROSTER_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Add a name to the deleted blacklist
 */
function addToDeletedBlacklist(name: string): void {
  try {
    const blacklist = getDeletedBlacklist();
    blacklist.add(name.trim());
    localStorage.setItem(ROSTER_DELETED_KEY, JSON.stringify(Array.from(blacklist)));
  } catch (e) {
    console.error('Failed to blacklist deleted player:', e);
  }
}

/**
 * Load saved roster from browser localStorage.
 * If user cleared/deleted names, it stays empty and NEVER reverts to defaults.
 */
export function getSavedPlayerRoster(): string[] {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    const hasBeenInitialized = localStorage.getItem(ROSTER_INITIALIZED_KEY) === 'true';

    // First time EVER running the app
    if (raw === null && !hasBeenInitialized) {
      localStorage.setItem(ROSTER_INITIALIZED_KEY, 'true');
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(INITIAL_STARTER_PLAYERS));
      return INITIAL_STARTER_PLAYERS;
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const blacklist = getDeletedBlacklist();
      // Filter out any blacklisted names that might linger
      return parsed.filter((name) => typeof name === 'string' && !blacklist.has(name.trim()));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save a single player name to roster (persists in localStorage)
 */
export function savePlayerToRoster(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return;
  if (IGNORED_GENERIC_NAMES.has(trimmed.toLowerCase())) return;

  const blacklist = getDeletedBlacklist();
  if (blacklist.has(trimmed)) return; // User explicitly deleted this name!

  try {
    const current = getSavedPlayerRoster();
    if (!current.includes(trimmed)) {
      const updated = [trimmed, ...current.slice(0, 30)];
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(ROSTER_INITIALIZED_KEY, 'true');
    }
  } catch (e) {
    console.error('Failed to save player to roster:', e);
  }
}

/**
 * Save multiple player names to roster
 */
export function saveMultiplePlayersToRoster(names: (string | undefined | null)[]): void {
  try {
    let current = getSavedPlayerRoster();
    const blacklist = getDeletedBlacklist();

    names.forEach((name) => {
      const trimmed = name?.trim();
      if (
        trimmed &&
        trimmed.length >= 2 &&
        !IGNORED_GENERIC_NAMES.has(trimmed.toLowerCase()) &&
        !blacklist.has(trimmed) &&
        !current.includes(trimmed)
      ) {
        current = [trimmed, ...current];
      }
    });

    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(current.slice(0, 30)));
    localStorage.setItem(ROSTER_INITIALIZED_KEY, 'true');
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
  try {
    addToDeletedBlacklist(trimmed);
    const current = getSavedPlayerRoster();
    const updated = current.filter((p) => p !== trimmed);
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(ROSTER_INITIALIZED_KEY, 'true');
    return updated;
  } catch {
    return [];
  }
}

/**
 * Permanently clear ALL saved player names from the roster
 */
export function clearAllSavedRoster(): string[] {
  try {
    const current = getSavedPlayerRoster();
    current.forEach((name) => addToDeletedBlacklist(name));
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(ROSTER_INITIALIZED_KEY, 'true');
    return [];
  } catch {
    return [];
  }
}
