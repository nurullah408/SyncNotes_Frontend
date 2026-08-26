# TODO: Note Links, Backlinks & Sub-pages

> Captured from a design review of the current `InternalLinkNode` implementation.
> Purpose: correct the existing inline-link node and address the edge cases surfaced.

---

## 1. Terminology (read first)

| Term | Definition | Where it lives |
|------|-----------|----------------|
| **Outgoing link** | An inline cross-reference from note A to note B (`A → B`) | Embedded in A's Lexical `content` as a node |
| **Backlink** | The *reverse* view: "which notes link *to* B?" (`B ← …`) | **Derived**, never stored |
| **Sub-page** | A parent/child hierarchy relationship (`parentId`) | Note metadata, **not** inline content |

**Key rule:** backlinks are a *derived view* over outgoing links. They must never be stored as their own entity.

---

## 2. Problems with the current `InternalLinkNode`

1. **Misnamed / wrong semantics** — `InternalLinkNode` is being conflated with "sub-page". It is actually an inline cross-reference. Rename to `NoteLinkNode` (or `WikiLinkNode`).
2. **Denormalized `title`** — the node stores `{ noteId, title }`. If the target note is renamed, every link showing that title goes stale. Resolution must be by `noteId`, not `title`.
3. **No dangling-reference handling** — if the target note is soft-deleted or hard-deleted, the link has no defined behavior.
4. **No extraction pass** — there is no code that walks the Lexical tree to collect link targets (required for backlinks).
5. **Removed dead export** — `$isInternalLinkNode` was unused; keep in mind any reintroduction should be justified.

---

## 3. Decisions (locked in)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Rename `InternalLinkNode` → `NoteLinkNode` | It is a cross-reference, not a sub-page |
| D2 | Backlinks are **client-side derived** (local reverse index) | Client already has all content offline; a server table would be a second source of truth |
| D3 | **No server `NoteLink` table for v1** | Adds drift risk + sync complexity for near-zero benefit at personal scale |
| D4 | Backlinks v1 show **names only** (no context snippets) | Simplest; Obsidian-style snippets deferred |
| D5 | Soft-deleted **target** → render link as strikethrough + unclickable | Signals "linked doc is gone" |
| D6 | Soft-deleted **source** → exclude from backlink lists | A trashed note must not pollute backlinks |
| D7 | Sub-pages = **separate feature** (`parentId`), built *after* backlinks | Different data model; don't conflate with links |
| D8 | Sub-page cycle prevention = **write-time ancestor walk** | LWW is blind to cross-record cycles |

---

## 4. Edge cases & their resolution

| Edge case | Behavior |
|-----------|----------|
| Target note renamed | Resolve link by `noteId`; display live title (fix stale `title`) |
| Target note soft-deleted | Link renders as strikethrough + non-clickable |
| Target note hard-deleted | Link becomes a broken/dangling reference; render as disabled + remove from backlinks |
| Source note soft-deleted | Excluded from target's backlink list |
| Mutual links (`A ↔ B`) | **Valid** — no cycle concern for links |
| Sub-page cycle (`A.parentId=B` ∧ `B.parentId=A`) | Rejected at write time via ancestor walk (arrival-order resolves concurrent case) |
| Concurrent offline re-parent | First edge accepted, second rejected by the walk (no LWW timestamp needed) |
| New device (cold start) | Backlinks empty until content is synced + local index rebuilt (accepted tradeoff) |

---

## 5. Ordered task list

### Phase A — Correct the inline link node
- [ ] **A1.** Rename `InternalLinkNode` → `NoteLinkNode` across the codebase (node class, imports, plugin, serialization type string).
- [ ] **A2.** Fix stale title: resolve link display by `noteId` (look up live title at render; keep `title` only as a fallback snapshot).
- [ ] **A3.** Handle deleted targets at render: soft-deleted → strikethrough + unclickable; hard-deleted/missing → disabled dangling state.

### Phase B — Link extraction & backlinks (client-side)
- [ ] **B1.** Write a single **extraction pass**: walk the Lexical tree, collect all `NoteLinkNode` `noteId`s.
- [ ] **B2.** Build a local reverse index: `Map<targetNoteId, Set<sourceNoteId>>`.
- [ ] **B3.** Rebuild the index on content change (note edit / sync-in). No query-cache invalidation needed — it's a derived index.
- [ ] **B4.** Backlink UI: when viewing note B, render `index[B]` as a list (names only), excluding soft-deleted sources.

### Phase C — Sub-pages (separate feature, after B)
- [ ] **C1.** Add `parentId` (self-referential FK, `onDelete: SetNull`) to the `Note` schema + migration.
- [ ] **C2.** Write-time ancestor walk: when setting `parentId = X`, walk up from X and reject if it reaches this note (cycle guard). Include a visited set / depth cap for defensive termination.
- [ ] **C3.** Sidebar tree UI for the hierarchy (re-parenting, "move to", breadcrumbs).

---

## 6. Open questions / deferred

- **Context snippets** — deferred to v2. If added, decide: store a `snippet` column (denormalized) vs. re-extract on demand.
- **Server `NoteLink` table** — revisit only if a future feature needs server-side backlinks (public sharing, search API, non-Lexical client). Reuse the extraction pass from B1 to populate it.
- **Backlink cold-start UX** — decide if an empty backlinks panel needs an "indexing…" state or is acceptable as-is.

---

## 7. Non-goals (explicitly out of scope for now)

- Obsidian-style "unlinked mentions" (title appears as plain prose, not a real link).
- Cross-device backlink sync as a first-class entity.
- Automatic two-way link graph visualization.
