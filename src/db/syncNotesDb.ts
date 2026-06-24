import type { Folder } from "@/types/Folder";
import type { Note } from "@/types/Note";
import Dexie, { type Table } from "dexie";

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  constructor() {
    super("SyncNotesDb");

    this.version(2).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
    });
  }
}

export const db = new SyncNotesDb();
