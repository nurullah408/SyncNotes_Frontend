import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { LOCAL_STORAGE_SYNC_KEY } from "@/lib/constants";
import { db } from "@/db/syncNotesDb";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/types/Note";
import { BASE_URL } from "@/constants";
import { apiClient } from "@/lib/api-client";
import type { SyncNoteResponse } from "@/types/response/SyncNoteResponse";

export function useGlobalSyncEngine() {
  const queryClient = useQueryClient();

  const [lastSyncedAt] = useLocalStorage(LOCAL_STORAGE_SYNC_KEY, new Date(0));

  const syncMutation = useMutation({
    mutationKey: ["sync_notes_mutation_key"],
    mutationFn: async () => {
      const dirtyNotes = await db.notes
        .where("updatedAt")
        .above(lastSyncedAt)
        .toArray();

      const upstreamNotes = dirtyNotes.map((note) => ({
        id: note.id,
        title: note.title,
        content: JSON.parse(note.content),
        lastUpdated: note.lastUpdated,
        isDeleted: !!note.isDeleted,
      }));
      await executePaginatedSync({
        notesToUpload: upstreamNotes,
        lastSyncedAt,
        cursor: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes_list_query_key"] });
    },
    onError: () => {
      toast.error("Sync failed");
    },
    retry: 3,
  });

  async function executePaginatedSync({
    notesToUpload,
    lastSyncedAt,
    cursor,
  }: {
    notesToUpload: Note[];
    lastSyncedAt: Date;
    cursor: string | null;
  }) {
    const response = await apiClient(`${BASE_URL}/notes/sync`, {
      method: "POST",
      body: JSON.stringify({
        notes: notesToUpload,
        lastSyncedAt,
        cursor,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server failed to sync ${response.status}`);
    }

    const { data } = (await response.json()) as {
      status: number;
      data: SyncNoteResponse;
      message: string;
    };

    await db.transaction("rw", db.notes, async () => {
      if (notesToUpload.length > 0) {
        await Promise.all(
          notesToUpload.map(async (note) => {
            if (note.isDeleted && data.processedIds.includes(note.id)) {
              await db.notes.delete(note.id);
            }
          }),
        );
      }

      if (data.changes.length > 0) {
        const downstreamNotes = data.changes.map((serverNote) => ({
          id: serverNote.id,
          title: serverNote.title,
          content: JSON.parse(serverNote.content),
          lastUpdated: serverNote.lastUpdated,
          isDeleted: serverNote.isDeleted,
        }));
        await db.notes.bulkPut(downstreamNotes);

        const hardDeleteTargets = downstreamNotes
          .filter((n) => n.isDeleted)
          .map((n) => n.id);
        if (hardDeleteTargets.length > 0) {
          await db.notes.bulkDelete(hardDeleteTargets);
        }
        if (!data.hasMore) {
          await executePaginatedSync({
            notesToUpload: [],
            lastSyncedAt,
            cursor: data.nextCursor,
          });
        }
      }
    });
  }

  return {
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
  };
}
