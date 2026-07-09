import type { ChangeEntityType, ChangeRecord } from "@/types/entities/ChangeRecord";
import type { Folder } from "@/types/entities/Folder";
import type { Note } from "@/types/entities/Note";
import Dexie, { type Table } from "dexie";

let __skipChangeHooks = false;
// Dexie Hooks
export function skipChangeHooks() {
  __skipChangeHooks = true;
}

export function resumeChangeHooks() {
  __skipChangeHooks = false;
}

function registerChangeHooks<T>(
  table: Table<T, string>,
  changeEntityType: ChangeEntityType,
) {
  // Creating Hook
  table.hook("creating", (primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changeRecords.add({
      changeEntityType,
      entityId: primKey as string,
      changeOperation: "create",
      payload: JSON.stringify(obj),
      synced: false,
      timestamp: new Date().toISOString(),
    })
  });
  // Update Hook
  table.hook("updating", (_modifications, primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changeRecords.add({
      changeEntityType,
      entityId: primKey as string,
      changeOperation: "update",
      payload: JSON.stringify(obj),
      synced: false,
      timestamp: new Date().toISOString(),
    })
  });
  // Delete Hook
  table.hook("deleting", (primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changeRecords.add({
      changeEntityType,
      entityId: primKey as string,
      changeOperation: "delete",
      payload: JSON.stringify(obj),
      synced: false,
      timestamp: new Date().toISOString(),
    })
  });
}

class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  changeRecords!: Table<ChangeRecord, number>;

  constructor() {
    super("SyncNotesDb");

    this.version(2).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
    });

    this.version(3).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",

      changeRecords: "id++, changeEntityType, entityId, changeOperation, timestamp, synced",
    });

    // Register hooks only after DB is fully opened/upgraded (v3 has changeRecords table)
    this.on("ready", () => {
      registerChangeHooks(this.notes, "note");
      registerChangeHooks(this.folders, "folder");
    });
  }
}


export const db = new SyncNotesDb();
