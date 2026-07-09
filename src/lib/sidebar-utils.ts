import type { Folder } from "@/types/Folder";
import type { Note } from "@/types/Note";
import type { FlatListItem } from "@/types/util-types/FlatListItem";
import type { FolderItem } from "@/types/util-types/FolderItem";
import type { NoteItem } from "@/types/util-types/NoteItem";

export function buildFlatList(
  notes: Note[],
  folders: Folder[],
  collapsedFolders: Record<string, boolean>,
): (FolderItem | NoteItem)[] {
  const result: FlatListItem[] = [];

  const notesByFolder: Map<string, Note[]> = new Map();

  const rootNotes: Note[] = [];

  // Build a set of existing folder IDs for fast lookup
  const existingFolderIds = new Set(folders.map((f) => f.id));

  notes.forEach((note) => {
    // Only group under folder if the folder actually exists
    if (note.folderId && existingFolderIds.has(note.folderId)) {
      if (!notesByFolder.has(note.folderId))
        notesByFolder.set(note.folderId, []);
      notesByFolder.get(note.folderId)!.push(note);
    } else {
      rootNotes.push(note);
    }
  });

  folders.forEach((folder) => {
    const isCollapsed = !!collapsedFolders[folder.id];
    result.push({
      ...folder,
      type: "folder",
      depth: 0,
      isCollapsed,
    });
    // Always include children — CSS handles collapse animation
    const childNotes = notesByFolder.get(folder.id) || [];
    childNotes.forEach((note) => {
      result.push({
        ...note,
        type: "note",
        depth: 1,
      });
    });
  });

  rootNotes.forEach((note) => {
    result.push({
      ...note,
      type: "note",
      depth: 0,
    });
  });

  return result;
}
