import type { Note } from "@/types/Note";
import Dexie, { type Table } from "dexie";

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;

  constructor() {
    super("SyncNotesDb");
    this.version(1).stores({
      notes: "id, title, updatedAt, isDeleted",
    });
  }
}

export const db = new SyncNotesDb();
