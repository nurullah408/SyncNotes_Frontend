import { Editor } from "@/components/lexical-editor";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useDebouncedCallback } from "@/hooks/useDebounce.ts";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/Note";
import { useParams } from "@tanstack/react-router";
import { $getRoot, type EditorState } from "lexical";
import { Check, LoaderPinwheel } from "lucide-react";
import { type ChangeEvent } from "react";
import { useNoteActions } from "../-hooks/useNoteActions.ts";
import { useGlobalSyncEngine } from "../-hooks/useSyncEngine.ts";
import { useNoteDetail } from "../-hooks/useNoteDetail.ts";

export function Note() {
  const params = useParams({ from: "/_auth/notes/$noteId" });

  const { open } = useSidebar();

  const { sync, isSyncing } = useGlobalSyncEngine();

  const { saveNote } = useNoteActions(sync);

  const noteData = useNoteDetail(params.noteId);

  const note = noteData.data;

  const updateNote = useDebouncedCallback(async (updates: Partial<Note>) => {
    await saveNote({ ...updates, id: params.noteId });
  }, 500);

  function onChangeTitle(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.currentTarget;
    updateNote({ ...note, title: value });
  }

  function onEditorChange(editorState: EditorState) {
    editorState.read(() => {
      const root = $getRoot();

      const json = root.isEmpty()
        ? INITIAL_EDITOR_STATE
        : JSON.stringify(editorState.toJSON());

      updateNote({
        ...note,
        content: json,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  const title = note ? note.title : "Untitled";
  const content = note ? note.content : INITIAL_EDITOR_STATE;

  if (!note) {
    return (
      <div className="">
        <div className="duration-500 animate-pulse" />
        <div className="h-full duration-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div key={params.noteId} className="px-4 pt-2 border rounded h-full w-full">
      <div className="flex gap-1 items-center justify-between">
        {/* Note header left side */}
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex-0 rounded-lg",
              open ? "invisible pointer-events-none" : "visible",
            )}
            asChild
          >
            <SidebarTrigger />
          </Button>
        </div>
        {/* Note header right side */}
        <div className="flex gap-1 items-center">
          <div className="flex items-center gap-1">
            {isSyncing ? (
              <>
                <LoaderPinwheel className="text-gray-500 duration-400 animate-spin size-4" />
              </>
            ) : (
              <>
                <Check className="text-accent-foreground size-4" />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="relative flex flex-col gap-2 h-full overflow-hidden">
        <input
          name="title"
          className="text-3xl my-2 w-full border-none underline font-extrabold focus:outline-none"
          type="text"
          placeholder="Untitled"
          defaultValue={title}
          onChange={onChangeTitle}
        />
        <h3 className="text-sm font-semibold text-gray-600">
          Last updated on{" "}
          <span className="italic">
            {new Date(note?.updatedAt || "").toLocaleString()}
          </span>
        </h3>
        <div className="h-[80%] rounded-lg overflow-y-auto">
          <Editor
            className="px-1 focus:outline-none"
            placeholderClassName="absolute top-22 left-1 text-gray-400"
            initialContent={content}
            onChange={onEditorChange}
          />
        </div>
      </div>
    </div>
  );
}
