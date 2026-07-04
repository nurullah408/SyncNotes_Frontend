export const QUERY_KEYS = {
  // Note Keys
  notesAll: ["notesAll"] as const,
  notesList: () => [...QUERY_KEYS.notesAll, "notesList"] as const,
  notesListsFilter: (filters: string) =>
    [...QUERY_KEYS.notesList(), { filters }] as const,
  notesDetail: (id: string) => [...QUERY_KEYS.notesAll, "detail", id] as const,
  // Folder Keys
  foldersAll: ["folders"] as const,
  foldersList: () => [...QUERY_KEYS.foldersAll, "foldersList"] as const,
  foldersListFilter: (filters: string) =>
    [...QUERY_KEYS.foldersAll, { filters }] as const,
  foldersDetail: (id: string) =>
    [...QUERY_KEYS.foldersAll, "detail", id] as const,
};
