import { MatchState, PointRecord } from '../types/tennis';
import { appendPointToSheet, updateMatchSummarySheet } from './googleSheets';

const QUEUE_STORAGE_KEY = 'tennispro_offline_queue_v1';
const CURRENT_MATCH_KEY = 'tennispro_saved_match_v1';

export interface QueuedPointItem {
  spreadsheetId: string;
  point: PointRecord;
  matchSnapshot: MatchState;
  queuedAt: number;
}

class OfflineSyncManager {
  private queue: QueuedPointItem[] = [];
  private isSyncing = false;
  private listeners: Array<() => void> = [];
  private lastSuccessfulSyncTime: number | null = null;

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network online detected. Triggering queue auto-sync...');
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
        this.queue = JSON.parse(saved);
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
   * Save match state locally for instant offline recovery
   */
  public saveMatchLocally(match: MatchState) {
    try {
      localStorage.setItem(CURRENT_MATCH_KEY, JSON.stringify(match));
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
   * Enqueue a point to be synced or sync immediately if online
   */
  public async queuePoint(spreadsheetId: string, point: PointRecord, match: MatchState) {
    this.saveMatchLocally(match);

    // If completely offline or already syncing items, enqueue
    if (!navigator.onLine) {
      this.queue.push({
        spreadsheetId,
        point,
        matchSnapshot: match,
        queuedAt: Date.now(),
      });
      this.saveQueue();
      return;
    }

    // Attempt live sync
    try {
      await appendPointToSheet(spreadsheetId, point, match);
      await updateMatchSummarySheet(spreadsheetId, match);
      this.lastSuccessfulSyncTime = Date.now();
      this.notify();
    } catch (err) {
      console.warn('Live sync failed, adding to offline retry queue:', err);
      this.queue.push({
        spreadsheetId,
        point,
        matchSnapshot: match,
        queuedAt: Date.now(),
      });
      this.saveQueue();
    }
  }

  /**
   * Process all queued items when online
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
        await appendPointToSheet(item.spreadsheetId, item.point, item.matchSnapshot);
        // Remove item once succeeded
        this.queue.shift();
        this.saveQueue();
      }

      // Final summary sync of latest state
      const savedMatch = this.getLocallySavedMatch();
      const targetSheetId = localStorage.getItem('tennispro_active_sheet_id');
      if (savedMatch && targetSheetId) {
        await updateMatchSummarySheet(targetSheetId, savedMatch);
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
