import type { Folder } from "../entities/Folder";

export interface FolderItem extends Folder {
  type: "folder";
  isCollapsed: boolean;
  depth: number;
}
