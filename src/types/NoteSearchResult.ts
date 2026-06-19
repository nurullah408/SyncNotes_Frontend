import type { Note } from "./Note";

export interface SearchNoteResult extends Pick<
  Note,
  "id" | "title" | "updatedAt"
> {
  searchContent: string;
}
