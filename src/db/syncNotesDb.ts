import type { ChangeRecord } from "@/types/entities/ChangeRecord";
import type { Folder } from "@/types/entities/Folder";
import type { Note } from "@/types/entities/Note";
import Dexie, { type Table } from "dexie";

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  changeRecords!: Table<ChangeRecord, string>;

  constructor() {
    super("SyncNotesDb");

    this.version(2).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
    });

    this.version(3).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
      changeRecords: "id++, entityType, entityId, operation, timestamp, synced",
    });
  }
}

export const db = new SyncNotesDb();
