import type { Note } from "../Note";

export interface NoteItem extends Note {
  type: "note";
  depth: number;
}
