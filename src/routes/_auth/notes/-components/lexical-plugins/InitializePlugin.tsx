import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function InitializePlugin({ json }: { json: string | null }) {
  const [editor] = useLexicalComposerContext();
  const lastJsonRef = useRef<string | null>(null);

  useEffect(() => {
    // Only update the editor when json actually changes
    if (json && json !== lastJsonRef.current) {
      const editorState = editor.parseEditorState(json);
      editor.setEditorState(editorState);
      lastJsonRef.current = json;
    }
  }, [json, editor]);

  return null;
}
