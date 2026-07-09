# Event-Based Sync: Implementation Plan

> **Goal:** Replace the current timestamp-diffing sync model with an explicit change-log approach.  
> Every mutation on notes/folders records a `ChangeRecord` in a dedicated IndexedDB table.  
> The sync engine sends un-synced records as ordered operations to the backend and marks them as synced upon acknowledgment.

---

## Current Architecture (for reference)

### Sync Flow
```
User Action → useNoteActions / useFolderActions
                    │
                    ▼
              db.notes.put() / db.folders.put()   ← direct write, no change-log
                    │
                    ▼
              triggerSync()
                    │
                    ▼
        useSyncEngine scans for updatedAt > lastSyncedAt (fragile timestamp diff)
                    │
                    ▼
            sends full entity snapshots to POST /notes/sync
                    │
                    ▼
        receives downstream data → bulkPut → update localStorage lastSyncedAt
```

### Dexie Schema (v2)
```typescript
this.version(2).stores({
  notes:   "id, title, updatedAt, isDeleted",
  folders: "id, name, updatedAt, isDeleted",
});
```

### Known Bugs / Bypasses
- **`NoteCard.tsx:28`** – calls `db.notes.delete(noteId)` directly. Hard-deletes without soft-delete, no change log, no sync trigger.
- **`AppSidebar.tsx`** – `onDelete("folder", ...)` returns early as a no-op; folders are never actually deleted.

---

## Target Architecture

### Sync Flow (target)
```
User Action → useNoteActions / useFolderActions
                    │
                    ▼
         Dexie transaction (rw):
          1. db.notes.put() / db.folders.put()
          2. db.changes.add() ← record the operation
                    │
                    ▼
              triggerSync()
                    │
                    ▼
        useSyncEngine reads db.changes.where("synced").equals(false)
                    │
                    ▼
            sends ordered change-list to POST /notes/sync
                    │
                    ▼
        backend responds with { processedChangeIds: [...] }
                    │
                    ▼
        mark db.changes.bulkUpdate(ids, { synced: true })
        downstream entities → bulkPut as before
```

### Dexie Schema (v3)
```typescript
this.version(3).stores({
  notes:   "id, title, updatedAt, isDeleted",
  folders: "id, name, updatedAt, isDeleted",
  changes: "++id, entityType, entityId, operation, timestamp, synced",
});
```

---

## Phase 1: Type Definition

### 1.1 New File: `src/types/ChangeRecord.ts`

Define the change-record type that will be stored in the `changes` table.

```typescript
export type ChangeOperation = "create" | "update" | "delete";
export type ChangeEntityType = "note" | "folder";

export interface ChangeRecord {
  id?: number;                    // auto-increment, assigned by Dexie
  entityType: ChangeEntityType;   // "note" | "folder"
  entityId: string;               // the note or folder UUID
  operation: ChangeOperation;     // "create" | "update" | "delete"
  payload: string;                // JSON-stringified full entity snapshot at time of change
  timestamp: string;              // ISO 8601, client-generated
  synced: boolean;                // false → not yet acknowledged by backend
}
```

**Effort:** ~15 lines, trivial.

---

## Phase 2: Database Migration

### 2.1 Modify: `src/db/syncNotesDb.ts`

Add version 3 with the new `changes` table.

```typescript
import type { ChangeRecord } from "@/types/ChangeRecord";
import type { Folder } from "@/types/Folder";
import type { Note } from "@/types/Note";
import Dexie, { type Table } from "dexie";

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  changes!: Table<ChangeRecord, number>;       // NEW

  constructor() {
    super("SyncNotesDb");

    this.version(2).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
    });

    // NEW: version 3 adds the changes table
    this.version(3).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
      changes: "++id, entityType, entityId, operation, timestamp, synced",
    });
  }
}

export const db = new SyncNotesDb();
```

**Key points:**
- Dexie handles the migration automatically — existing v2 users get the new table on upgrade.
- No data migration needed; old `lastSyncedAt`-based sync still works through the same HTTP endpoint until Phase 5.
- Adding `.upgrade()` is optional since v2→v3 is purely additive.

**Effort:** ~8 lines, low.

---

## Phase 3: Generic Entity Actions Hook (Scalability Fix)

### Problem

Every new entity type (notes, folders, tags, bookmarks, etc.) currently requires a dedicated
`useXxxActions` hook that duplicates ~40 lines of identical logic:

```
useNoteActions.ts   ─┐
useFolderActions.ts ─┤  same pattern, different table & type
useTagActions.ts    ─┤  (future: more copy-paste)
useBookmarkActions  ─┘
```

Each hook repeats:
1. Dexie `transaction("rw", ...)` wrapper
2. `get(existing)` → merge → `put(merged)`
3. `db.changes.add(changeRecord)`
4. `queryClient.invalidateQueries(...)`
5. `triggerSync()`

### Solution: `createEntityActions<TEntity, TCreateInput>`

A generic factory function that takes an entity config and returns a fully type-safe hook.
Adding a new entity becomes a **5-line wrapper** instead of a ~40-line copy-paste.

### 3.1 New File: `src/lib/entity-actions.ts`

```typescript
import { db } from "@/db/syncNotesDb";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncContext } from "@/context/SyncContext";
import type { Table } from "dexie";
import type { Entity } from "@/types/Entity";
import type { ChangeRecord, ChangeEntityType, ChangeOperation } from "@/types/ChangeRecord";

// ---------------------------------------------------------------------------
// Config shape — one per entity type
// ---------------------------------------------------------------------------

export interface EntityActionConfig<TEntity extends Entity, TCreateInput> {
  /** The Dexie table for this entity (db.notes, db.folders, etc.) */
  table: Table<TEntity, string>;

  /** The entity type string used in ChangeRecord.entityType */
  entityType: ChangeEntityType;

  /** React Query keys for list and detail */
  queryKeys: {
    list: () => readonly string[];
    detail: (id: string) => readonly string[];
  };

  /**
   * Build a new in-memory entity from a create input.
   * Called by `create()` — does NOT write to DB.
   */
  buildDefaults: (input: TCreateInput) => TEntity;

  /**
   * Optional: custom merge logic when saving.
   * Default: shallow spread `{ ...existing, ...update, updatedAt: now }`.
   */
  merge?: (existing: TEntity | undefined, update: Partial<TEntity>) => TEntity;
}

// ---------------------------------------------------------------------------
// Factory: returns a hook that consumers can rename for DX
// ---------------------------------------------------------------------------

export function createEntityActions<TEntity extends Entity, TCreateInput>(
  config: EntityActionConfig<TEntity, TCreateInput>,
) {
  return function useEntityActions() {
    const queryClient = useQueryClient();
    const { sync: triggerSync } = useSyncContext();

    // ---- helpers ------------------------------------------------------------

    const defaultMerge = (existing: TEntity | undefined, update: Partial<TEntity>): TEntity => ({
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    } as TEntity);

    const recordChange = (
      entityId: string,
      operation: ChangeOperation,
      payload: TEntity | undefined,
    ): ChangeRecord => ({
      entityType: config.entityType,
      entityId,
      operation,
      payload: JSON.stringify(payload ?? {}),
      timestamp: new Date().toISOString(),
      synced: false,
    });

    // ---- public API ---------------------------------------------------------

    /** Build an entity in memory (no DB write yet).  Call `save()` to persist. */
    const create = (input: TCreateInput): TEntity => {
      return config.buildDefaults(input);
    };

    /** Insert or update. Records a change event atomically. */
    const save = async (update: Partial<TEntity> & { id: string }) => {
      if (!update.id) return;

      await db.transaction("rw", [config.table, db.changes], async () => {
        const existing = await config.table.get(update.id);
        const operation: ChangeOperation = existing ? "update" : "create";
        const merged = (config.merge ?? defaultMerge)(existing, update);

        await config.table.put(merged);
        await db.changes.add(recordChange(update.id, operation, merged));
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      queryClient.invalidateQueries({ queryKey: config.queryKeys.detail(update.id) });
      triggerSync();
    };

    /** Soft-delete by setting isDeleted: true. */
    const remove = async (id: string) => {
      await db.transaction("rw", [config.table, db.changes], async () => {
        await config.table.update(id, {
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        } as Partial<TEntity>);

        const existing = await config.table.get(id);
        await db.changes.add(recordChange(id, "delete", existing));
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      triggerSync();
    };

    /** Batch soft-delete (single transaction). */
    const removeMany = async (ids: string[]) => {
      if (ids.length === 0) return;

      await db.transaction("rw", [config.table, db.changes], async () => {
        for (const id of ids) {
          await config.table.update(id, {
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          } as Partial<TEntity>);

          const existing = await config.table.get(id);
          await db.changes.add(recordChange(id, "delete", existing));
        }
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      triggerSync();
    };

    return { create, save, remove, removeMany } as const;
  };
}
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| `create()` returns an object, doesn't write DB | Callers need the ID before persisting (e.g., for `navigate()`) |
| `save()` auto-detects create vs update via `config.table.get()` | No manual operation tracking needed |
| `remove()` does soft-delete only | Matches current `isDeleted` pattern; backend handles hard-delete after sync |
| `merge` is overridable per entity | Notes merge content differently than folders merge color — but the default `{...spread}` works for both |
| `Table` type from Dexie ensures compile-time safety | `config.table.put(x)` fails at build if `x` doesn't match `TEntity` |

---

### 3.2 Refactor: `src/hooks/useNoteActions.ts` → thin wrapper

Old: ~70 lines of inline logic.  
New: ~30 lines — just the config + factory call.

```typescript
import { createEntityActions } from "@/lib/entity-actions";
import { db } from "@/db/syncNotesDb";
import { INITIAL_EDITOR_STATE, QUERY_KEYS } from "@/lib/constants";
import type { Note } from "@/types/Note";

/** Input shape for `createNote(...)` — caller provides partial overrides. */
type CreateNoteInput = Partial<Pick<Note, "id" | "title" | "folderId" | "content">>;

const buildDefaults = (input: CreateNoteInput): Note => ({
  id: input.id || crypto.randomUUID(),
  title: input.title || "Untitled",
  folderId: input.folderId || null,
  content: input.content || INITIAL_EDITOR_STATE,
  searchContent: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
});

/** Re-export under the familiar names consumers expect. */
export const useNoteActions = createEntityActions<Note, CreateNoteInput>({
  table: db.notes,
  entityType: "note",
  queryKeys: {
    list: () => QUERY_KEYS.notesList(),
    detail: (id) => QUERY_KEYS.notesDetail(id),
  },
  buildDefaults,
});
```

**Backward-compatible mapping** — existing call sites see no change:

| Old API | New (identical) |
|---|---|
| `const { createNote, saveNote, deleteNote, deleteNotes } = useNoteActions()` | `const { create, save, remove, removeMany } = useNoteActions()` — or alias locally |

> **Migration strategy:** Keep old names via destructuring aliases at call sites if desired,
> or rename in-place (search-and-replace safe). The return shape is structurally identical.

---

### 3.3 Refactor: `src/hooks/useFolderActions.ts` → thin wrapper

```typescript
import { createEntityActions } from "@/lib/entity-actions";
import { db } from "@/db/syncNotesDb";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { Folder } from "@/types/Folder";

type CreateFolderInput = Partial<Pick<Folder, "id" | "name" | "color">>;

const buildDefaults = (input: CreateFolderInput): Folder => ({
  id: input.id || crypto.randomUUID(),
  name: input.name || "Untitled",
  color: input.color || "#ffff",
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null,
});

export const useFolderActions = createEntityActions<Folder, CreateFolderInput>({
  table: db.folders,
  entityType: "folder",
  queryKeys: {
    list: () => QUERY_KEYS.foldersList(),
    detail: (id) => QUERY_KEYS.foldersDetail(id),
  },
  buildDefaults,
});
```

---

### 3.4 Adding a new entity type (example: "Tags")

With the generic hook, adding a new synced entity takes **one new file**:

```typescript
// src/hooks/useTagActions.ts
import { createEntityActions } from "@/lib/entity-actions";
import { db } from "@/db/syncNotesDb";    // ← db.tags added in Dexie schema
import { QUERY_KEYS } from "@/lib/query-keys"; // ← QUERY_KEYS.tagsList() added
import type { Tag } from "@/types/Tag";

type CreateTagInput = Partial<Pick<Tag, "id" | "name" | "color">>;

export const useTagActions = createEntityActions<Tag, CreateTagInput>({
  table: db.tags,
  entityType: "tag",         // ← also add "tag" to ChangeEntityType union
  queryKeys: {
    list: () => QUERY_KEYS.tagsList(),
    detail: (id) => QUERY_KEYS.tagsDetail(id),
  },
  buildDefaults: (input) => ({
    id: input.id || crypto.randomUUID(),
    name: input.name || "New Tag",
    color: input.color || "#cccccc",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  }),
});
```

That's it — the hook inherits `create`, `save`, `remove`, `removeMany` with full type safety and automatic change-logging.

**Effort:** ~80 lines for `entity-actions.ts`, ~30 lines each for refactored wrappers (net reduction from ~100 lines of duplicated code). Low complexity.

---

## Phase 4: Fix Bypass Bugs

### 4.1 Modify: `src/routes/_auth/notes/-components/NoteCard.tsx`

Replace the direct `db.notes.delete()` call with proper `useNoteActions` usage.

**Current (buggy):**
```typescript
async function onClickDelete(event: MouseEvent, noteId: string) {
    event.preventDefault();
    event.stopPropagation();
    await db.notes.delete(noteId);   // BUG: hard delete, no sync trigger
}
```

**Fixed:**
```typescript
import { useNoteActions } from "@/hooks/useNoteActions";

export function NoteCard({ id, title, content, lastUpdated, ...props }) {
  const { remove } = useNoteActions();

  async function onClickDelete(event: MouseEvent, noteId: string) {
    event.preventDefault();
    event.stopPropagation();
    await remove(noteId);   // FIXED: soft-delete + change record + sync trigger
  }
  // ...
}
```

### 4.2 Fix: `src/routes/_auth/notes/-components/AppSidebar.tsx`

The `onDelete` function has a no-op for folders. Add the missing folder deletion.

**Current (no-op for folders):**
```typescript
const onDelete = async (itemType: "folder" | "note", itemId: string) => {
    if (itemType === "note") {
      // ... delete note ...
      return;
    } else {
      return;   // BUG: folder deletion is a no-op
    }
};
```

**Fixed:**
```typescript
const { remove: removeNote } = useNoteActions();
const { remove: removeFolder } = useFolderActions();

const onDelete = async (itemType: "folder" | "note", itemId: string) => {
    if (itemType === "note") {
      await removeNote(itemId);
      return;
    } else {
      await removeFolder(itemId);   // FIXED
      return;
    }
};
```

**Effort:** ~10 lines across two files, low.

---

## Phase 5: Update Call Sites to New API Names

The generic hook returns `{ create, save, remove, removeMany }`. Existing call sites use
`{ createNote, saveNote, deleteNote, deleteNotes }` and `{ createFolder, saveFolder, deleteFolder }`.

Two options (team's choice):

**Option A — Destructure with aliases (zero internal refactoring):**
```typescript
const { create: createNote, save: saveNote, remove: deleteNote, removeMany: deleteNotes } = useNoteActions();
const { create: createFolder, save: saveFolder, remove: deleteFolder } = useFolderActions();
```
Pros: call sites unchanged. Cons: verbose destructuring at each usage point.

**Option B — Rename in-place (search-and-replace):**
```
createNote  → create
saveNote    → save
deleteNote  → remove
deleteNotes → removeMany
createFolder → create
saveFolder   → save
deleteFolder → remove
```
Pros: clean, consistent API. Cons: changes ~10 call sites across 5 files.

**Files affected by Option B:**
- `src/routes/_auth/notes/index.tsx` — `createNote`, `saveNote`
- `src/routes/_auth/notes/-components/AppSidebar.tsx` — `createNote`, `saveNote`, `createFolder`, `saveFolder`
- `src/routes/_auth/notes/-components/noteId.tsx` — `saveNote`
- `src/routes/_auth/notes/-components/NoteCard.tsx` — `remove` (already fixed in Phase 4)
- `src/routes/_auth/notes/-components/FilterFloatingBar.tsx` — (check if it uses action hooks)

**Effort:** ~15 lines of search-and-replace, trivial.

---

## Phase 6: Rewrite the Sync Engine

### 6.1 Modify: `src/hooks/useSyncEngine.ts`

This is the core change. Replace timestamp-diffing with change-log reading.

**Current approach:**
- Read `db.notes.where("updatedAt").above(lastSyncedAt)` + `db.folders` equivalent
- Send full entity list with pagination cursor
- After sync, update `lastSyncedAt` in localStorage

**New approach:**
- Read `db.changes.where("synced").equals(false)`
- Map them to entity payloads (already JSON-stringified in `payload`)
- Send as change-list to backend
- On success, mark those changes as `synced: true`
- Downstream processing remains: backend returns updated entities → `bulkPut`

```typescript
import { db } from "@/db/syncNotesDb";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { apiClient } from "@/lib/api-client";
import type { SyncNoteResponse } from "@/types/response/SyncNoteResponse";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { ChangeRecord } from "@/types/ChangeRecord";

export function useGlobalSyncEngine() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationKey: ["sync_notes_mutation_key"],
    mutationFn: async () => {
      // 1. Read all un-synced changes, ordered by insertion order (id)
      const unsyncedChanges = await db.changes
        .where("synced")
        .equals(false)
        .toArray();

      // Sort by id to preserve operation order
      unsyncedChanges.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

      if (unsyncedChanges.length === 0) return; // nothing to sync

      await executeChangeSync(unsyncedChanges, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foldersList() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notesList() });
    },
    onError: (error) => {
      toast.error("Sync failed");
      console.error(error);
    },
    retry: 3,
  });

  async function executeChangeSync(
    changes: ChangeRecord[],
    cursor: string | null,
  ) {
    // Map changes to the format backend expects
    const changesPayload = changes.map((c) => ({
      changeId: c.id,
      entityType: c.entityType,
      entityId: c.entityId,
      operation: c.operation,
      entity: JSON.parse(c.payload),   // expand back to object
      timestamp: c.timestamp,
    }));

    const response = await apiClient(`${BASE_URL}/notes/sync`, {
      method: "POST",
      body: JSON.stringify({
        changes: changesPayload,
        cursor,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server failed to sync ${response.status}`);
    }

    const { data } = (await response.json()) as {
      status: number;
      data: SyncNoteResponse;
      message: string;
    };

    // 2. Mark acknowledged changes as synced
    if (data.processedChangeIds && data.processedChangeIds.length > 0) {
      await db.changes.bulkUpdate(
        data.processedChangeIds.map((id) => ({
          key: id,
          changes: { synced: true },
        })),
      );
    }

    // 3. Downstream: apply server-sent entities
    await db.transaction("rw", [db.notes, db.folders], async () => {
      if (data.folders.length > 0) {
        const downstreamFolders = data.folders.map((f) => ({
          ...f,
          updatedAt: new Date(f.updatedAt).toString(),
        }));
        await db.folders.bulkPut(downstreamFolders);
        const hardDeleteFolders = downstreamFolders
          .filter((f) => f.isDeleted)
          .map((f) => f.id);
        if (hardDeleteFolders.length > 0) {
          await db.folders.bulkDelete(hardDeleteFolders);
        }
      }

      if (data.notes.length > 0) {
        const downstreamNotes = data.notes.map((n) => ({
          ...n,
          updatedAt: new Date(n.updatedAt).toString(),
        }));
        await db.notes.bulkPut(downstreamNotes);
        const hardDeleteNotes = downstreamNotes
          .filter((n) => n.isDeleted)
          .map((n) => n.id);
        if (hardDeleteNotes.length > 0) {
          await db.notes.bulkDelete(hardDeleteNotes);
        }
      }

      // 4. Paginate if more downstream data
      if (data.hasMore) {
        // For paginated downstream, we pass no client changes (they were already sent)
        await executeChangeSync([], data.nextCursor);
      }
    });
  }

  return {
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
  };
}
```

**Key points:**
- `lastSyncedAt` localStorage is no longer needed for correctness (can be removed or kept as a fallback).
- Changes are sent in insertion order (`ORDER BY id`), preserving operation sequence.
- Backend acknowledges specific change IDs → client marks them `synced: true`.
- Downstream processing (receiving server updates) is unchanged.

### 6.2 Modify: `src/types/response/SyncNoteResponse.ts`

Add the `processedChangeIds` field:

```typescript
import type { Folder } from "../Folder";
import type { Note } from "../Note";

export interface SyncNoteResponse {
  processedChangeIds: number[];          // NEW: which client changes were acknowledged
  processedFolderIds: string[];
  processedNoteIds: string[];
  folderConflicts: string[];
  noteConflicts: string[];
  folders: Folder[];
  notes: Note[];
  nextCursor: string | null;
  hasMore: boolean;
  serverTime: string;
}
```

**Effort:** ~3 lines, trivial.

---

## Phase 7: Cleanup & Fallback

### 7.1 Remove `lastSyncedAt` dependency (optional)

Since Phase 5 makes `useSyncEngine` read from the `changes` table directly, the `useLocalStorage(LOCAL_STORAGE_SYNC_KEY, ...)` is no longer needed for sync logic.

**Files to touch:**
- `src/hooks/useSyncEngine.ts` — remove `useLocalStorage` import and usage
- `src/lib/constants.ts` — optionally remove `LOCAL_STORAGE_SYNC_KEY`

This can be deferred or kept as a secondary fallback.

### 7.2 Periodic cleanup of old synced changes

To prevent the `changes` table from growing indefinitely, add a cleanup mechanism:

```typescript
// In useSyncEngine, after successful sync:
await db.changes.where("synced").equals(true).filter(c => {
  const age = Date.now() - new Date(c.timestamp).getTime();
  return age > 7 * 24 * 60 * 60 * 1000; // older than 7 days
}).delete();
```

This can be done in Phase 6 or later.

**Effort:** ~10 lines, low.

---

## Summary of Changes

| Phase | File | Action | Lines | Complexity |
|---|---|---|---|---|
| 1 | `src/types/ChangeRecord.ts` | **CREATE** | ~15 | Trivial |
| 2 | `src/db/syncNotesDb.ts` | MODIFY | ~8 | Low |
| 3 | `src/lib/entity-actions.ts` | **CREATE** | ~80 | Medium |
| 3 | `src/hooks/useNoteActions.ts` | REWRITE (thin wrapper) | ~30 | Low |
| 3 | `src/hooks/useFolderActions.ts` | REWRITE (thin wrapper) | ~30 | Low |
| 4 | `src/routes/_auth/notes/-components/NoteCard.tsx` | MODIFY | ~5 | Low |
| 4 | `src/routes/_auth/notes/-components/AppSidebar.tsx` | MODIFY | ~5 | Low |
| 5 | Call-site renames (5 files) | MODIFY | ~15 | Trivial |
| 6 | `src/hooks/useSyncEngine.ts` | MODIFY | ~50 | **Medium-High** |
| 6 | `src/types/response/SyncNoteResponse.ts` | MODIFY | ~3 | Trivial |
| 7 | Cleanup (optional) | MODIFY | ~10 | Low |

| | **Total** | **11–12 files** | **~251 lines** | |

> **Net code reduction:** Phase 3 replaces ~120 lines of duplicated hook logic with ~80 lines of generic
> factory + ~60 lines of thin wrappers. Adding a 3rd entity (tags, bookmarks) adds only ~25 lines vs.
> ~40 lines of copy-paste.

### Files NOT touched (no changes needed)
- `src/context/SyncContext.tsx` — interface unchanged
- `src/components/SyncManager.tsx` — triggers `sync()`, doesn't care how sync works
- `src/hooks/useNotes.ts` / `useFolders.ts` — queries stay the same
- `src/hooks/useNoteDetail.ts` — reads from `db.notes`, unchanged
- `src/context/NotesContext.tsx` / `NotesViewContext.tsx` — no changes
- `src/store/store.tsx` — no changes
- `src/lib/api-client.ts` — no changes (endpoint stays `POST /notes/sync`)
- `src/lib/query-keys.ts` — no changes
- All `src/components/ui/*` — no changes
- All route files (except Phase 4 bugfixes) — no changes

---

## Backend Coordination

The backend `POST /notes/sync` endpoint needs to accept the new shape. The request body changes from:

```jsonc
// OLD
{
  "folders": [...],
  "notes": [...],
  "lastSyncedAt": "...",
  "cursor": null
}
```

to:

```jsonc
// NEW
{
  "changes": [
    {
      "changeId": 1,
      "entityType": "note",
      "entityId": "uuid-abc",
      "operation": "update",
      "entity": { /* full note object */ },
      "timestamp": "2026-07-08T..."
    }
  ],
  "cursor": null
}
```

And the response must include:

```jsonc
{
  "data": {
    "processedChangeIds": [1, 2, 3],   // NEW: acknowledge these
    // ... existing fields unchanged
  }
}
```

The backend can still support the **old format** alongside the new one during a transition period by checking for the presence of the `changes` field vs `notes`/`folders`.

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| `changes` table grows unbounded | Phase 7 cleanup deletes entries older than 7 days |
| Dexie v2→v3 migration on existing user data | Additive only — new table, no existing data altered |
| Backend not yet supporting `changes` format | Can dual-write: keep old timestamp diff as fallback until backend is ready |
| Concurrent mutations during sync | Dexie transaction isolation ensures atomicity; IndexedDB is single-tab-consistent |
| Large payloads in `changes.payload` | Same size as current `notes`/`folders` arrays in sync; change-list is more granular |
