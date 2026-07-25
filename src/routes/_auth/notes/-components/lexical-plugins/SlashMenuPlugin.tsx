import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
// TypeAheadPlugin
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
// functions and commands
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
// React Imports
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Heading1, Heading2, Heading3, Heading4, List, ListOrdered, Quote, Type } from "lucide-react";
import { SlashMenuOption } from "@/lib/lexical/classes/SlashMenuOption";


export function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>("");

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(() => {
    const baseOptions = [
      new SlashMenuOption("Paragraph", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node
                  .getTopLevelElementOrThrow()
                  .replace($createParagraphNode());
              });
            }
          });
        },
      },
        <Type className="size-4" />,
      ),
      new SlashMenuOption("Heading 1", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node
                  .getTopLevelElementOrThrow()
                  .replace($createHeadingNode("h1"));
              });
            }
          });
        },
      },
        <Heading1 className="size-4" />,
      ),
      new SlashMenuOption("Heading 2", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node
                  .getTopLevelElementOrThrow()
                  .replace($createHeadingNode("h2"));
              });
            }
          });
        },
      }, <Heading2 className="size-4" />,
      ),
      new SlashMenuOption("Heading 3", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node
                  .getTopLevelElementOrThrow()
                  .replace($createHeadingNode("h3"));
              });
            }
          });
        },
      },
        <Heading3 className="size-4" />,
      ),
      new SlashMenuOption("Heading 4", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node
                  .getTopLevelElementOrThrow()
                  .replace($createHeadingNode("h4"));
              });
            }
          });
        },
      }, <Heading4 className="size-4" />),
      new SlashMenuOption("Bullet List", {
        onSelect: () => {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        },
      }, <List className="size-4" />),
      new SlashMenuOption("Ordered List", {
        onSelect: () => {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        },
      }, <ListOrdered className="size-4" />),
      new SlashMenuOption("Quote", {
        onSelect: () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.getNodes().forEach((node) => {
                node.getTopLevelElementOrThrow().replace($createQuoteNode());
              });
            }
          });
        },
      }, <Quote className="size-4" />),
    ];

    if (queryString) {
      const regex = new RegExp(queryString, "i");
      return baseOptions.filter((option) => regex.test(option.title));
    }

    return baseOptions;
  }, [editor, queryString]);

  const onSelectOption = useCallback(
    (
      option: SlashMenuOption,
      textNodeContainingQuery: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        if (textNodeContainingQuery) {
          textNodeContainingQuery.remove();
        }
        option.onSelect(queryString || "");
        closeMenu();
      });
    },
    [editor, queryString],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashMenuOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) => {
        if (!anchorElementRef.current || options.length === 0) return null;
        return (
          <SlashMenu
            anchorElement={anchorElementRef.current}
            selectedIndex={selectedIndex}
            selectOptionAndCleanUp={selectOptionAndCleanUp}
            setHighlightedIndex={setHighlightedIndex}
            options={options}
          />
        );
      }}
    />
  );
}

function SlashMenu({
  anchorElement,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
  options,
}: {
  anchorElement: HTMLElement;
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: SlashMenuOption) => void;
  setHighlightedIndex: (index: number) => void;
  options: SlashMenuOption[];
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false });
  useLayoutEffect(() => {
    if (!anchorElement) return;

    const updatePlacement = () => {
      const rect = anchorElement.getBoundingClientRect();

      if (rect.top === 0 && rect.left === 0) {
        return;
      }

      setCoords({
        top: rect.top + window.scrollY + 10,
        left: rect.left + window.scrollX,
        ready: true,
      });
    };

    updatePlacement();
    // Observe changes to the anchor element to update the menu position
    const observer = new MutationObserver(updatePlacement);
    observer.observe(anchorElement, {
      attributes: true, // Observe attribute changes
      childList: true, // Observe child list changes
      subtree: true, // Observe subtree changes
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
              key={option.key}
              ref={option.setRefElement}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOptionAndCleanUp(option)}
              className={`flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 ${isSelected ? "bg-accent font-medium" : ""}`}
            >
              {option.icon && option.icon} {option.title}
            </li>
          );
        })}
      </ul>
    </div>,
    document.body,
  );
}
