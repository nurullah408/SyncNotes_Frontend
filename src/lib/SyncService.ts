import { db, skipChangeTracking, resumeChangeTracking, setChangeHandler } from "@/db/syncNotesDb";
import { BASE_URL } from "@/constants";
import { apiClient } from "@/lib/api-client";
import { LOCAL_STORAGE_SYNC_KEY } from "@/lib/constants";
import type { SyncChangesResponse } from "@/types/response/SyncChangesResponse";
import type { ChangeRecord } from "@/types/entities/ChangeRecord";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStatus = "idle" | "syncing" | "error";
export type SyncStatusListener = (status: SyncStatus) => void;

const SYNC_INTERVAL_MS = 30_000; // 30 seconds between auto-syncs
const DEBOUNCE_MS = 2_000; // wait after last change before syncing
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// SyncService — pure logic, no React
// ---------------------------------------------------------------------------

export class SyncService {
  private status: SyncStatus = "idle";
  private listeners = new Set<SyncStatusListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private debounceId: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

  constructor() {
    // Wire the DBCore middleware to notify us of local changes
    setChangeHandler(() => this.scheduleSync());
  }

  // ---- public API ---------------------------------------------------------

  /** Subscribe to status changes. Returns unsubscribe function. */
  onStatusChange(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Current sync status. */
  get currentStatus(): SyncStatus {
    return this.status;
  }

  /** Start periodic sync. Call once on app mount. */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.triggerSync(), SYNC_INTERVAL_MS);
  }

  /** Stop periodic sync. Call on app unmount. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.debounceId) {
      clearTimeout(this.debounceId);
      this.debounceId = null;
    }
  }

  /**
   * Called by middleware or UI after a local mutation.
   * Debounces — doesn't sync immediately, waits DEBOUNCE_MS.
   */
  scheduleSync(): void {
    if (this.debounceId) clearTimeout(this.debounceId);
    this.debounceId = setTimeout(() => this.triggerSync(), DEBOUNCE_MS);
  }

  /** Force an immediate sync. Idempotent — no-ops if already syncing. */
  async triggerSync(): Promise<void> {
    if (this.status === "syncing") return;

    this.setStatus("syncing");
    this.retryCount = 0;

    try {
      await this.executeSync();
      this.setStatus("idle");
    } catch (err) {
      console.error("[SyncService] sync failed", err);
      this.setStatus("error");
      this.scheduleRetry();
    }
  }

  // ---- internals ----------------------------------------------------------

  private setStatus(status: SyncStatus): void {
    this.status = status;
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch {
        // swallow listener errors
      }
    }
  }

  private async executeSync(): Promise<void> {
    const raw = localStorage.getItem(LOCAL_STORAGE_SYNC_KEY);
    let lastSyncedAt = raw ? new Date(JSON.parse(raw)) : new Date(0);
    const isInitialSync = !raw;

    // Drain unsent change records in batches of 200.
    // Uses cursor-based pagination on the auto-increment id so that
    // interleaved bulkDelete calls don't shift row positions and skip records.
    let lastId = 0;
    let didSend = false;
    while (true) {
      const page = await db.changeRecords
        .where("id")
        .above(lastId)
        .limit(200)
        .toArray();
      const unsent = page.filter((r) => r.synced === false);
      if (page.length > 0) {
        lastId = page[page.length - 1].id!;
      }

      // No more records in the DB
      if (page.length === 0) {
        if (didSend) break;
        // Only fall through for the very first sync (no stored lastSyncedAt).
        // On periodic / event-driven syncs with no changes, skip entirely.
        if (!isInitialSync) break;
      }

      // Skip the request if there are truly no unsent changes to push
      // (all records in this page were already synced).
      if (unsent.length === 0 && !isInitialSync) {
        break;
      }

      let result = await this.sendAndApply(
        unsent,
        lastSyncedAt,
        null, // first page — no cursor
      );
      didSend = true;

      // Paginate through remaining downstream pages
      let cursor = result.nextCursor;
      while (result.hasMore === true && cursor !== null) {
        result = await this.sendAndApply([], lastSyncedAt, cursor);
        cursor = result.nextCursor;
      }

      // All downstream pages consumed — checkpoint the server time
      lastSyncedAt = new Date(result.serverTime);
      localStorage.setItem(
        LOCAL_STORAGE_SYNC_KEY,
        JSON.stringify(result.serverTime),
      );

      // No more records at all — done
      if (page.length === 0) break;
    }
  }

  /**
   * Send a batch of changes (may be empty) and apply the server response.
   * Returns the response data so the caller can inspect hasMore / nextCursor.
   */
  private async sendAndApply(
    changes: ChangeRecord[],
    lastSyncedAt: Date,
    cursor: string | null,
  ): Promise<SyncChangesResponse> {

    const body: Record<string, unknown> = {
      changes: changes.map((c) => ({
        id: c.id,
        changeOperation: c.changeOperation,
        changeEntityType: c.changeEntityType,
        entityId: c.entityId,
        payload: c.payload,
        timestamp: c.timestamp,
      })),
      lastSyncedAt,
    };
    if (cursor) body.cursor = cursor;

    const response = await apiClient(
      `${BASE_URL}/notes/sync/changes`,
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const json = (await response.json()) as {
      status: number;
      data: SyncChangesResponse;
      message: string;
    };
    const { data } = json;

    // Clean up processed change records
    if (data.processedChangeIds.length > 0) {
      try {
        await db.changeRecords.bulkDelete(data.processedChangeIds);
      } catch (err) {
        console.error("[SyncService] bulkDelete changeRecords failed", {
          ids: data.processedChangeIds,
          err,
        });
        throw err;
      }
    }

    // Write downstream entities to IndexedDB
    await this.applyDownstream(data);

    return data;
  }

  private async applyDownstream(data: SyncChangesResponse): Promise<void> {
    const serverTimeISO = new Date(data.serverTime).toISOString();

    skipChangeTracking();
    try {
      await db.transaction("rw", [db.notes, db.folders], async () => {
        if (data.folders.length > 0) {
          const folders = data.folders.map((f) => ({
            ...f,
            updatedAt: new Date(f.updatedAt).toISOString(),
            createdAt: f.createdAt
              ? new Date(f.createdAt).toISOString()
              : serverTimeISO,
            deletedAt: f.deletedAt
              ? new Date(f.deletedAt).toISOString()
              : null,
          }));
          try {
            await db.folders.bulkPut(folders);
          } catch (err) {
            console.error("[SyncService] bulkPut folders failed", {
              count: folders.length,
              first: folders[0],
              err,
            });
            throw err;
          }

          const toDelete: string[] = [];

          for (const f of folders) {
            if (f.isDeleted) toDelete.push(f.id);
          }

          if (toDelete.length > 0) await db.folders.bulkDelete(toDelete);
        }

        if (data.notes.length > 0) {
          const notes = data.notes.map((n) => ({
            ...n,
            // Server returns content as a parsed JSON object, but IndexedDB
            // stores it as a string. Normalize to avoid spurious change
            // detection in useLiveQuery that resets the editor cursor.
            content:
              typeof n.content === "string"
                ? n.content
                : JSON.stringify(n.content),
            updatedAt: new Date(n.updatedAt).toISOString(),
            createdAt: n.createdAt
              ? new Date(n.createdAt as string).toISOString()
              : serverTimeISO,
            deletedAt: n.deletedAt
              ? new Date(n.deletedAt as string).toISOString()
              : null,
          }));
          try {
            await db.notes.bulkPut(notes);
          } catch (err) {
            console.error("[SyncService] bulkPut notes failed", {
              count: notes.length,
              first: notes[0],
              err,
            });
            throw err;
          }

          const toDelete: string[] = [];

          for (const n of notes) {
            if (n.isDeleted) toDelete.push(n.id);
          }

          if (toDelete.length > 0) await db.notes.bulkDelete(toDelete);
        }
      });
    } finally {
      resumeChangeTracking();
    }
  }

  private scheduleRetry(): void {
    if (this.retryCount >= MAX_RETRIES) return;

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, this.retryCount);
    this.retryCount++;

    setTimeout(() => {
      if (this.status === "error") {
        this.triggerSync();
      }
    }, delay);
  }
}

/** Singleton instance. Created once, shared across the app. */
export const syncService = new SyncService();
