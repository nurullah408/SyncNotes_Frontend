import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";

export class InternalLinkOption extends MenuOption {
  noteId: string;
  title: string;

  constructor(noteId: string, title: string) {
    super(title);
    this.noteId = noteId;
    this.title = title;
  }
}
