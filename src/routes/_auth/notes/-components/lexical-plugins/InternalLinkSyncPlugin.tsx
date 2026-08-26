import { db } from "@/db/syncNotesDb";
import { $getInternalLinkTargetIds } from "@/lib/lexical/nodes/InternalLinkNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

async function reconcileEdges(sourceId: string, targetIds: Set<string>) {
  const existingEdges = await db.nodeEdges
    .where("sourceId")
    .equals(sourceId)
    .toArray();

  const now = new Date();

  const activeEdges = existingEdges.filter((edge) => !edge.isDeleted);

  const activeTargetIds = new Set(activeEdges.map((edge) => edge.targetId));

  const edgesToCreate = [...targetIds]
    .filter((targetId) => !activeTargetIds.has(targetId))
    .map((targetId) => ({
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deletedAt: null,
      isDeleted: false,
    }));

  await db.transaction("rw", db.nodeEdges, async () => {
    if (edgesToCreate.length > 0) {
      await db.nodeEdges.bulkAdd(edgesToCreate);
    }
  });
}

interface IInternalLinkSyncPluginProps {
  noteId: string;
}

export function InternalLinkSyncPlugin({
  noteId,
}: IInternalLinkSyncPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const targetIds = editorState.read(() => {
        return $getInternalLinkTargetIds();
      });

      reconcileEdges(noteId, targetIds);
    });
  }, [editor, noteId]);
  return null;
}
