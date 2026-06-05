import type { Note } from "../Note";

export interface SyncNoteResponse {
  processedIds: string[];
  changes: Note[];
  nextCursor: string | null;
  hasMore: boolean;
  serverTime: string;
}
