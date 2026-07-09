import { db } from "@/db/syncNotesDb";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Note } from "@/types/entities/Note";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncContext } from "@/context/SyncContext";

export function useNoteActions() {
  const queryClient = useQueryClient();
  const { sync: triggerSync } = useSyncContext();

  const createNote = (note: Partial<Note>): Note => {
    const newNote = {
      id: note.id || crypto.randomUUID(),
      folderId: note.folderId || null,
      title: note.title || "Untitled",
      content: INITIAL_EDITOR_STATE,
      searchContent: "",
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString(),
      isDeleted: note.isDeleted || false,
      deletedAt: null,
    };
    return newNote;
  };

  const saveNote = async (note: Partial<Note>) => {
    if (!note.id) return;

    const existing = await db.notes.get(note.id);

    const merged = {
      ...existing,
      ...note,
      updatedAt: new Date().toISOString(),
    } as Note;

    await db.notes.put(merged);

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notesList() });

    if (note?.id) {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.notesDetail(note.id),
      });
    }

    triggerSync();
  };

  const deleteNote = async (noteId: string) => {
    await db.notes.update(noteId, {
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notesList() });

    triggerSync();
  };

  const deleteNotes = async (noteIds: string[]) => {
    for (const noteId of noteIds) {
      await db.notes.update(noteId, {
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notesList() });

    triggerSync();
  };

  return { createNote, saveNote, deleteNote, deleteNotes };
}
