import { Editor } from "@/components/lexical-editor";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useDebouncedCallback } from "@/hooks/useDebounce.ts";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/entities/Note";
import { useNavigate, useParams } from "@tanstack/react-router";
import { $getRoot, type EditorState } from "lexical";
import { Check, LoaderPinwheel, Search, Settings } from "lucide-react";
import { type ChangeEvent } from "react";
import { useSyncContext } from "@/context/SyncContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocalStorage } from "@/hooks/useLocalStorage.ts";
import { useGlobalStore } from "@/store/store.tsx";
import { db } from "@/db/syncNotesDb.ts";
import { useLiveQuery } from "dexie-react-hooks";
import { useHandleInternalLinkClick } from "../-hooks/useHandleInternalLinkClick";
import { NoteSettings } from "./NoteSettings";
import type { TNoteSettings } from "@/types/local-storage/NoteSettings";

export function Note() {
  const params = useParams({ from: "/_auth/notes/$noteId" });

  const navigate = useNavigate();

  const note = useLiveQuery(async () => {
    const existing = await db.notes.get(params.noteId);
    if (existing) {
      return existing;
    }
    return await navigate({
      to: '/notes',
    })
  }, [params.noteId]);

  const [noteSettings, setNoteSettings] = useLocalStorage<TNoteSettings>(
    "note-settings",
    {
      showSeconds: false,
      hourFormat: "24",
    },
  );

  function onChangeNoteSettings(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    setNoteSettings({ ...noteSettings, [name]: value });
  }

  const openModal = useGlobalStore((state) => state.openModal);

  const { open } = useSidebar();

  const { isSyncing } = useSyncContext();

  const updateNoteTitle = useDebouncedCallback(
    async (title: string) => {
      await db.notes.update(params.noteId, { title, updatedAt: new Date().toISOString() });
    },
    500,
  );

  const updateNoteContent = useDebouncedCallback(
    async (editorState: EditorState) => {
      const { json, textContent } = editorState.read(() => {
        const root = $getRoot();
        const json = root.isEmpty()
          ? INITIAL_EDITOR_STATE // This is already stringified
          : JSON.stringify(editorState.toJSON());
        return { json, textContent: root.getTextContent() };
      });

      await db.notes.update(params.noteId, {
        content: json,
        searchContent: textContent,
        updatedAt: new Date().toISOString(),
      } as Note);
    },
  500);

  function onOpenSearch() {
    openModal("GLOBAL_SEARCH", null);
  }

  function onChangeTitle(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.currentTarget;
    updateNoteTitle(value);
  }

  function onEditorChange(editorState: EditorState) {
    updateNoteContent(editorState);
  }

  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't steal focus from interactive elements or the editor itself
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'input, button, [role="button"], [role="menuitem"], [contenteditable="true"]',
      )
    )
      return;
  };

  useHandleInternalLinkClick();

  const title = note ? note.title : "Untitled";

  const content = note ? note.content : INITIAL_EDITOR_STATE;

  if (!note) {
    <div
      className="px-4 pt-2 border rounded h-full w-full"
    >
      <div className="flex gap-1 items-center justify-between">
        {/* Note header left side */}
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex-0 rounded-lg",
              open ? "invisible pointer-events-none" : "visible",
            )}
          >
            <SidebarTrigger />
          </Button>
        </div>
        <Button
          variant={"outline"}
          className="justify-between w-[40%] rounded-[10px]"
          onClick={onOpenSearch}
        >
          <Search />
          {"cmd+k"}
        </Button>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size={"icon-xs"} className="rounded-lg">
                <Settings className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="rounded-lg">
              <NoteSettings
                noteSettings={noteSettings}
                onChangeNoteSettings={onChangeNoteSettings}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="relative flex flex-col gap-2 h-full overflow-hidden">
        <div className="w-full animate-pulse duration-300"/>
        <h3 className="text-sm font-semibold text-gray-600">
          Last updated on{" "}
          <span className="italic text-sm animate-pulse duration-300" />
        </h3>
        <div className="h-[80%] rounded-lg overflow-y-auto animate-pulse duration-300" />
      </div>
    </div>
  }

  return (
    <div
      className="px-4 pt-2 border rounded h-full w-full"
      onClick={handleContainerClick}
    >
      <div className="flex gap-1 items-center justify-between">
        {/* Note header left side */}
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            className={cn(
              "flex-0 rounded-lg",
              open ? "invisible pointer-events-none" : "visible",
            )}
          >
            <SidebarTrigger />
          </Button>
        </div>
        <Button
          variant={"outline"}
          className="justify-between w-[40%] rounded-[10px]"
          onClick={onOpenSearch}
        >
          <Search />
          {"cmd+k"}
        </Button>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size={"icon-xs"} className="rounded-lg">
                <Settings className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="rounded-lg">
              <NoteSettings
                noteSettings={noteSettings}
                onChangeNoteSettings={onChangeNoteSettings}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="relative flex flex-col gap-2 h-full overflow-hidden">
        <input
          key={`${params.noteId}-${note ? 'new' : 'old'}`}
          name="noteTitle"
          className="text-3xl my-2 w-full border-none underline font-extrabold focus:outline-none"
          type="text"
          placeholder="Untitled"
          defaultValue={title}
          onChange={onChangeTitle}
        />
        <h3 className="text-sm font-semibold text-gray-600">
          Last updated on{" "}
          <span className="italic text-sm">
            {note?.updatedAt ? new Date(note.updatedAt).toLocaleString() : ""}
          </span>
        </h3>
        <div className="h-[80%] rounded-lg overflow-y-auto">
          <Editor
            className="px-1 w-full focus:outline-none"
            placeholderClassName="absolute top-22 left-1 text-gray-400"
            initialContent={content}
            onChange={onEditorChange}
          />
        </div>
      </div>
    </div>
  );
}
