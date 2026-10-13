import type { JSONContent } from "@tiptap/react";
import { textFromJSON } from "@/shared/lib/text";

export type OutlineItem = {
  id: string;
  level: number;
  text: string;
};

export function extractOutline(content?: JSONContent | null): OutlineItem[] {
  if (!content?.content) return [];
  const items: OutlineItem[] = [];
  for (const node of content.content) {
    if (node.type !== "heading") continue;
    const id = typeof node.attrs?.id === "string" ? node.attrs.id : "";
    const level = Number(node.attrs?.level ?? 1);
    if (!id || level < 1 || level > 5) continue;
    items.push({
      id,
      level,
      text: textFromJSON(node).trim() || "无标题",
    });
  }
  return items;
}
