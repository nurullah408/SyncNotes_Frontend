import { InternalLinkComponent } from "@/routes/_auth/notes/-components/InternalLinkComponent";
import {
  $applyNodeReplacement,
  $getRoot,
  $isElementNode,
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
  { noteId: string },
  SerializedLexicalNode
>;

export class InternalLinkNode extends DecoratorNode<ReactElement> {
  __noteId: string;

  static getType(): string {
    return "internal-link";
  }

  static clone(node: InternalLinkNode): InternalLinkNode {
    return new InternalLinkNode(node.__noteId, node.__key);
  }

  constructor(noteId: string, key?: string) {
    super(key);
    this.__noteId = noteId;
  }

  get noteId(): string {
    return this.__noteId;
  }

  static importJSON(
    serializedInternalLinkNode: SerializedInternalLinkNode,
  ): InternalLinkNode {
    return $applyNodeReplacement(
      new InternalLinkNode(serializedInternalLinkNode.noteId),
    );
  }

  exportJSON(): SerializedInternalLinkNode {
    return {
      ...super.exportJSON(),
      noteId: this.__noteId,
      type: "internal-link",
    };
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
                new InternalLinkNode(noteId, title),
              );
              return { node };
            },
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("a");
    element.setAttribute("data-note-id", this.__noteId);
    return { element };
  }

  decorate(): ReactElement {
    return (
      <InternalLinkComponent noteId={this.__noteId} nodeKey={this.__key} />
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

export function $createInternalLinkNode(noteId: string): InternalLinkNode {
  return new InternalLinkNode(noteId);
}

export function $isInternalLinkNode(node: unknown): node is InternalLinkNode {
  return node instanceof InternalLinkNode;
}

export function $getInternalLinkTargetIds(): Set<string> {
  const targetIds = new Set<string>();

  function visit(node: LexicalNode) {
    if ($isInternalLinkNode(node)) {
      targetIds.add(node.__noteId);
      return;
    }

    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        visit(child);
      }
    }
  }

  visit($getRoot());

  return targetIds;
}
