export type ChangeOperation = "create" | "update" | "delete";
export type ChangeEntityType = "folder" | "note" | "edge";

export type ChangeRecord = {
  id?: number;
  changeOperation: ChangeOperation;
  changeEntityType: ChangeEntityType;
  entityId: string;
  payload: string;
  timestamp: string;
  synced: boolean;
};
