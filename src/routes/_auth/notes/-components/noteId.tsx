import { Editor } from "@/components/lexical-editor";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useDebouncedCallback } from "@/hooks/useDebounce.ts";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/Note";
import { useParams } from "@tanstack/react-router";
import { $getRoot, type EditorState } from "lexical";
import { Check, Cog, LoaderPinwheel, Search } from "lucide-react";
import { type ChangeEvent } from "react";
import { useNoteActions } from "../../../../hooks/useNoteActions.ts";
import { useGlobalSyncEngine } from "../../../../hooks/useSyncEngine.ts";
import { useNoteDetail } from "../../../../hooks/useNoteDetail.ts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocalStorage } from "@/hooks/useLocalStorage.ts";
import type { NoteSettings } from "@/types/local-storage/NoteSettings.ts";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useGlobalStore } from "@/store/store.tsx";

export function Note() {
  const params = useParams({ from: "/_auth/notes/$noteId" });

  const [noteSettings, setNoteSettings] = useLocalStorage<NoteSettings>(
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

  const { sync, isSyncing } = useGlobalSyncEngine();

  const { saveNote } = useNoteActions(sync);

  const noteData = useNoteDetail(params.noteId);

  const note = noteData.data;

  const updateNote = useDebouncedCallback(async (updates: Partial<Note>) => {
    await saveNote({ ...updates, id: params.noteId });
  }, 500);

  function onOpenSearch() {
    openModal("GLOBAL_SEARCH", null);
  }

  function onChangeTitle(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.currentTarget;
    updateNote({ ...note, title: value });
  }

  function onEditorChange(editorState: EditorState) {
    editorState.read(() => {
      const root = $getRoot();

      const json = root.isEmpty()
        ? INITIAL_EDITOR_STATE // This is already stringified
        : JSON.stringify(editorState.toJSON());

      const textContent = root.getTextContent();

      updateNote({
        ...note,
        content: json,
        searchContent: textContent,
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
                <Cog className="size-4" />
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
          name="title"
          className="text-3xl my-2 w-full border-none underline font-extrabold focus:outline-none"
          type="text"
          placeholder="Untitled"
          defaultValue={title}
          onChange={onChangeTitle}
        />
        <h3 className="text-sm font-semibold text-gray-600">
          Last updated on{" "}
          <span className="italic text-sm">
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

function NoteSettings({
  noteSettings,
  onChangeNoteSettings,
}: {
  noteSettings: NoteSettings;
  onChangeNoteSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-1">
        <Label>Show Seconds?</Label>
        <Input
          name="showSeconds"
          className="size-4 accent-accent"
          type="checkbox"
          onChange={onChangeNoteSettings}
          checked={noteSettings.showSeconds}
        />
      </div>
      <div className="flex items-center justify-between gap-1">
        <Label>12 Hour Format?</Label>
        <Input
          name="hourFormat"
          className="size-4 accent-accent"
          type="checkbox"
          onChange={onChangeNoteSettings}
          checked={noteSettings.hourFormat === "12"}
        />
      </div>
    </div>
  );
}
