export const INITIAL_EDITOR_STATE = JSON.stringify({
  root: {
    children: [
      {
        children: [],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

export const EDITOR_THEME = {
  // Theme styling goes here
  ltr: "text-left",
  rtl: "text-right",
  placeholder:
    "text-muted-foreground absolute top-4 left-4 pointer-events-none select-none",
  paragraph: "relative m-0 mb-2 last:mb-0",
  quote: "border-l-4 border-primary pl-4 italic text-muted-foreground my-4",
  heading: {
    h1: "text-4xl font-bold text-slate-900 tracking-tight mt-6 mb-2",
    h2: "text-2xl font-bold text-slate-800 tracking-tight mt-5 mb-2",
    h3: "text-xl font-bold text-slate-800 tracking-tight mt-4 mb-2",
    h4: "text-base font-bold",
    h5: "text-sm font-bold",
    h6: "text-xs font-bold",
  },
  list: {
    nested: {
      listitem: "list-none pl-4",
    },
    // 1. Move the specific list styles down, or keep them mutually exclusive
    ol: "list-decimal pl-6 my-2 gap-1",
    ul: "list-disc pl-6 my-2 gap-1",
    listitem: "text-slate-800",

    // 2. Add an explicit !important flag (via Tailwind's !) to force checklists to reset
    // their dimensions, overriding the zombie 'ul' padding.
    checklist: "!list-none !pl-2 p-0 m-0 my-2",

    // 3. Keep your clean layout, but make sure left positioning coordinates match the pl-2 layout
    listitemUnchecked:
      "list-none relative pl-6 text-slate-800 select-none before:content-['☐'] before:text-slate-700 before:absolute before:left-0 before:top-0",

    listitemChecked:
      "list-none relative pl-6 line-through text-slate-400 select-none before:content-['✓'] before:text-black before:absolute before:left-0 before:top-0",
  },
  image: "max-w-full h-auto rounded-lg",
  link: "text-primary underline underline-offset-4 cursor-pointer hover:text-primary/80",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    underlineStrikethrough: "underline line-through",
    code: "bg-muted px-1.5 py-0.5 rounded-sm font-mono text-sm text-foreground",
  },
  code: "bg-muted block font-mono text-sm p-4 rounded-md overflow-x-auto border border-border my-4",
  codeHighlight: {
    atrule: "text-primary",
    attr: "text-primary",
    boolean: "text-destructive",
    builtin: "text-chart-1",
    cdata: "text-muted-foreground",
    char: "text-chart-2",
    class: "text-chart-3",
    "class-name": "text-chart-3",
    comment: "text-muted-foreground italic",
    constant: "text-destructive",
    deleted: "text-destructive",
    doctype: "text-muted-foreground",
    entity: "text-accent-foreground",
    function: "text-primary",
    important: "font-bold text-primary",
    inserted: "text-chart-1",
    keyword: "text-primary",
    namespace: "text-primary",
    number: "text-chart-2",
    operator: "text-foreground",
    prolog: "text-muted-foreground",
    property: "text-primary",
    punctuation: "text-muted-foreground",
    regex: "text-chart-4",
    selector: "text-chart-1",
    string: "text-chart-2",
    symbol: "text-chart-1",
    tag: "text-primary",
    url: "text-primary underline",
    variable: "text-chart-5",
  },
};

export const EMPTY_CONTENT = "(An empty Note)";

export const HEIGHT = 800;
export const AMPLITUDE = 100;
export const FREQUENCY = 0.09;
export const STRAND_LENGTH = 80;
export const PHASE_DIFF = Math.PI;

export const LOCAL_STORAGE_SYNC_KEY = "last_synced_at";
