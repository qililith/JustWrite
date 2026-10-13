import type { Node as ProseNode } from "@tiptap/pm/model";
import type { JSONContent } from "@tiptap/react";

export type FocusRange = {
  from: number;
  to: number;
  title: string;
  nodes: JSONContent[];
};

export function computeFocusRange(
  doc: ProseNode,
  focusId: string,
): FocusRange | null {
  let start = -1;
  let end = doc.content.size;
  let focusLevel = 1;
  let title = "";
  const nodes: JSONContent[] = [];
  let collecting = false;

  doc.forEach((node, offset) => {
    const from = offset;
    if (node.type.name === "heading" && node.attrs.id === focusId) {
      start = from;
      focusLevel = Number(node.attrs.level ?? 1);
      title = node.textContent.trim() || "无标题";
      collecting = true;
      nodes.push(node.toJSON() as JSONContent);
      return;
    }
    if (collecting) {
      if (node.type.name === "heading" && Number(node.attrs.level) <= focusLevel) {
        if (end === doc.content.size) end = from;
        collecting = false;
        return;
      }
      nodes.push(node.toJSON() as JSONContent);
    }
  });

  if (start < 0) return null;
  return { from: start, to: end, title, nodes };
}

export function collectFocusedJsonNodes(
  content: JSONContent | undefined,
  focusId: string,
): { title: string; nodes: JSONContent[] } | null {
  if (!content?.content) return null;
  let focusLevel = 1;
  let title = "";
  const nodes: JSONContent[] = [];
  let collecting = false;
  let found = false;

  for (const node of content.content) {
    if (node.type === "heading" && node.attrs?.id === focusId) {
      found = true;
      collecting = true;
      focusLevel = Number(node.attrs.level ?? 1);
      title = (node.content ?? [])
        .map((child) => child.text ?? "")
        .join("")
        .trim() || "无标题";
      nodes.push(node);
      continue;
    }
    if (collecting) {
      if (node.type === "heading" && Number(node.attrs?.level) <= focusLevel) {
        break;
      }
      nodes.push(node);
    }
  }

  return found ? { title, nodes } : null;
}
