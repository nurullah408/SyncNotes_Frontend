import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWindowVisibility } from "@/hooks/useWindowVisibility";
import { syncService } from "@/lib/SyncService";

/**
 * Starts/stops the SyncService and triggers sync on online / visibility events.
 * Renders nothing — pure side-effects.
 */
export function SyncManager() {
  const hasInitiallySynced = useRef(false);
  const isOnline = useOnlineStatus();
  const isVisible = useWindowVisibility();

  // Start the service when the component mounts
  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);

  // Initial sync on mount
  useEffect(() => {
    if (!hasInitiallySynced.current) {
      hasInitiallySynced.current = true;
      syncService.triggerSync();
    }
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncService.triggerSync();
    }
  }, [isOnline]);

  // Sync when tab becomes visible
  useEffect(() => {
    if (isVisible) {
      syncService.triggerSync();
    }
  }, [isVisible]);

  return null;
}
