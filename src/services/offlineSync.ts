import { MatchState, PointRecord } from '../types/tennis';
import {
  appendPointToSheet,
  getSheetsWebhookUrl,
  updateMatchSummarySheet,
} from './googleSheets';

const QUEUE_STORAGE_KEY = 'tennispro_offline_queue_v1';
const CURRENT_MATCH_KEY = 'tennispro_saved_match_v1';
const MATCH_HISTORY_KEY = 'tennispro_match_history_v1';
const SYNCED_POINTS_KEY = 'tennispro_synced_point_ids_v1';

export interface QueuedPointItem {
  webhookUrl: string;
  point: PointRecord;
  matchSnapshot: MatchState;
  queuedAt: number;
}

class OfflineSyncManager {
  private queue: QueuedPointItem[] = [];
  private syncedPointIds: Set<string> = new Set();
  private isSyncing = false;
  private listeners: Array<() => void> = [];
  private lastSuccessfulSyncTime: number | null = null;

  constructor() {
    this.loadQueue();
    this.loadSyncedPointIds();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });

      // Background periodic sync watcher (every 10s)
      setInterval(() => {
        if (navigator.onLine && this.queue.length > 0 && !this.isSyncing) {
          this.processQueue();
        }
      }, 10000);
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Only retain valid webhook URL entries (migrating away from legacy spreadsheetId queue items)
          this.queue = parsed.filter(
            (item) => typeof item?.webhookUrl === 'string' && item.webhookUrl.startsWith('http')
          );
        }
      }
    } catch (e) {
      console.warn('Failed to load offline queue:', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch (e) {
      console.warn('Failed to save offline queue:', e);
    }
  }

  private loadSyncedPointIds() {
    try {
      const saved = localStorage.getItem(SYNCED_POINTS_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        this.syncedPointIds = new Set(arr);
      }
    } catch (e) {
      console.warn('Failed to load synced point ids:', e);
      this.syncedPointIds = new Set();
    }
  }

  private saveSyncedPointIds() {
    try {
      // Keep only last 2000 points to prevent storage bloat
      const arr = Array.from(this.syncedPointIds).slice(-2000);
      localStorage.setItem(SYNCED_POINTS_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Failed to save synced point ids:', e);
    }
  }

  public clearSyncedPointIds() {
    this.syncedPointIds.clear();
    try {
      localStorage.removeItem(SYNCED_POINTS_KEY);
    } catch {}
  }

  public isPointSynced(pointId: string): boolean {
    return this.syncedPointIds.has(pointId);
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTime(): number | null {
    return this.lastSuccessfulSyncTime;
  }

  /**
   * Save match state locally for instant offline recovery and record into history
   */
  public saveMatchLocally(match: MatchState) {
    try {
      localStorage.setItem(CURRENT_MATCH_KEY, JSON.stringify(match));
      if (match.pointsHistory.length > 0 || match.isFinished) {
        this.saveMatchToHistory(match);
      }
    } catch (e) {
      console.warn('Failed to cache match locally', e);
    }
  }

  public getLocallySavedMatch(): MatchState | null {
    try {
      const data = localStorage.getItem(CURRENT_MATCH_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public clearLocallySavedMatch() {
    try {
      localStorage.removeItem(CURRENT_MATCH_KEY);
    } catch {}
  }

  /**
   * Get all locally stored match history records (sorted newest first)
   */
  public getMatchHistory(): MatchState[] {
    try {
      const raw = localStorage.getItem(MATCH_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MatchState[];
      return Array.isArray(parsed)
        ? parsed.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
        : [];
    } catch {
      return [];
    }
  }

  /**
   * Upsert a match into local match history (retains last 100 matches, stripped of redo stack to save quota)
   */
  public saveMatchToHistory(match: MatchState) {
    try {
      const list = this.getMatchHistory();
      const compactMatch: MatchState = {
        ...match,
        redoStack: undefined,
        updatedAt: match.updatedAt || Date.now(),
      };
      const idx = list.findIndex((m) => m.id === match.id);
      if (idx >= 0) {
        list[idx] = compactMatch;
      } else {
        list.unshift(compactMatch);
      }
      const trimmed = list
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
        .slice(0, 100);
      localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save match to history:', e);
    }
  }

  /**
   * Remove a match from local match history
   */
  public deleteMatchFromHistory(matchId: string) {
    try {
      const list = this.getMatchHistory().filter((m) => m.id !== matchId);
      localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to delete match from history:', e);
    }
  }

  /**
   * Enqueue a point to be synced or sync immediately via login-free Google Sheets webhook
   */
  public async queuePoint(webhookUrl: string, point: PointRecord, match: MatchState) {
    this.saveMatchLocally(match);

    if (!webhookUrl) return;

    // If completely offline, enqueue for automatic retry
    if (!navigator.onLine) {
      this.queue.push({
        webhookUrl,
        point,
        matchSnapshot: match,
        queuedAt: Date.now(),
      });
      this.saveQueue();
      return;
    }

    // Attempt live sync with idempotency check (appendPointToSheet updates all 3 tabs in one request)
    try {
      if (!this.syncedPointIds.has(point.id)) {
        await appendPointToSheet(webhookUrl, point, match);
        this.syncedPointIds.add(point.id);
        this.saveSyncedPointIds();
      } else {
        await updateMatchSummarySheet(webhookUrl, match);
      }
      this.lastSuccessfulSyncTime = Date.now();
      this.notify();
    } catch (err) {
      console.warn('Live sync failed or partial, adding to offline retry queue:', err);
      this.queue.push({
        webhookUrl,
        point,
        matchSnapshot: match,
        queuedAt: Date.now(),
      });
      this.saveQueue();
    }
  }

  /**
   * Process all queued items when online (idempotent, never duplicates points)
   */
  public async processQueue(): Promise<boolean> {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return false;
    }

    this.isSyncing = true;
    this.notify();

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        const targetUrl = item.webhookUrl || getSheetsWebhookUrl();

        if (!targetUrl) {
          this.queue.shift();
          this.saveQueue();
          continue;
        }

        if (!this.syncedPointIds.has(item.point.id)) {
          await appendPointToSheet(targetUrl, item.point, item.matchSnapshot);
          this.syncedPointIds.add(item.point.id);
          this.saveSyncedPointIds();
        }

        this.queue.shift();
        this.saveQueue();
      }

      const savedMatch = this.getLocallySavedMatch();
      const targetWebhookUrl = getSheetsWebhookUrl();
      if (savedMatch && targetWebhookUrl) {
        await updateMatchSummarySheet(targetWebhookUrl, savedMatch);
      }
      this.lastSuccessfulSyncTime = Date.now();
      return true;
    } catch (err) {
      console.error('Queue processing halted due to error:', err);
      return false;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const offlineSync = new OfflineSyncManager();
