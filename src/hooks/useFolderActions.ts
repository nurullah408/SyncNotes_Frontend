import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Folder } from "@/types/Folder";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncContext } from "@/context/SyncContext";

export function useFolderActions() {
  const queryClient = useQueryClient();
  const { sync: triggerSync } = useSyncContext();

  const createFolder = (folder: Partial<Folder>): Folder => {
    const newFolder = {
      id: folder.id || crypto.randomUUID(),
      name: folder.name || "Untitled",
      color: folder.color || "#ffff",
      isDeleted: folder.isDeleted || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    return newFolder;
  };

  const saveFolder = async (folder: Partial<Folder>) => {
    if (!folder.id) return;

    const existing = await db.folders.get(folder.id);

    const merged = {
      ...existing,
      ...folder,
      updatedAt: new Date().toISOString(),
    } as Folder;

    await db.folders.put(merged);

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foldersList() });

    if (folder?.id) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.foldersDetail(folder.id),
      });
    }

    triggerSync();
  };

  const deleteFolder = async (folderId: string) => {
    await db.folders.update(folderId, {
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foldersList() });

    triggerSync();
  };

  return { createFolder, saveFolder, deleteFolder };
}
