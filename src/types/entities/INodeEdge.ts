import type { Entity } from "./Entity";

export interface INodeEdge extends Entity {
  sourceId: string;
  targetId: string;
}
