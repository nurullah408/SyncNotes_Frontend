import type { Entity } from "./Entity";

export interface Note extends Entity {
  title: string;
  folderId: string | null;
  content: string;
  searchContent: string;
}
