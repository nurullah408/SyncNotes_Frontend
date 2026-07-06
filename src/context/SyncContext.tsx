import { createContext, useContext, type ReactNode } from "react";
import { useGlobalSyncEngine } from "@/hooks/useSyncEngine";

interface SyncContextValue {
  sync: ReturnType<typeof useGlobalSyncEngine>["sync"];
  isSyncing: ReturnType<typeof useGlobalSyncEngine>["isSyncing"];
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { sync, isSyncing } = useGlobalSyncEngine();

  return (
    <SyncContext.Provider value={{ sync, isSyncing }}>
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
