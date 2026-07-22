import type { Folder } from "@/types/entities/Folder";
import type { Note } from "@/types/entities/Note";

export interface SyncChangesResponse {
  processedChangeIds: number[];
  folders: Folder[];
  notes: Note[];
  nextCursor: string | null;
  hasMore: boolean;
  serverTime: string;
}
