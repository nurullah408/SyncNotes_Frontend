import { useEffect, useRef } from "react";
import { useGlobalSyncEngine } from "../hooks/useSyncEngine";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWindowVisibility } from "@/hooks/useWindowVisibility";

export function SyncManager() {
  const { sync } = useGlobalSyncEngine();
  const hasInitiallySynced = useRef(false);

  const isOnline = useOnlineStatus();
  const isVisible = useWindowVisibility();

  useEffect(() => {
    if (!hasInitiallySynced.current) {
      sync();
      hasInitiallySynced.current = true;
    }
  }, [sync]);

  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline, sync]);

  useEffect(() => {
    if (isVisible) {
      sync();
    }
  }, [isVisible, sync]);

  return null;
}
