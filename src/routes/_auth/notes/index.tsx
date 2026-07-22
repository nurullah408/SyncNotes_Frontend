import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePlus, LogOut, Plus, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/constants";
import { Button } from "@/components/ui/button";
import { db } from "@/db/syncNotesDb";
import type { Note } from "@/types/entities/Note";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";

export const Route = createFileRoute("/_auth/notes/")({
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

  const createNote = async (note: Note) => {
    await db.notes.add({ ...note });
  }

  const onCreateNewNote = async () => {
    const newNoteId = crypto.randomUUID();
    const newNote: Note = {
      id: newNoteId,
      title: "Untitled",
      content: INITIAL_EDITOR_STATE,
      searchContent: "",
      createdAt: new Date().toISOString(),
      deletedAt: null,
      isDeleted: false,
      folderId: null,
      updatedAt: new Date().toISOString(),
    };
    await createNote(newNote);
    navigate({ to: `/notes/$noteId`, params: { noteId: newNoteId } });
  }

  async function handleLogout() {
    try {
      await fetch(`${BASE_URL}/auth/signout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error(error);
    } finally {
      queryClient.clear();
      navigate({ to: "/login" });
    }
  }

  return (
    <div className="[view-transition-name:main-content] w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Dynamic Header Toolbar Row */}
      <Header className="justify-between border-b px-6 shrink-0 h-16 bg-white dark:bg-zinc-900">
        <div>
          <h4 className="text-sm font-bold text-muted-foreground">
            Sync Notes
          </h4>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="size-5 cursor-pointer" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>

      {/* Center Empty State Canvas Layout */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30 dark:bg-zinc-950/20">
        <div className="p-4 bg-white dark:bg-zinc-900 shadow-sm border rounded-2xl text-muted-foreground/60 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <FilePlus className="size-8" />
        </div>

        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          No Note Selected
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mt-1.5 mb-6 leading-relaxed">
          Select a document card directly from the sidebar list parameters
          navigation panel, or initialize a fresh editor canvas workspace right
          now.
        </p>

        <Button
          onClick={onCreateNewNote}
          className="gap-2 rounded-xl px-5 h-11 shadow-sm font-medium"
        >
          <Plus className="size-4" /> Create Fresh Note
        </Button>
      </div>
    </div>
  );
}
