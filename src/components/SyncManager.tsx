import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWindowVisibility } from "@/hooks/useWindowVisibility";
import { useSyncContext } from "@/context/SyncContext";

export function SyncManager() {
  const { sync } = useSyncContext();
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
