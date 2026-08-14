import { FileText } from "lucide-react";
import type { MouseEvent } from "react";

export function InternalLinkComponent({
  noteId,
  title,
  nodeKey }: { noteId: string; title: string; nodeKey: string }) {

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('internal-link:click', {
        detail: { noteId, nodeKey },
      })
    );
  }

  return (
    <a
      href={`/notes/${noteId}`}
      onClick={handleClick}
      data-note-id={noteId}
      className="internal-link cursor-pointer inline-flex items-center gap-1 font-medium text-primary underline hover:text-primary/80"
    >
      <FileText className="size-4" />
      {title|| "Untitled"}
    </a>
  );
}
