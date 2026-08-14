import type { Note } from "../types/entities/Note";

export interface SearchNoteResult extends Pick<
  Note,
  "id" | "title" | "updatedAt"
> {
  searchContent: string;
}
