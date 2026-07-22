# SyncNotes Frontend

## Syncing Process

The sync engine uses a **change-record-based** protocol. Every local mutation (create, update, delete) is captured by a DBCore middleware at the IndexedDB layer and stored as a lightweight `ChangeRecord`. A background `SyncService` drains these records and sends them to the server. The server processes them and returns any downstream changes from other devices.

```mermaid
sequenceDiagram
    participant Client
    participant Dexie as Dexie (IndexedDB)
    participant SS as SyncService
    participant API as Backend

    %% ── Local mutation ──
    Note over Client: user types in note title
    Client->>Dexie: db.notes.update(id, { title: "new" })
    Note over Dexie: DBCore middleware intercepts<br/>writes actual mutation + ChangeRecord
    Dexie-->>SS: onChangeHandler() — local change detected

    %% ── Sync scheduling ──
    SS->>SS: scheduleSync() — debounce 2s
    Note over SS: Also triggered by:<br/>• app mount<br/>• coming online<br/>• tab visible<br/>• 30s interval

    %% ── Drain loop ──
    loop until no unsent records
        SS->>Dexie: changeRecords.where("synced").equals(false).limit(200)
        Dexie-->>SS: [record1, record2, ...]

        SS->>API: POST /notes/sync/changes<br/>{ changes, lastSyncedAt, cursor }
        Note over API: $transaction — apply each ChangeRecord<br/>fetchDownstream (cursor-paginated)
        API-->>SS: { processedChangeIds, folders, notes,<br/>hasMore, nextCursor, serverTime }

        %% ── Apply results ──
        SS->>Dexie: changeRecords.bulkDelete(processedChangeIds)
        SS->>Dexie: skipChangeTracking() → bulkPut folders + notes
        Note over SS,Dexie: skipChangeTracking prevents<br/>feedback loop of new ChangeRecords

        %% ── Downstream pagination ──
        opt hasMore
            SS->>SS: fetch next page with cursor
        end
    end

    SS->>SS: checkpoint serverTime → localStorage

    %% ── UI updates ──
    Dexie-->>Client: useLiveQuery detects changes → UI re-renders
```

### Key design decisions

| Layer | Choice | Why |
|---|---|---|
| Change capture | DBCore middleware | Runs outside transaction scope, no `NotFoundError` |
| Payload format | Delta-only for updates | Title rename = 30 bytes, not 200 KB |
| Sync trigger | Debounced 2s + interval 30s | Responsive without hammering the server |
| Upstream batching | 200 records per request | Drains backlog without blocking |
| Downstream pagination | Cursor-based server-side | Handles initial sync of thousands of notes |
| Conflict handling | Last-write-wins (updatedAt) | Simple, predictable |
| New device sync | Empty changes + epoch lastSyncedAt | Server returns full dataset |
| Deletion | Soft-delete (isDeleted + deletedAt) | Undo support, audit trail |

### Data flow summary

```
Local mutation
  → DBCore middleware captures delta
  → ChangeRecord (synced=false) persisted to IndexedDB
  → SyncService.scheduleSync() debounced 2s
  → POST /notes/sync/changes
  → Server processes changes + returns downstream
  → Processed records deleted from IndexedDB
  → Downstream entities bulkPut into local DB
  → useLiveQuery triggers React re-render
```
