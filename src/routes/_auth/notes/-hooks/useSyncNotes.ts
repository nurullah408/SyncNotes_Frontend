import { BASE_URL } from "@/constants";
import { db } from "@/db/syncNotesDb";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { apiClient } from "@/lib/api-client";
import { LOCAL_STORAGE_SYNC_KEY } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useSyncNotes() {
  const { getItem, setItem } = useLocalStorage();
  return useMutation({
    mutationFn: async () => {
      const lastUpdatedAtStr = getItem(LOCAL_STORAGE_SYNC_KEY);
      const lastSyncedDate = lastUpdatedAtStr
        ? new Date(lastUpdatedAtStr)
        : new Date(0);
      const potentialDirtyNotes = await db.notes
        .where("lastUpdated")
        .above(lastSyncedDate.toISOString())
        .toArray();

      const dirtyNotes = potentialDirtyNotes.filter((note) => {
        const noteDate = new Date(note.lastUpdated);
        return (
          noteDate > lastSyncedDate ||
          (note?.isDeleted && noteDate > lastSyncedDate)
        );
      });

      if (dirtyNotes.length === 0)
        return { synced: false, count: 0, syncedInitiatedAt: null };

      const syncInitiatedAt = new Date().toISOString();

      const response = await apiClient(`${BASE_URL}/notes/sync`, {
        method: "POST",
        body: JSON.stringify({ notes: dirtyNotes }),
      });

      if (!response.ok) {
        toast.error("Failed to sync notes");
        return;
      }
      return { synced: true, count: dirtyNotes.length, syncInitiatedAt };
    },
    onSuccess: (data) => {
      if (!data || !data.synced || !data.syncInitiatedAt) return;
      setItem(LOCAL_STORAGE_SYNC_KEY, data?.syncInitiatedAt);
      toast.success("Notes synced successfully");
    },
    onError: (error) => {
      toast.error("Failed to sync notes" + new Error(error?.message).message);
    },
  });
}
