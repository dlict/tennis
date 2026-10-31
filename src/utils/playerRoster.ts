/**
 * Player Roster utility to persist and retrieve player names across sessions
 */

const ROSTER_STORAGE_KEY = 'tennispro_saved_roster';

const DEFAULT_PLAYERS = [
  'ภราดร',
  'ดนัย',
  'ลักษิกา',
  'แทมมารีน',
  'Federer',
  'Nadal',
  'Djokovic',
  'Alcaraz',
  'Sinner',
  'นักกีฬา 1',
  'นักกีฬา 2',
];

export function getSavedPlayerRoster(): string[] {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(DEFAULT_PLAYERS));
      return DEFAULT_PLAYERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PLAYERS;
  } catch {
    return DEFAULT_PLAYERS;
  }
}

export function savePlayerToRoster(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return;

  try {
    const current = getSavedPlayerRoster();
    if (!current.includes(trimmed)) {
      const updated = [trimmed, ...current.slice(0, 24)]; // Keep top 25 recent players
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save player to roster:', e);
  }
}

export function saveMultiplePlayersToRoster(names: (string | undefined | null)[]): void {
  try {
    let current = getSavedPlayerRoster();
    names.forEach((name) => {
      const trimmed = name?.trim();
      if (trimmed && trimmed.length >= 2 && !current.includes(trimmed)) {
        current = [trimmed, ...current];
      }
    });
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(current.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save players to roster:', e);
  }
}

export function removePlayerFromRoster(name: string): string[] {
  try {
    const current = getSavedPlayerRoster();
    const updated = current.filter((p) => p !== name);
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return getSavedPlayerRoster();
  }
}
