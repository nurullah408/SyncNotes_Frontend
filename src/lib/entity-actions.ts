import { useSyncContext } from "@/context/SyncContext";
import { db } from "@/db/syncNotesDb";
import type {
  ChangeEntityType,
  ChangeOperation,
  ChangeRecord,
} from "@/types/entities/ChangeRecord";
import type { Entity } from "@/types/entities/Entity";
import { useQueryClient } from "@tanstack/react-query";
import type { Table } from "dexie";

export interface EntityActionsConfig<TEntity extends Entity, TCreateInput> {
  table: Table<Entity, string>;
  entityType: ChangeEntityType;
  queryKeys: {
    list: () => readonly string[];
    detail: (id: string) => readonly string[];
  };
  create: (input: TCreateInput) => TEntity;
  merge?: (existing: TEntity | undefined, updates: Partial<TEntity>) => TEntity;
}

export function createEntityActions<TEntity extends Entity, TCreateInput>(
  config: EntityActionsConfig<TEntity, TCreateInput>,
) {
  return function useEntityActions() {
    const queryClient = useQueryClient();
    const { sync } = useSyncContext();
    // --- Helpers ----
    const defaultMerge = (
      existing: TEntity | undefined,
      updates: Partial<TEntity>,
    ): TEntity =>
      ({
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      }) as TEntity;

    const recordChange = (
      entityId: string,
      changeOperation: ChangeOperation,
      payload: TEntity | undefined,
    ): ChangeRecord => ({
      id: 0,
      changeEntityType: config.entityType,
      changeOperation,
      entityId,
      payload: JSON.stringify(payload ?? {}),
      timestamp: new Date().toISOString(),
      synced: false,
    });

    // public API
    const create = (input: TCreateInput): TEntity => {
      return config.create(input);
    };

    const save = async (update: Partial<TEntity> & { id: string }) => {
      if (!update.id) return;

      await db.transaction("rw", [config.table, db.changeRecords], async () => {
        const existing = await config.table.get(update.id);
        const changeOperation: ChangeOperation = existing ? "update" : "create";
        const merged = (config.merge ?? defaultMerge)(
          existing as TEntity,
          update,
        );

        await config.table.put(merged);
        await db.changeRecords.add(
          recordChange(update.id, changeOperation, merged),
        );
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      queryClient.invalidateQueries({
        queryKey: config.queryKeys.detail(update.id),
      });
      sync();
    };

    const removeOne = async (id: string) => {
      await db.transaction("rw", [config.table, db.changeRecords], async () => {
        const existing = await config.table.get(id);
        if (!existing) return;
        await config.table.update(id, {
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        });
        await db.changeRecords.add(
          recordChange(id, "delete", existing as TEntity),
        );
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      sync();
    };

    const removeMany = async (ids: string[]) => {
      if (ids.length === 0) return;
      await db.transaction("rw", [config.table, db.changeRecords], async () => {
        for (const id of ids) {
          await config.table.update(id, {
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          });
          const existing = await config.table.get(id);
          await db.changeRecords.add(
            recordChange(id, "delete", existing as TEntity),
          );
        }
      });

      queryClient.invalidateQueries({ queryKey: config.queryKeys.list() });
      sync();
    };

    return {
      create,
      save,
      removeOne,
      removeMany,
    } as const;
  };
}
