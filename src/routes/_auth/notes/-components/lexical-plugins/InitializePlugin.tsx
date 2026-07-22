import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function InitializePlugin({ json }: { json: string | null }) {
  const [editor] = useLexicalComposerContext();
  const lastJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!json || json === lastJsonRef.current) return;

    // Check if the editor already has this content (e.g. after a
    // debounced db.notes.update() → useLiveQuery re-render loop).
    // If so, skip setEditorState to avoid resetting the cursor.
    const editorJSON = JSON.stringify(editor.getEditorState().toJSON());
    if (editorJSON === json) {
      lastJsonRef.current = json;
      return;
    }

    // Genuinely new content (navigation, sync) — push it into the editor
    const editorState = editor.parseEditorState(json);
    editor.setEditorState(editorState);
    lastJsonRef.current = json;
  }, [json, editor]);

  return null;
}
