import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";

export class SlashMenuOption extends MenuOption {
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
