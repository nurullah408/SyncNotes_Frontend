import { InternalLinkComponent } from "@/routes/_auth/notes/-components/InternalLinkComponent";
import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactElement } from "react";

type SerializedInternalLinkNode = Spread<
  { noteId: string, title: string },
  SerializedLexicalNode
>;

export class InternalLinkNode extends DecoratorNode<ReactElement> {
  __noteId: string;
  __title: string;

  static getType(): string {
    return "internal-link";
  }

  static clone(node: InternalLinkNode): InternalLinkNode {
    return new InternalLinkNode(node.__noteId, node.__title, node.__key);
  }

  constructor(noteId: string, title: string, key?: string) {
    super(key);
    this.__noteId = noteId;
    this.__title = title;
  }

  get noteId(): string {
    return this.__noteId;
  }

  get title(): string {
    return this.__title;
  }

  static importJSON(
    serializedInternalLinkNode: SerializedInternalLinkNode,
  ): InternalLinkNode {
    return new InternalLinkNode(serializedInternalLinkNode.noteId, serializedInternalLinkNode.title);
  }

  exportJSON(): SerializedInternalLinkNode {
    return {
      ...super.exportJSON(),
      noteId: this.__noteId,
      title: this.__title,
      type: "internal-link",
    }
  }

  // DOM Rendering
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.className = config.theme.internalLink ?? "inline-block";
    return span;
  }

  updateDOM(): boolean {
    // Simple node - always rebuild on update
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: (domNode: HTMLElement) => {
        const noteId = domNode.getAttribute("data-note-id");
        if (noteId) {
          return {
            conversion: (element: HTMLElement): DOMConversionOutput => {
              const title = element.textContent || "";
              const node = $applyNodeReplacement(
                new InternalLinkNode(noteId, title)
              );
              return { node };
            },
            priority: 1,
          }
        }
        return null;
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("a");
    element.setAttribute("data-note-id", this.__noteId);
    element.setAttribute("data-title", this.__title);
    element.textContent = this.__title;
    return { element };
  }

  decorate (): ReactElement {
    return (
      <InternalLinkComponent noteId={this.__noteId} title={this.__title} nodeKey={this.__key} />
    );
  }

  // -- Miscellaneous --
  isInline(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return false;
  }
}

export function $createInternalLinkNode(noteId: string, title: string): InternalLinkNode {
  return new InternalLinkNode(noteId, title);
}

export function $isInternalLinkNode(node: LexicalNode | null | undefined): node is InternalLinkNode {
  return node instanceof InternalLinkNode;
}
