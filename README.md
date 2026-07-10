# SyncNotes Frontend

## Syncing Process

The sync engine uses a **change-record-based** protocol. Every local mutation (create, update, delete) is captured by a DBCore middleware at the IndexedDB layer and stored as a lightweight `ChangeRecord`. A background `SyncService` drains these records and sends them to the server. The server processes them and returns any downstream changes from other devices.

```mermaid
sequenceDiagram
    participant User
    participant App as React App
    participant MW as DBCore Middleware
    participant IDB as IndexedDB
    participant SS as SyncService
    participant API as POST /notes/sync/changes
    participant BE as NestJS Backend
    participant DB as PostgreSQL

    %% ── Local mutation ──
    User->>App: types in note title
    App->>IDB: db.notes.update(id, { title: "new" })
    IDB->>MW: mutate(req) — DBCore intercept
    MW->>IDB: downTable.mutate(req) — execute actual write
    MW->>MW: buildRecord(entityType, id, "update", { title: "new" })
    MW->>IDB: changeRecords.bulkAdd([record])
    MW-->>SS: onChangeHandler() — notify

    %% ── Sync scheduling ──
    SS->>SS: scheduleSync() — debounce 2s
    Note over SS: Also triggered by:<br/>• app mount<br/>• coming online<br/>• tab visible<br/>• 30s interval

    %% ── Drain loop ──
    loop until no unsent records
        SS->>IDB: changeRecords.where("synced").equals(false).limit(200)
        IDB-->>SS: [record1, record2, ...]

        SS->>API: POST { changes: [...], lastSyncedAt, cursor }
        API->>BE: SyncService.processSyncChanges()

        %% ── Backend processing ──
        BE->>DB: $transaction — apply each ChangeRecord
        Note over BE,DB: create → INSERT<br/>update → UPDATE<br/>delete → SET isDeleted=true, deletedAt=now

        BE->>DB: fetchDownstreamFolders(updatedAt > lastSyncedAt)
        BE->>DB: fetchDownstreamNotes(updatedAt > lastSyncedAt, cursor pagination)
        DB-->>BE: folders[], notes[], hasMore, nextCursor

        BE-->>API: { processedChangeIds, folders, notes, hasMore, nextCursor, serverTime }
        API-->>SS: response

        %% ── Apply results ──
        SS->>IDB: changeRecords.bulkDelete(processedChangeIds)
        SS->>SS: skipChangeTracking() — prevent feedback loop
        SS->>IDB: folders.bulkPut(...) + notes.bulkPut(...)
        SS->>IDB: bulkDelete(isDeleted entities)
        SS->>SS: resumeChangeTracking()

        %% ── Downstream pagination ──
        opt hasMore
            SS->>SS: fetch next page with cursor
        end
    end

    SS->>SS: checkpoint serverTime → localStorage

    %% ── UI updates ──
    IDB-->>App: useLiveQuery detects changes
    App-->>User: UI reflects synced state
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
