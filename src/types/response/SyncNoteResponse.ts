import type { Folder } from "../Folder";
import type { Note } from "../Note";

export interface SyncNoteResponse {
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
