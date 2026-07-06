import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import type { LexicalEditor } from "lexical";

interface Props {
  editorRef: React.MutableRefObject<LexicalEditor | null>;
}

/**
 * Captures the LexicalEditor instance into a ref so parent components
 * can call editor.focus() from outside the LexicalComposer tree.
 */
export function EditorFocusPlugin({ editorRef }: Props) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);

  return null;
}
