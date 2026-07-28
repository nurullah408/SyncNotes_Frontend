import { db } from "@/db/syncNotesDb";
import { InternalLinkOption } from "@/lib/lexical/classes/InternalLinkOption";
import { $createInternalLinkNode } from "@/lib/lexical/nodes/InternalLinkNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalTypeaheadMenuPlugin, useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { useLiveQuery } from "dexie-react-hooks";
import { $createTextNode, type TextNode } from "lexical";
import { FileText } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export function InternalLinkPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>("");

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("[", {
    minLength: 0,
  });

  const allNotes = useLiveQuery(async () => {
    return db.notes.filter((n) => !n.isDeleted).toArray()
  }, []);

  const options = useMemo(() => {
    if (!allNotes) return [];

    const q = (queryString ?? "").toLowerCase().trim();
    if (!q) {
      return [
      ...allNotes
    ].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(
      0, 8
      ).map((n) => new InternalLinkOption(n.id, n.title))
    };

    return allNotes.filter(
      (n) => n.title.includes(q)
    ).map((n) => new InternalLinkOption(n.id, n.title || "Untitled"))

  }, [allNotes, queryString]);

  const onSelectOption = useCallback(
    (
      option: InternalLinkOption,
      textNodeContainingQuery: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        if (!textNodeContainingQuery) {
          closeMenu();
          return;
        }
        const fullText = textNodeContainingQuery.getTextContent();
        const marker = "[" + matchingString;
        const start = fullText.indexOf(marker);
        if (start === -1) {
          closeMenu();
          return;
        }
        const end = start + marker.length;
        if (end < fullText.length) {
          textNodeContainingQuery.splitText(end);
        }
        let target = textNodeContainingQuery;
        if (start > 0) {
          const [, right] = textNodeContainingQuery.splitText(start);
          target = right;
        }
        const internalLinkNode = $createInternalLinkNode(option.noteId, option.title);
        target.replace(internalLinkNode);
        const space = $createTextNode(" ");
        internalLinkNode.insertAfter(space);
        space.select(1, 1);
        closeMenu();
      })
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin<InternalLinkOption>
      options={options}
      onSelectOption={onSelectOption}
      onQueryChange={setQueryString}
      triggerFn={checkForTriggerMatch}

      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return (
          <InternalLinkMenu
            anchorElement={anchorElementRef.current}
            options={options}
            selectedIndex={selectedIndex}
            setHighlightedIndex={setHighlightedIndex}
            selectOptionAndCleanUp={selectOptionAndCleanUp}
          />
        )
      }}
    />
  )
}

type InternalLinkMenuProps = {
  anchorElement: HTMLElement;
  options: InternalLinkOption[];
  selectedIndex: number | null;
  setHighlightedIndex: (index: number) => void;
  selectOptionAndCleanUp: (option: InternalLinkOption) => void;
}

function InternalLinkMenu({
  anchorElement,
  options,
  selectedIndex,
  setHighlightedIndex,
  selectOptionAndCleanUp,
}: InternalLinkMenuProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!anchorElement) return;

    const updatePlacement = () => {
      const { top, left } = anchorElement.getBoundingClientRect();
      if (top === 0 && left === 0) return;
      setCoords({
        top: top + window.scrollY + 10,
        left: left + window.scrollX,
        ready: true
      });
    };

    updatePlacement();

    const observer = new MutationObserver(updatePlacement);

    observer.observe(anchorElement, {
      attributes: true,
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, [anchorElement]);

  return createPortal(
    <div
      className="bg-background text-sm shadow-lg max-w-45 min-w-45 p-1"
      style={{
        position: "absolute",
        zIndex: 50,
        padding: "calc(var(--spacing) * 1)",
        overflow: "auto",
        fontSize: "var(--text-sm)",
        maxWidth: "calc(var(--spacing) * 45)",
        maxHeight: "calc(var(--spacing) * 45",
        backgroundColor: "var(--background-color)",
        borderColor: "var(--accent)",
        borderWidth: "2px",
        borderRadius: "20px",
        top: coords.ready ? coords.top : 0,
        left: coords.ready ? coords.left : 0,
        opacity: coords.ready ? 1 : 0,
        visibility: coords.ready ? "visible" : "hidden",
      }}
    >
      <ul>
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <li
            key={option.noteId}
            ref={option.setRefElement}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => selectOptionAndCleanUp(option)}
            className={
              `flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 ${isSelected ? "bg-accent font-medium" : ""}`
            }
          >
            <FileText className="size-4" />
            <span>{option.title || "Untitled"}</span>
          </li>
        );
        })}
      </ul>
      {options.length === 0 && (
        <div>No notes found</div>
      )}
    </div>, document.body)
}
