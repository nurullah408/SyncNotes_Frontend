import { useLocalStorage } from "./useLocalStorage.ts";
import { INITIAL_EDITOR_STATE, LOCAL_STORAGE_SYNC_KEY } from "@/lib/constants";
import { db } from "@/db/syncNotesDb";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/types/Note";
import { BASE_URL } from "@/constants";
import { apiClient } from "@/lib/api-client";
import type { SyncNoteResponse } from "@/types/response/SyncNoteResponse";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Folder } from "@/types/Folder.ts";

export function useGlobalSyncEngine() {
  const queryClient = useQueryClient();

  const [lastSyncedAt, setLastSyncedAt] = useLocalStorage(
    LOCAL_STORAGE_SYNC_KEY,
    new Date(0),
  );

  const syncMutation = useMutation({
    mutationKey: ["sync_notes_mutation_key"],
    mutationFn: async () => {
      const dirtyFolders = await db.folders
        .where("updatedAt")
        .above(lastSyncedAt)
        .toArray();

      const upstreamFolders = dirtyFolders.map((folder) => ({
        id: folder.id,
        name: folder.name || "Untitled",
        color: folder.color || "#ffff",
        isDeleted: folder.isDeleted,
        updatedAt: folder.updatedAt,
        deletedAt: folder.updatedAt,
        createdAt: folder.createdAt,
      }));

      const dirtyNotes = await db.notes
        .where("updatedAt")
        .above(lastSyncedAt)
        .toArray();

      const upstreamNotes = dirtyNotes.map((note) => {
        let parsedContent: string;
        try {
          parsedContent =
            typeof note.content === "string"
              ? JSON.parse(note.content)
              : note.content;
        } catch {
          parsedContent = INITIAL_EDITOR_STATE;
        }
        return {
          id: note.id,
          title:
            note.title && note.title.trim() !== ""
              ? note.title.trim()
              : "Untitled",
          folderId: note.folderId || null,
          content: parsedContent,
          searchContent: note.searchContent || "",
          updatedAt: note.updatedAt,
          createdAt: note.updatedAt,
          deletedAt: note.deletedAt,
          isDeleted: !!note.isDeleted,
        };
      });
      await executePaginatedSync({
        foldersToUpload: upstreamFolders,
        notesToUpload: upstreamNotes,
        lastSyncedAt,
        cursor: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foldersList() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notesList() });
    },
    onError: (error) => {
      toast.error("Sync failed");
      console.error(error);
    },
    retry: 3,
  });

  async function executePaginatedSync({
    foldersToUpload,
    notesToUpload,
    lastSyncedAt,
    cursor,
  }: {
    foldersToUpload: Folder[];
    notesToUpload: Note[];
    lastSyncedAt: Date;
    cursor: string | null;
  }) {
    const response = await apiClient(`${BASE_URL}/notes/sync`, {
      method: "POST",
      body: JSON.stringify({
        folders: foldersToUpload,
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

    await db.transaction("rw", [db.notes, db.folders], async () => {
      if (foldersToUpload.length > 0) {
        await Promise.all(
          foldersToUpload.map(async (folder) => {
            if (
              folder.isDeleted &&
              data.processedFolderIds.includes(folder.id)
            ) {
              await db.folders.delete(folder.id);
            }
          }),
        );
      }
      if (notesToUpload.length > 0) {
        await Promise.all(
          notesToUpload.map(async (note) => {
            if (note.isDeleted && data.processedNoteIds.includes(note.id)) {
              await db.notes.delete(note.id);
            }
          }),
        );
      }

      // Downstream Processing
      if (data.folders.length > 0) {
        const downstreamFolders = data.folders.map((f) => ({
          ...f,
          updatedAt: new Date(f.updatedAt).toString(),
        }));
        await db.folders.bulkPut(downstreamFolders);
        const hardDeleteFolders = downstreamFolders
          .filter((f) => f.isDeleted)
          .map((f) => f.id);
        if (hardDeleteFolders.length > 0) {
          await db.folders.bulkDelete(hardDeleteFolders);
        }
      }

      if (data.notes.length > 0) {
        const downstreamNotes = data.notes.map((n) => ({
          ...n,
          updatedAt: new Date(n.updatedAt).toString(),
        }));
        await db.notes.bulkPut(downstreamNotes);
        const hardDeleteNotes = downstreamNotes
          .filter((n) => n.isDeleted)
          .map((n) => n.id);
        if (hardDeleteNotes.length > 0) {
          await db.notes.bulkDelete(hardDeleteNotes);
        }
      }

      setLastSyncedAt(new Date(data.serverTime));
      if (data.hasMore) {
        await executePaginatedSync({
          foldersToUpload: [],
          notesToUpload: [],
          lastSyncedAt,
          cursor: data.nextCursor,
        });
      }
    });
  }

  return {
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
  };
}
