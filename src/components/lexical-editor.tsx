import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

// Import the necessary core nodes for Markdown rendering
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
// Import the transformers
import {
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
  QUOTE,
} from "@lexical/markdown";

import type { EditorState } from "lexical";
import { InitializePlugin } from "@/routes/_auth/notes/-components/lexical-plugins/InitializePlugin";
import { EDITOR_THEME } from "@/lib/constants";
import { SlashMenuPlugin } from "@/routes/_auth/notes/-components/lexical-plugins/SlashMenuPlugin";
import { useRef, type MouseEvent } from "react";
import { InternalLinkNode } from "@/lib/lexical/nodes/InternalLinkNode";
import { InternalLinkPlugin } from "@/routes/_auth/notes/-components/lexical-plugins/InternalLinkPlugin";

interface EditorProps {
  initialContent: string;
  onChange: (editorState: EditorState) => void;
  namespace?: string;
  className?: string;
  placeholderClassName?: string;
  children?: React.ReactNode;
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error: Error): void {
  console.error(error);
}

export function Editor({
  initialContent,
  namespace,
  onChange,
  className = "",
  placeholderClassName = "",
  children,
}: EditorProps) {
  const initialConfig = {
    namespace: namespace ?? "SyncNotesEditor",
    theme: EDITOR_THEME,
    onError,
    editorState: null,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      InternalLinkNode,
    ],
  };

  const CUSTOM_MARKDOWN_TRANSFORMERS = [
    HEADING,
    UNORDERED_LIST,
    ORDERED_LIST,
    CHECK_LIST,
    QUOTE,
  ];

  const contentEditableRef = useRef<HTMLDivElement>(null);

  const handleOnClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable ref={contentEditableRef} className={className} />}
        placeholder={
          <div
            role="button"
            tabIndex={0}
            onClick={handleOnClick}
            className={placeholderClassName}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                contentEditableRef.current?.focus();
              }
            }}
          >
            Enter some text...
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ListPlugin />
      <CheckListPlugin />
      <InitializePlugin json={initialContent} />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <MarkdownShortcutPlugin transformers={CUSTOM_MARKDOWN_TRANSFORMERS} />
      <SlashMenuPlugin />
      <InternalLinkPlugin />
      {children}
    </LexicalComposer>
  );
}
