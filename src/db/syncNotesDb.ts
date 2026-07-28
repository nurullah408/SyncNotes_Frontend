import type { ChangeEntityType, ChangeRecord } from "@/types/entities/ChangeRecord";
import type { Folder } from "@/types/entities/Folder";
import type { Note } from "@/types/entities/Note";
import Dexie, {
  type Table,
  type DBCore,
  type DBCoreTable,
  type DBCoreMutateRequest,
  type DBCoreMutateResponse,
  type Middleware,
} from "dexie";

// ---------------------------------------------------------------------------
// Skip flag – used by sync operations to avoid creating change records for
// data that was already synced / received from the server.
// ---------------------------------------------------------------------------
let __skipChangeTracking = false;
let __onChangeHandler: (() => void) | null = null;

export function skipChangeTracking() {
  __skipChangeTracking = true;
}

export function resumeChangeTracking() {
  __skipChangeTracking = false;
}

/** Called by SyncService to register for change notifications. */
export function setChangeHandler(handler: (() => void) | null) {
  __onChangeHandler = handler;
}

// ---------------------------------------------------------------------------
// DBCore middleware – intercepts every mutation on notes & folders and
// automatically writes a corresponding ChangeRecord.
//
// This is the recommended Dexie pattern (db.use()) and avoids the transaction-
// scoping problems that table hooks can cause.
// ---------------------------------------------------------------------------
function createChangeTrackerMiddleware(): Middleware<DBCore> {
  return {
    stack: "dbcore",
    name: "change-tracker",
    create(downDatabase: DBCore): Partial<DBCore> {
      return {
        table(tableName: string): DBCoreTable {
          const downTable = downDatabase.table(tableName);

          // Only instrument the tables we care about
          if (tableName !== "notes" && tableName !== "folders") {
            return downTable;
          }

          const entityType: ChangeEntityType =
            tableName === "notes" ? "note" : "folder";

          return {
            ...downTable,

            async mutate(
              req: DBCoreMutateRequest,
            ): Promise<DBCoreMutateResponse> {
              // 1. Execute the actual mutation first
              const result = await downTable.mutate(req);

              // 2. If tracking is paused (e.g. during sync), skip
              if (__skipChangeTracking) return result;

              // 3. Determine what changes to record
              const changes: ChangeRecord[] = [];

              if (req.type === "add") {
                // table.add(obj)  →  always a "create"
                for (let i = 0; i < req.values.length; i++) {
                  const val = req.values[i] as Record<string, unknown>;
                  const entityId = (val.id as string) ?? result.results?.[i];
                  if (!entityId) continue;
                  changes.push(
                    buildRecord(entityType, entityId, "create", val),
                  );
                }
              } else if (req.type === "put") {
                if (req.changeSpec || req.updates) {
                  // table.update(key, changes)  →  "update" (or "delete" if isDeleted)
                  const keys: string[] =
                    req.updates?.keys ?? req.keys ?? (req.values as Record<string, unknown>[])?.map((v) => v.id as string) ?? [];
                  for (let i = 0; i < keys.length; i++) {
                    const entityId = keys[i];
                    const spec: Record<string, unknown> =
                      req.updates?.changeSpecs?.[i] ?? req.changeSpec ?? {};
                    const op =
                      spec.isDeleted === true ? "delete" : "update";
                    changes.push(
                      buildRecord(entityType, entityId, op, {
                        id: entityId,
                        ...spec,
                      }),
                    );
                  }
                } else {
                  // table.put(obj) / bulkPut()  →  check existence first
                  const ids: string[] = [];
                  for (let i = 0; i < req.values.length; i++) {
                    const val = req.values[i] as Record<string, unknown>;
                    const id = (val.id as string) ?? req.keys?.[i];
                    if (id) ids.push(id);
                  }

                  // Batch-check which keys already exist
                  const existingMap = new Set<string>();
                  if (ids.length > 0) {
                    const existing = await downTable.getMany({
                      trans: req.trans,
                      keys: ids,
                    });
                    for (const row of existing) {
                      if (row) existingMap.add(row.id as string);
                    }
                  }

                  for (let i = 0; i < req.values.length; i++) {
                    const val = req.values[i] as Record<string, unknown>;
                    const entityId =
                      (val.id as string) ?? req.keys?.[i];
                    if (!entityId) continue;

                    const existed = existingMap.has(entityId);
                    const op = val.isDeleted
                      ? "delete"
                      : existed
                        ? "update"
                        : "create";
                    changes.push(
                      buildRecord(entityType, entityId, op, val),
                    );
                  }
                }
              } else if (req.type === "delete") {
                // table.delete(key)
                for (const key of req.keys) {
                  changes.push(
                    buildRecord(entityType, key as string, "delete", {
                      id: key,
                    }),
                  );
                }
              }

              // 4. Persist change records, then notify sync service
              if (changes.length > 0) {
                Dexie.ignoreTransaction(async () => {
                  return db.changeRecords
                    .bulkAdd(changes)
                    .then(() => __onChangeHandler?.())
                    .catch(console.error);
                });
              }

              return result;
            },
          };
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function buildRecord(
  entityType: ChangeEntityType,
  entityId: string,
  operation: ChangeRecord["changeOperation"],
  data: unknown,
): ChangeRecord {
  return {
    changeEntityType: entityType,
    entityId,
    changeOperation: operation,
    payload: JSON.stringify(data ?? {}),
    synced: false,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------
class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  changeRecords!: Table<ChangeRecord, number>;

  constructor() {
    super("SyncNotesDb");

    this.version(1).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
      changeRecords:
        "id++, changeEntityType, entityId, changeOperation, timestamp, synced",
    });

    // Register DBCore middleware – no need to wait for "ready" event.
    // Middleware is active immediately once the database is opened.
    this.use(createChangeTrackerMiddleware());
  }
}

export const db = new SyncNotesDb();
