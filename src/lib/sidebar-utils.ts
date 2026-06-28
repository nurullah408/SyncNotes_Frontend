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

  notes.forEach((note) => {
    if (note.folderId) {
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
    if (!isCollapsed) {
      const childNotes = notesByFolder.get(folder.id) || [];
      childNotes.forEach((note) => {
        result.push({
          ...note,
          type: "note",
          depth: 1,
        });
      });
    }
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
