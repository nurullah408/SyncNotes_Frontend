import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { db } from "@/db/syncNotesDb";
import { cn } from "@/lib/utils";
import type { FolderItem } from "@/types/util-types/FolderItem";
import { Ellipsis, FolderClosed, FolderOpen, Trash } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type KeyboardEvent, type MouseEvent, type SetStateAction } from "react";

interface FolderRowProps {
  folder: FolderItem;
  isOpen: boolean;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<Set<string>>>;
  onToggle: () => void;
  onDelete: (itemType: "folder", itemId: string) => Promise<void>;
}

export function FolderRow({
  folder,
  isOpen,
  editing,
  setEditing,
  onToggle,
  onDelete,
}: FolderRowProps) {

  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(folder.name);

  const setIsEditing = (editing: boolean) => {
    if (editing) {
      setEditing((prev) => {
        const newSet = new Set(prev);
        newSet.add(folder.id);
        return newSet;
      });
    } else {
      setEditing((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(folder.id)) {
          newSet.delete(folder.id);
        }
        return newSet;
      })
    }
  }

  const onDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    setIsEditing(true);
    inputRef.current?.focus();
  }

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setName(event.currentTarget.value)
  }

  const handleSave = async () => {
    if (name.trim() && name !== folder.name) {
      await db.folders.update(folder.id, {
        name: name.trim(),
      })
    }
    setIsEditing(false);
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
      return;
    }
    if (event.key === 'Escape') {
      setName(folder.name);
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (!editing) return;
    inputRef?.current?.select();
    inputRef?.current?.focus();
  }, [editing]);

  return (
    <SidebarMenuItem
      key={folder.id}
      className={cn(
        "flex items-center w-full border rounded-[30px] relative overflow-hidden",
      )}
    >
      <SidebarMenuButton
        asChild
        className={cn("p-0 overflow-hidden hover:bg-transparent hover:text-none")}
        onClick={onToggle}
      >
        <div
          className={cn(
            "flex-6 py-0.5 pl-2 flex items-center gap-2 text-center rounded-l-[30px] overflow-hidden",
          )}
          onDoubleClick={onDoubleClick}
        >
          {isOpen ? <FolderOpen className="size-4" /> : <FolderClosed className="size-4" />}
          {
            editing
              ? <Input
                className="text-ellipsis"
                ref={inputRef}
                value={name}
                onChange={onChange}
                onBlur={handleSave}
                onKeyDown={onKeyDown}
              />
              : <span className="text-ellipsis">
                {" "}
                {folder.name}
              </span>
          }
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
