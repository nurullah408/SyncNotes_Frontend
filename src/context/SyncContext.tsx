import { createContext, useContext, type ReactNode } from "react";
import { useSync } from "@/hooks/useSync";

interface SyncContextValue {
  sync: () => void;
  isSyncing: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { triggerSync, isSyncing } = useSync();

  return (
    <SyncContext.Provider value={{ sync: triggerSync, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return ctx;
}
