import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
// TypeAheadPlugin
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
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
import { useCallback, useMemo, useState } from "react";
import ReactDOM from "react-dom";

class SlashMenuOption extends MenuOption {
  title: string;
  icon?: React.JSX.Element;
  onSelect: (queryString: string) => void;

  constructor(
    title: string,
    options: { onSelect: (queryString: string) => void },
    icon?: React.JSX.Element,
  ) {
    super(title);
    this.title = title;
    this.icon = icon;
    this.onSelect = options.onSelect;
  }
}

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
      }),
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
      }),
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
      }),
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
      }),
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
      }),
      new SlashMenuOption("Bullet List", {
        onSelect: () => {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        },
      }),
      new SlashMenuOption("Ordered List", {
        onSelect: () => {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        },
      }),
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
      }),
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
        return ReactDOM.createPortal(
          <div
            className="absolute z-50 bg-background rounded-lg shadow-lg max-w-75 min-w-45 p-1"
            style={{
              top:
                anchorElementRef.current.getBoundingClientRect().top +
                window.scrollY +
                24,
              left:
                anchorElementRef.current.getBoundingClientRect().left +
                window.scrollX,
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
                    className={`cursor-pointer px-3 py-2 ${isSelected ? "bg-accent font-medium" : ""}`}
                  >
                    {option.title}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        );
      }}
    />
  );
}
