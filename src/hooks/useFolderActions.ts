import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Folder } from "@/types/Folder";
import { useQueryClient } from "@tanstack/react-query";

export function useFolderActions(triggerSync: () => void) {
  const queryClient = useQueryClient();

  const saveFolder = async (folder: Partial<Folder>) => {
    await db.folders.put({
      ...folder,
      updatedAt: new Date().toISOString(),
      isDeleted: !!folder.isDeleted,
    } as Folder);

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

  return { saveFolder, deleteFolder };
}
