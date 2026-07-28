import { FileText } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleClick(e as unknown as MouseEvent);
    }
  }

  return (
    <span
      onClick={handleClick}
      data-note-id={noteId}
      className="internal-link cursor-pointer inline-flex items-center gap-1 font-medium text-primary underline hover:text-primary/80"
      role="link"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <FileText className="size-4" />
      {title|| "Untitled"}
    </span>
  );
}
