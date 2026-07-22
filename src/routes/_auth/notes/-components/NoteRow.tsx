import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { NoteItem } from "@/types/util-types/NoteItem";
import { Link, useLocation } from "@tanstack/react-router";
import { Ellipsis, FileText, Move, Trash } from "lucide-react";

interface NoteRowProps {
  note: NoteItem;
  onMoveNote: (noteId: string) => void;
  onDelete: (itemType: "note", itemId: string) => Promise<void>;
}

export function NoteRow({
  note,
  onDelete,
  onMoveNote,
}: NoteRowProps) {
  const location = useLocation();

  const active = location.pathname.includes(`/notes/${note.id}`);

  return (
    <SidebarMenuItem
      key={note.id}
      className={cn(
        "flex items-center border rounded-[30px] relative overflow-hidden pl-2",
        active ? "bg-primary text-white" : "",
      )}
      style={{
        marginLeft: `${note.depth * 16}px`,
      }}
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
            "flex-6 py-0.5 flex items-center gap-2 text-center rounded-l-[30px] overflow-hidden",
          )}
          to={`/notes/$noteId`}
          params={{ noteId: note.id }}
        >
          <FileText
            className={cn("h-full size-4", active ? "text-white" : "")}
          />
          <span className="text-ellipsis">{note.title}</span>
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
        <DropdownMenuContent
          align="start"
          sideOffset={10}
          className="flex flex-col gap-2 rounded-lg"
        >
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
