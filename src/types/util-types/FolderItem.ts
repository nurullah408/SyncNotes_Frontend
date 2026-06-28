import type { Folder } from "../Folder";

export interface FolderItem extends Folder {
  type: "folder";
  isCollapsed: boolean;
  depth: number;
}
