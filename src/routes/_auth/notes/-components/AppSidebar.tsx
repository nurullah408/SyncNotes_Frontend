import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { db } from "@/db/syncNotesDb";
import { EMPTY_CONTENT } from "@/lib/constants";
import type { Note } from "@/types/Note";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export function AppSidebar({ notes }: { notes: Note[] }) {
  const navigate = useNavigate();

  async function createNewNote() {
    const newNoteId = crypto.randomUUID();
    await db.notes.add({
      id: newNoteId,
      title: "Untitled",
      content: EMPTY_CONTENT,
      lastUpdated: new Date().toISOString(),
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
        {notes.map((note: Note) => {
          return (
            <SidebarMenuItem
              key={note.id}
              className="w-full flex justify-center rounded-[10px] overflow-hidden"
            >
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
