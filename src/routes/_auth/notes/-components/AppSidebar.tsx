import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import type { Note } from "@/types/Note";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Ellipsis, FileText, Plus, Trash } from "lucide-react";
import { useNoteActions } from "../-hooks/useNoteActions.ts";
import { useGlobalSyncEngine } from "../-hooks/useSyncEngine.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils.ts";

interface AppSidebarProps {
  notes: Note[] | undefined;
  isLoading: boolean;
}

export function AppSidebar({ notes, isLoading }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const { sync } = useGlobalSyncEngine();
  const { saveNote } = useNoteActions(sync);

  async function createNewNote() {
    const newNoteId = crypto.randomUUID();
    await saveNote({
      id: newNoteId,
      title: "Untitled",
      content: INITIAL_EDITOR_STATE,
      searchContent: "",
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    });
    navigate({ to: `/notes/${newNoteId}`, params: { noteId: newNoteId } });
  }

  async function deleteNote(noteId: string) {
    const active = location.pathname.includes(`/notes/${noteId}`);
    if (active) {
      let nextRoute = "/notes";
      let nextParams = {};

      if (notes && notes.length > 1) {
        const currentIndex = notes.findIndex((n) => n.id === noteId);
        const nextNote =
          currentIndex === notes.length - 1
            ? notes[currentIndex - 1]
            : notes[currentIndex + 1];
        if (nextNote) {
          nextRoute = "/notes/$noteId";
          nextParams = {
            $noteId: nextNote,
          };
        }
      }
      navigate({ to: nextRoute, params: nextParams });
    }
    await saveNote({ id: noteId, isDeleted: true });
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex-row h-16 items-center justify-between font-bold text-primary">
        Sync Notes
        <SidebarTrigger className="rounded-[10px]" />
      </SidebarHeader>
      <SidebarContent className="px-2 mt-2">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <SidebarMenuItem
                key={i}
                className="w-full flex justify-center rounded-[10px] overflow-hidden duration-400 animate-pulse"
              />
            ))
          : notes?.map((note: Note) => {
              return (
                <NoteItem key={note.id} note={note} deleteNote={deleteNote} />
              );
            })}
        <SidebarMenuItem className="w-full flex justify-center rounded-[10px] overflow-hidden">
          <Button
            variant="ghost"
            className="w-full rounded-lg"
            onClick={createNewNote}
          >
            <Plus /> New Note
          </Button>
        </SidebarMenuItem>
      </SidebarContent>
    </Sidebar>
  );
}

function NoteItem({
  note,
  deleteNote,
}: {
  note: Note;
  deleteNote: (note: string) => Promise<void>;
}) {
  const location = useLocation();

  const active = location.pathname.includes(`/notes/${note.id}`);

  return (
    <SidebarMenuItem
      key={note.id}
      className={cn(
        "flex items-center w-full border rounded-[30px] relative overflow-hidden",
        active ? "bg-primary text-white" : "",
      )}
    >
      <SidebarMenuButton
        asChild
        className={cn(
          "p-0 hover:bg-transparent hover:text-none",
          active ? "bg-primary text-white" : "",
        )}
      >
        <Link
          className={cn(
            "flex-6 py-0.5 pl-2 flex items-center gap-2 text-center rounded-l-[30px]",
          )}
          to={`/notes/$noteId`}
          params={{ noteId: note.id }}
        >
          <FileText
            className={cn("h-full size-4", active ? "text-white" : "")}
          />
          {note.title}
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex-1 rounded-r-[30px] pr-0 hover:bg-transparent",
            active ? "bg-primary text-white" : "",
          )}
        >
          <Ellipsis
            className={cn("h-full size-4", active ? "text-white" : "")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="rounded-lg">
          <DropdownMenuItem asChild>
            <Button
              variant={"destructive"}
              className="w-full rounded-sm"
              onClick={() => deleteNote(note.id)}
            >
              <Trash className="size-4" />
              Delete
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
