import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  FolderPlus,
  Plus,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { cn } from "@/lib/utils.ts";
import { useMemo, useState } from "react";
import { buildFlatList } from "@/lib/sidebar-utils.ts";
import type { FlatListItem } from "@/types/util-types/FlatListItem.ts";
import type { NoteItem } from "@/types/util-types/NoteItem.ts";
import { useGlobalStore } from "@/store/store.tsx";
import { db } from "@/db/syncNotesDb";
import type { Folder } from "@/types/entities/Folder";
import type { Note } from "@/types/entities/Note";
import { INITIAL_EDITOR_STATE } from "@/lib/constants";
import { FolderRow } from "./FolderRow";
import { NoteRow } from "./NoteRow";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const openModal = useGlobalStore((state) => state.openModal);

  const [collapsedFolders, setCollapsedFolders] = useState<
    Record<string, boolean>
    >({});

  const [editingFolders, setEditingFolders] = useState<Set<string>>(new Set());

  const notes:Note[] | undefined = useLiveQuery(
    () => {
      return db.notes.filter((n) => !n.isDeleted).toArray();
    }
  );

  const folders:Folder[] | undefined = useLiveQuery(
    () => {
      return db.folders.filter((f) => !f.isDeleted).toArray();
    }
  )

  const saveNote = async (note: Partial<Note> & { id: string }) => {
    await db.notes.update(note.id, {
      ...note,
    });
  }

  const createNote = async (note: Note) => {
    await db.notes.add({ ...note });
  }

  const createFolder = async (folder: Folder) => {
    await db.folders.add({ ...folder });
    setEditingFolders((prev) => {
      const newSet = new Set(prev);
      newSet.add(folder.id)
      return newSet;
    });
  }

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

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
  };

  const onCreateNewFolder = async () => {
    const newFolderId = crypto.randomUUID();
    const newFolder:Folder = {
      id: newFolderId,
      name: "Untitled",
      color: "#ffff",
      createdAt: new Date().toISOString(),
      deletedAt: null,
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    }
    await createFolder(newFolder);
  }

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

  const isLoading = !folders || !notes;

  return (
    <Sidebar>
      <SidebarHeader className="flex-row h-16 items-center justify-between font-bold text-primary">
        Sync Notes
        <SidebarTrigger className="rounded-[10px]" />
      </SidebarHeader>
      <SidebarContent className="px-2 mt-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={onCreateNewNote}
            variant="outline"
            size="icon-sm"
            className="rounded-[10px]"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            onClick={onCreateNewFolder}
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
              if (item.type === "folder") {
                const folderChildren = visibleItems.filter(
                  (i) => i.type === "note" && i.folderId === item.id,
                ) as NoteItem[];
                return (
                  <div key={item.id}>
                    <FolderRow
                      folder={{ ...item }}
                      isOpen={!collapsedFolders[item.id]}
                      onDelete={onDelete}
                      editing={editingFolders.has(item.id)}
                      setEditing={setEditingFolders}
                      onToggle={() => toggleFolder(item.id)}
                    />
                    <div
                      className={cn(
                        "overflow-hidden mt-2 transition-[max-height,opacity] duration-300 ease-in-out",
                        collapsedFolders[item.id]
                          ? "max-h-0 opacity-0"
                          : "max-h-[100px] opacity-100",
                      )}
                    >
                      {folderChildren.map((note: NoteItem) => (
                        <NoteRow
                          key={note.id}
                          note={{ ...note }}
                          onMoveNote={(noteId: string) => onMoveNote(noteId)}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
              if (!item.folderId) {
                return (
                  <NoteRow
                    key={item.id}
                    note={{ ...item }}
                    onMoveNote={(noteId) => onMoveNote(noteId)}
                    onDelete={onDelete}
                  />
                );
              }
            })}
      </SidebarContent>
    </Sidebar>
  );
}
