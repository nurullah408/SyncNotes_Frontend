import { useSyncExternalStore, useCallback } from "react";
import { syncService, type SyncStatus } from "@/lib/SyncService";

/**
 * Thin React binding around SyncService.
 *
 * Reads status via useSyncExternalStore (tear-free, concurrent-mode safe).
 * Exposes a triggerSync helper for imperative calls (online/visibility events).
 */
export function useSync() {
  const status = useSyncExternalStore<SyncStatus>(
    // subscribe
    useCallback((onStoreChange: () => void) => {
      return syncService.onStatusChange(() => onStoreChange());
    }, []),
    // getSnapshot
    useCallback(() => syncService.currentStatus, []),
  );

  return {
    status,
    isSyncing: status === "syncing",
    triggerSync: syncService.triggerSync.bind(syncService),
  } as const;
}
