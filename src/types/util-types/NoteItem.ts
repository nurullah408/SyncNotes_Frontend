import type { Note } from "../entities/Note";

export interface NoteItem extends Note {
  type: "note";
  depth: number;
}
