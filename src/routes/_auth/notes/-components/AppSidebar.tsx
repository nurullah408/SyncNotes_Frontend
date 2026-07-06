import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Ellipsis,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Move,
  Plus,
  Trash,
} from "lucide-react";
import { useNoteActions } from "@/hooks/useNoteActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils.ts";
import { useMemo, useState } from "react";
import { buildFlatList } from "@/lib/sidebar-utils.ts";
import type { FlatListItem } from "@/types/util-types/FlatListItem.ts";
import type { FolderItem } from "@/types/util-types/FolderItem.ts";
import type { NoteItem } from "@/types/util-types/NoteItem.ts";
import { useFolderActions } from "@/hooks/useFolderActions.ts";
import { useGlobalStore } from "@/store/store.tsx";
import { useNotes } from "@/hooks/useNotes";
import { useFolders } from "@/hooks/useFolders";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: notes, isLoading: isNotesLoading } = useNotes();
  const { data: folders, isLoading: isFoldersLoading } = useFolders();

  const { createNote, saveNote } = useNoteActions();
  const { createFolder, saveFolder } = useFolderActions();

  const openModal = useGlobalStore((state) => state.openModal);

  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
  >({});

  const createNewFolder = async () => {
    await saveFolder(
      createFolder({
        id: crypto.randomUUID(),
        name: "Untitled",
      }),
    );
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const createNewNote = async () => {
    const note = createNote({
      id: crypto.randomUUID(),
      title: "Untitled",
    });
    await saveNote(note);
    navigate({ to: `/notes/${note.id}`, params: { noteId: note.id } });
  };

  const onDelete = async (itemType: "folder" | "note", itemId: string) => {
    if (itemType === "note") {
      const active = location.pathname.includes(`/notes/${itemId}`);
      if (active) {
        let nextRoute = "/notes";
        let nextParams = {};

        if (notes && notes.length > 1) {
          const currentIndex = notes.findIndex((n) => n.id === itemId);
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
      await saveNote({ id: itemId, isDeleted: true });
      return;
    } else {
      return;
    }
  };

  const onMoveNote = (noteId: string) => {
    openModal("MOVE_NOTE", { noteId });
  };

  const visibleItems = useMemo(() => {
    if (!notes || !folders) return [];
    return buildFlatList(notes, folders, collapsedFolders);
  }, [notes, folders, collapsedFolders]);

  const isLoading = isNotesLoading || isFoldersLoading;

  return (
    <Sidebar>
      <SidebarHeader className="flex-row h-16 items-center justify-between font-bold text-primary">
        Sync Notes
        <SidebarTrigger className="rounded-[10px]" />
      </SidebarHeader>
      <SidebarContent className="px-2 mt-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={createNewNote}
            variant="outline"
            size="icon-sm"
            className="rounded-[10px]"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            onClick={createNewFolder}
            variant="outline"
            size="icon-sm"
            className="rounded-[10px]"
          >
            <FolderPlus className="size-4" />
          </Button>
        </div>
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <SidebarMenuItem
                key={i}
                className="w-full flex justify-center rounded-[10px] overflow-hidden duration-400 animate-pulse"
              />
            ))
          : visibleItems?.map((item: FlatListItem) => {
              return item.type === "folder" ? (
                <FolderRow
                  key={`${item.type}-${item.id}`}
                  folder={{ ...item }}
                  isOpen={collapsedFolders[item.id]}
                  onDelete={onDelete}
                  onToggle={() => toggleFolder(item.id)}
                />
              ) : (
                <NoteRow
                  key={`${item.type}-${item.id}`}
                  note={{ ...item }}
                  onDelete={onDelete}
                  onMoveNote={(noteId) => onMoveNote(noteId)}
                />
              );
            })}
      </SidebarContent>
    </Sidebar>
  );
}

function FolderRow({
  folder,
  isOpen,
  onToggle,
  onDelete,
}: {
  folder: FolderItem;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (itemType: "folder", itemId: string) => Promise<void>;
}) {
  return (
    <SidebarMenuItem
      key={folder.id}
      className={cn(
        "flex items-center w-full border rounded-[30px] relative overflow-hidden",
      )}
    >
      <SidebarMenuButton
        asChild
        className={cn("p-0 hover:bg-transparent hover:text-none")}
        onClick={onToggle}
      >
        <div
          className={cn(
            "flex-6 py-0.5 pl-2 flex items-center gap-2 text-center rounded-l-[30px]",
          )}
        >
          {isOpen ? (
            <FolderOpen className="size-4" />
          ) : (
            <FolderClosed className="size-4" />
          )}{" "}
          {folder.name}
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn("flex-1 rounded-r-[30px] pr-0 hover:bg-transparent")}
        >
          <Ellipsis className={cn("h-full size-4")} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className="rounded-lg">
          <DropdownMenuItem asChild>
            <Button
              variant={"destructive"}
              className="w-full rounded-sm"
              onClick={() => onDelete("folder", folder.id)}
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

function NoteRow({
  note,
  onDelete,
  onMoveNote,
}: {
  note: NoteItem;
  onMoveNote: (noteId: string) => void;
  onDelete: (itemType: "note", itemId: string) => Promise<void>;
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
              variant={"outline"}
              className="w-full rounded-sm"
              onClick={() => onMoveNote(note.id)}
            >
              <Move className="size-4" />
              Move Note
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Button
              variant={"destructive"}
              className="w-full rounded-sm"
              onClick={() => onDelete("note", note.id)}
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
