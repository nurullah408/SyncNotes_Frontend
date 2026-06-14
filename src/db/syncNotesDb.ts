import type { Note } from "@/types/Note";
import Dexie, { type Table } from "dexie";

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;

  constructor() {
    super("SyncNotesDb");

    this.version(1).stores({
      notes: "id, title, updatedAt, isDeleted",
    });

    this.version(2)
      .stores({
        notes: "id, title, updatedAt, isDeleted",
      })
      .upgrade(async (tx) => {
        return tx
          .table("notes")
          .toCollection()
          .modify((note) => {
            if (note.searchContent !== undefined) return;

            try {
              note.searchContent = extractTextFromLexicalJson(note.content);
            } catch (e) {
              console.error(
                `Failed to migrate searchContent for note ${note.id}`,
                e,
              );
              note.searchContent = "";
            }
          });
      });
  }
}

export const db = new SyncNotesDb();
