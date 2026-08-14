import { db } from "@/db/syncNotesDb";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import type { Folder } from "@/types/entities/Folder";
import { useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Folder as FolderIcon } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";

interface FolderSearchModalProps {
  noteId: string;
  onClose: () => void;
}

export function FolderSearchModal({
  noteId,
  onClose,
}: FolderSearchModalProps) {
  const [search, setSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback(
    (searchQuery: string) => setSearch(searchQuery),
    500,
  );

  const onChangeSearch = (event: ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(event.currentTarget.value);
  };

  const onMoveToFolder = async ({
    noteId,
    folderId,
  }: {
    noteId: string;
    folderId: string;
    }) => {

    await db.notes.update(noteId, {
      folderId,
    })
    onClose();
  };

  const folders = useLiveQuery(
    () => {
      return db.folders.filter((f) => !f.isDeleted).toArray();
    }
  );

  const isLoading = !folders;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form>
        <DialogContent
          aria-describedby="This is a modal search"
          className="min-w-2xl max-h-xl overflow-hidden rounded-[10px]"
        >
          <DialogDescription>Search your notes globally</DialogDescription>
          <DialogHeader>
            <DialogTitle className="text-sm">Global Search</DialogTitle>
            <Input
              className="flex-2"
              placeholder={"Search"}
              onChange={onChangeSearch}
              autoFocus
            />
          </DialogHeader>
          <div className="grid gap-1 overflow-y-auto">
            {isLoading
              ? Array.from({ length: 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse duration-500 w-full h-10"
                  />
                ))
              : folders?.map((res) => (
                  <SearchResult
                    key={res.id}
                    {...res}
                    onClick={() =>
                      onMoveToFolder({ noteId, folderId: res.id })
                    }
                  />
                ))}
            {!isLoading && search.length === 0 && (
              <span className="text-center text-muted-foreground">
                Type your query to get started
              </span>
            )}
            {!isLoading && search.length !== 0 && folders?.length === 0 && (
              <span className="text-center text-muted-foreground">
                No results found
              </span>
            )}
          </div>
        </DialogContent>
      </form>
    </Dialog>
  );
}

function SearchResult({
  name,
  updatedAt,
  onClick,
}: Folder & { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-description="Note link"
      className="w-full grid text-left hover:bg-accent hover:cursor-pointer p-1 rounded-lg"
    >
      <FolderIcon className="size-4" />
      <span className="text-lg font-bold">{name}</span>
      <p className="text-xs">
        Last Updated:{" "}
        <span className="italic">
          {new Date(updatedAt || "").toLocaleString()}
        </span>
      </p>
    </button>
  );
}
