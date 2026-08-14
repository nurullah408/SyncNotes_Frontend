import type { RootNode, TextNode } from "lexical";
import { EMPTY_CONTENT } from "../constants";

export function getTextPreview(jsonSting: string, maxLength = 120): string {
  try {
    const parsed = JSON.parse(jsonSting);
    let text = "";
    const extractText = (node: RootNode | TextNode) => {
      if ("text" in node) {
        text += node.text;
      }
      if ("children" in node) {
        (node?.children as (RootNode | TextNode)[]).forEach(extractText);
      }
    };
    extractText(parsed.root);
    const result = text.trim();
    return result.length > maxLength
      ? result.slice(0, maxLength) + "..."
      : result.length === 0
        ? EMPTY_CONTENT
        : result;
  } catch {
    return EMPTY_CONTENT;
  }
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
