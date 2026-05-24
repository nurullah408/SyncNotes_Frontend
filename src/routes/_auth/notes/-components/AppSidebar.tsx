import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import type { Note } from "@/types/Note";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useNoteActions } from "../-hooks/useNoteActions.ts";
import { useGlobalSyncEngine } from "../-hooks/useSyncEngine.ts";

interface AppSidebarProps {
  notes: Note[] | undefined;
  isLoading: boolean;
}

export function AppSidebar({ notes, isLoading }: AppSidebarProps) {
  const navigate = useNavigate();

  const { sync } = useGlobalSyncEngine();
  const { saveNote } = useNoteActions(sync);

  async function createNewNote() {
    const newNoteId = crypto.randomUUID();
    await saveNote({
      id: newNoteId,
      title: "Untitled",
      content: INITIAL_EDITOR_STATE,
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    });
    navigate({ to: `/notes/${newNoteId}`, params: { noteId: newNoteId } });
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between font-bold text-primary">
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
                <SidebarMenuItem
                  key={note.id}
                  className="px-2 w-full flex justify-start rounded-[10px] overflow-hidden"
                >
                  <FileText className="h-full bg-primary text-white" />
                  <Link
                    className="w-full px-2 py-1 text-center [&.active]:bg-primary [&.active]:text-white"
                    to={`/notes/$noteId`}
                    params={{ noteId: note.id }}
                  >
                    {note.title}
                  </Link>
                </SidebarMenuItem>
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
