import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Note } from "@/types/Note";
import { useQueryClient } from "@tanstack/react-query";

export function useNoteActions(triggerSync: () => void) {
  const queryClient = useQueryClient();

  const saveNote = async (note: Partial<Note>) => {
    await db.notes.put({
      ...note,
      updatedAt: new Date().toISOString(),
      isDeleted: !!note.isDeleted,
    } as Note);

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });

    if (note?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(note.id) });
    }

    triggerSync();
  };

  const deleteNote = async (noteId: string) => {
    await db.notes.update(noteId, {
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });

    triggerSync();
  };

  return { saveNote, deleteNote };
}
