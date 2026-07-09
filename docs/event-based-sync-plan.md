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

## Phase 3: Automatic Change-Logging via Dexie Hooks

### Problem

Every mutation on a synced entity (notes, folders, tags, bookmarks, etc.) must record a
`ChangeRecord` in the `changes` table for the sync engine to pick up. Rather than forcing
developers through a custom abstraction, we register **Dexie table hooks** that automatically
log changes whenever a mutation occurs — consumers simply use `db.notes.put()`, `db.notes.delete()`,
`useLiveQuery()`, `db.notes.where(...)`, etc. directly.

### Why Dexie Hooks?

| Approach | Atomicity | Flexibility | Complexity |
|---|---|---|---|
| Custom factory hook | ✅ same tx | ❌ locked API | Medium |
| **Dexie hooks** | ❌ separate tx (pragmatic) | ✅ full Dexie API | **Low** |
| Explicit `db.transaction()` everywhere | ✅ same tx | ✅ full API | High (dev burden) |

Dexie hooks fire synchronously just before a mutation (create/update/delete) on a table.
They receive the primary key, the entity object, and the active transaction. While they run
in the same implicit transaction as the mutation, that transaction only covers the target
table — so writing to `db.changes` from the hook creates a **separate** transaction. This
means entity write and ChangeRecord write are not strictly atomic, but in practice IndexedDB
failures are extremely rare and the sync engine naturally recovers on the next cycle.

> **Tradeoff accepted:** Non-atomic logging in exchange for full Dexie API access.
> In practice, IndexedDB partial-failure scenarios on modern browsers are effectively zero.

### How Dexie Hooks Work

Dexie supports four hook types per table:

| Hook | Fires when | Receives |
|---|---|---|
| `creating` | `table.add()` or `table.put()` with new key | `(primKey, obj, transaction)` |
| `updating` | `table.put()` with existing key, or `table.update()` | `(modifications, primKey, obj, transaction)` |
| `deleting` | `table.delete()` or `table.bulkDelete()` | `(primKey, obj, transaction)` |
| `reading` | `table.get()` or `table.toArray()` | `(obj)` |

For change-logging we only need `creating`, `updating`, and `deleting`. The hook callback
runs synchronously before the mutation is committed, allowing us to inspect the full entity
object and record the intended operation.

**Important Dexie behavior:**
- `put()`, `add()`, `update()`, `delete()`, and `bulkDelete()` **fire hooks**.
- `bulkPut()` and `bulkAdd()` do **NOT** fire individual hooks. This is critical: the sync
  engine uses `bulkPut` for downstream data and must NOT generate spurious change records.
- `bulkDelete()` DOES fire `deleting` for each item. Downstream hard-deletes need special
  handling (see §3.2).

### 3.1 Modify: `src/db/syncNotesDb.ts`

Add a helper function that registers hooks for any synced table, then register hooks for
`notes` and `folders`.

```typescript
import type { ChangeRecord } from "@/types/ChangeRecord";
import type { Folder } from "@/types/Folder";
import type { Note } from "@/types/Note";
import Dexie, { type Table } from "dexie";

// ---------------------------------------------------------------------------
// Skip flag — set during downstream sync to avoid spurious change records
// ---------------------------------------------------------------------------
let __skipChangeHooks = false;

export function skipChangeHooks() { __skipChangeHooks = true; }
export function resumeChangeHooks() { __skipChangeHooks = false; }

// ---------------------------------------------------------------------------
// Helper: register hooks that auto-log ChangeRecords on every mutation
// ---------------------------------------------------------------------------
function registerChangeHooks<T>(
  table: Table<T, string>,
  entityType: ChangeRecord["entityType"],
) {
  table.hook("creating", (primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changes.add({
      entityType,
      entityId: primKey as string,
      operation: "create",
      payload: JSON.stringify(obj),
      timestamp: new Date().toISOString(),
      synced: false,
    });
  });

  table.hook("updating", (_modifications, primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changes.add({
      entityType,
      entityId: primKey as string,
      operation: "update",
      payload: JSON.stringify(obj),
      timestamp: new Date().toISOString(),
      synced: false,
    });
  });

  table.hook("deleting", (primKey, obj) => {
    if (__skipChangeHooks) return;
    db.changes.add({
      entityType,
      entityId: primKey as string,
      operation: "delete",
      payload: JSON.stringify(obj),
      timestamp: new Date().toISOString(),
      synced: false,
    });
  });
}

export class SyncNotesDb extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  changes!: Table<ChangeRecord, number>;

  constructor() {
    super("SyncNotesDb");

    this.version(2).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
    });

    this.version(3).stores({
      notes: "id, title, updatedAt, isDeleted",
      folders: "id, name, updatedAt, isDeleted",
      changes: "++id, entityType, entityId, operation, timestamp, synced",
    });

    // Register hooks — tables are available as lazy proxies immediately
    registerChangeHooks(this.notes, "note");
    registerChangeHooks(this.folders, "folder");
  }
}

export const db = new SyncNotesDb();
```

**Key points:**
- Hooks are registered once in the constructor, right after `version()` calls. Dexie `Table`
  properties are lazy proxies — available immediately, no need for `db.on("ready")`.
- Every `db.notes.put()`, `db.notes.delete()`, `db.notes.add()`, `db.notes.update()`, and
  `db.notes.bulkDelete()` (and equivalents on `db.folders`) automatically creates a
  `ChangeRecord` — no developer discipline required.
- Adding a new synced entity (e.g., tags) requires exactly **one line**: calling
  `registerChangeHooks(db.tags, "tag")` after adding the table to the schema.
- The `__skipChangeHooks` flag is exported via `skipChangeHooks()`/`resumeChangeHooks()` so
  the sync engine can temporarily suppress hooks during downstream `bulkDelete` calls.

### 3.2 Handling `bulkDelete` in the Sync Engine

Since `bulkDelete` fires `deleting` hooks per item, the downstream sync in Phase 6 would
spuriously generate delete change records for server-sent hard-deletes. The sync engine
wraps these calls with the skip flag:

```typescript
// In useSyncEngine.ts — downstream processing (Phase 6)
import { skipChangeHooks, resumeChangeHooks } from "@/db/syncNotesDb";

// ... inside the downstream transaction:
skipChangeHooks();
await db.folders.bulkDelete(hardDeleteFolders);
await db.notes.bulkDelete(hardDeleteNotes);
resumeChangeHooks();
```

### 3.3 Lightweight Mutation Helper (optional)

With hooks handling change-logging, the only remaining boilerplate per mutation is:
1. React Query cache invalidation
2. `triggerSync()`

A tiny hook can centralize this without hiding Dexie:

```typescript
// src/hooks/useSyncActions.ts
import { useQueryClient } from "@tanstack/react-query";
import { useSyncContext } from "@/context/SyncContext";

export function useSyncActions(queryKeys: {
  list: () => readonly string[];
  detail?: (id: string) => readonly string[];
}) {
  const queryClient = useQueryClient();
  const { sync: triggerSync } = useSyncContext();

  const afterMutation = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    if (id && queryKeys.detail) {
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
    }
    triggerSync();
  };

  return { afterMutation };
}
```

**Usage at call sites** — consumers use Dexie directly for the mutation, then call `afterMutation`:

```typescript
const { afterMutation } = useSyncActions({
  list: () => QUERY_KEYS.notesList(),
  detail: (id) => QUERY_KEYS.notesDetail(id),
});

// Create
const note = { id: crypto.randomUUID(), title: "New", content: "...", /* ... */ };
await db.notes.put(note);
afterMutation(note.id);

// Update
await db.notes.update(id, { title: "Renamed" });
afterMutation(id);

// Soft-delete
await db.notes.update(id, { isDeleted: true, updatedAt: new Date().toISOString() });
afterMutation(id);

// Query — useLiveQuery or any Dexie API directly
const notes = useLiveQuery(() =>
  db.notes.where("folderId").equals(folderId).toArray()
);
```

> **Design philosophy:** Dexie is the source of truth for reads AND writes. Hooks handle
> change-logging transparently. `useSyncActions` is a convenience, not a requirement — any
> component can call `db.notes.put()` and the hooks will log it for sync; `afterMutation()`
> just keeps React Query caches fresh and triggers an immediate sync attempt.

### 3.4 Adding a new entity type (example: "Tags")

With Dexie hooks, adding a new synced entity is trivial:

```typescript
// 1. Add table to schema
this.version(4).stores({
  notes: "...",
  folders: "...",
  changes: "...",
  tags: "id, name, updatedAt, isDeleted",
});

// 2. Register hooks — one line
registerChangeHooks(this.tags, "tag");

// 3. Use anywhere — no wrapper needed
const tags = useLiveQuery(() => db.tags.toArray());
await db.tags.put({ id: crypto.randomUUID(), name: "important", /* ... */ });
```

No factory, no wrapper hook, no copy-paste logic. The entity is immediately available
for `where` queries, `useLiveQuery`, bulk operations — the full Dexie API.

**Effort:** ~55 lines for hook registration + skip flag in `syncNotesDb.ts`, ~20 lines for
the optional `useSyncActions.ts`. Replaces ~140 lines of factory + wrappers. Low complexity.

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

## Phase 5: Update Call Sites to Use Direct Dexie + `afterMutation`

Existing call sites use `useNoteActions()` and `useFolderActions()` which return
`createNote`, `saveNote`, `deleteNote`, `deleteNotes`, etc. With Dexie hooks handling
change-logging automatically, we can remove these wrapper hooks entirely and use Dexie
directly. The only remaining concern is React Query cache invalidation and sync triggering,
which the optional `useSyncActions` hook handles.

### Migration pattern

**Before (old):**
```typescript
const { createNote, saveNote, deleteNote, deleteNotes } = useNoteActions();
const note = createNote({ title: "New" });
await saveNote(note);
await deleteNote(id);
```

**After (new):**
```typescript
const { afterMutation } = useSyncActions({
  list: () => QUERY_KEYS.notesList(),
  detail: (id) => QUERY_KEYS.notesDetail(id),
});

// Create — build defaults inline, put into Dexie
const note: Note = {
  id: crypto.randomUUID(),
  title: "New",
  folderId: null,
  content: INITIAL_EDITOR_STATE,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDeleted: false,
  deletedAt: null,
};
await db.notes.put(note);
afterMutation(note.id);

// Update
await db.notes.update(id, { title: "Renamed" });
afterMutation(id);

// Soft-delete
await db.notes.update(id, { isDeleted: true, updatedAt: new Date().toISOString() });
afterMutation(id);

// Batch soft-delete
for (const id of ids) {
  await db.notes.update(id, { isDeleted: true, updatedAt: new Date().toISOString() });
}
afterMutation(); // invalidate list only
```

Change-logging for all these operations happens transparently via the Dexie hooks
registered in Phase 3 — no `db.changes` calls needed at call sites.

### Files affected

- `src/routes/_auth/notes/index.tsx` — replace `useNoteActions` with direct Dexie + `useSyncActions`
- `src/routes/_auth/notes/-components/AppSidebar.tsx` — replace `useNoteActions`/`useFolderActions`
- `src/routes/_auth/notes/-components/noteId.tsx` — replace `useNoteActions`
- `src/routes/_auth/notes/-components/NoteCard.tsx` — already fixed in Phase 4
- `src/routes/_auth/notes/-components/FilterFloatingBar.tsx` — check if it uses action hooks

### Optional: Keep thin wrappers for backward compat

If the team prefers minimal diff, keep `useNoteActions.ts` and `useFolderActions.ts` as
thin wrappers that delegate to direct Dexie internally (no factory, no generic abstraction):

```typescript
// src/hooks/useNoteActions.ts (thin wrapper — optional)
import { db } from "@/db/syncNotesDb";
import { useSyncActions } from "@/hooks/useSyncActions";
import { QUERY_KEYS, INITIAL_EDITOR_STATE } from "@/lib/constants";
import type { Note } from "@/types/Note";

export function useNoteActions() {
  const { afterMutation } = useSyncActions({
    list: () => QUERY_KEYS.notesList(),
    detail: (id) => QUERY_KEYS.notesDetail(id),
  });

  const createNote = (input: Partial<Note> = {}): Note => ({
    id: input.id || crypto.randomUUID(),
    title: input.title || "Untitled",
    folderId: input.folderId || null,
    content: input.content || INITIAL_EDITOR_STATE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    deletedAt: null,
  } as Note);

  const saveNote = async (note: Note) => {
    await db.notes.put(note);
    afterMutation(note.id);
  };

  const deleteNote = async (id: string) => {
    await db.notes.update(id, { isDeleted: true, updatedAt: new Date().toISOString() });
    afterMutation(id);
  };

  return { createNote, saveNote, deleteNote };
}
```

But this is entirely optional — the hooks auto-log, so call sites can also use `db.notes`
directly if they need `where` queries, `useLiveQuery`, or other Dexie features.

**Effort:** ~20 lines across 3–5 files. Trivial.

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
import { db, skipChangeHooks, resumeChangeHooks } from "@/db/syncNotesDb";
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
          skipChangeHooks();
          await db.folders.bulkDelete(hardDeleteFolders);
          resumeChangeHooks();
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
          skipChangeHooks();
          await db.notes.bulkDelete(hardDeleteNotes);
          resumeChangeHooks();
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
- Downstream `bulkDelete` calls are wrapped with `skipChangeHooks()`/`resumeChangeHooks()` to prevent the Dexie hooks from generating spurious delete change records for server-sent hard-deletes.

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
| 3 | `src/db/syncNotesDb.ts` | MODIFY (add hooks + skip flag) | ~55 | Low |
| 3 | `src/hooks/useSyncActions.ts` | **CREATE** (optional) | ~20 | Low |
| 4 | `src/routes/_auth/notes/-components/NoteCard.tsx` | MODIFY | ~5 | Low |
| 4 | `src/routes/_auth/notes/-components/AppSidebar.tsx` | MODIFY | ~5 | Low |
| 5 | Call-site updates (3–5 files) | MODIFY | ~20 | Low |
| 6 | `src/hooks/useSyncEngine.ts` | MODIFY | ~50 | **Medium-High** |
| 6 | `src/types/response/SyncNoteResponse.ts` | MODIFY | ~3 | Trivial |
| 7 | Cleanup (optional) | MODIFY | ~10 | Low |

| | **Total** | **10–11 files** | **~233 lines** | |

> **Net code reduction:** Phase 3 replaces ~140 lines of factory + wrapper hooks with ~55 lines of
> hook registration + optional ~20 line helper. Adding a 3rd entity (tags, bookmarks) adds only
> ~5 lines (one `registerChangeHooks` call + schema entry) vs. ~25 lines of factory config + wrapper.
> Consumers also gain full access to Dexie's API: `useLiveQuery`, `where` clauses, `bulkPut`, etc.

### Files NOT touched (no changes needed)
- `src/context/SyncContext.tsx` — interface unchanged
- `src/components/SyncManager.tsx` — triggers `sync()`, doesn't care how sync works
- `src/hooks/useNotes.ts` / `useFolders.ts` — queries stay the same; can optionally switch to `useLiveQuery`
- `src/hooks/useNoteDetail.ts` — reads from `db.notes`, unchanged
- `src/hooks/useNoteActions.ts` / `useFolderActions.ts` — can be deleted or kept as thin wrappers (Phase 5)
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
