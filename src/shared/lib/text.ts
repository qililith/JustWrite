import type { JSONContent } from "@tiptap/react";

export function textFromJSON(node?: JSONContent | null): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map((child) => textFromJSON(child)).join("");
}

export function firstHeadingTitle(content: JSONContent): string {
  const heading = content.content?.find((node) => node.type === "heading");
  return textFromJSON(heading).trim();
}

export function displayTitle(title: string, content: JSONContent): string {
  const trimmed = title.trim();
  if (trimmed && trimmed !== "未命名") return trimmed;
  return firstHeadingTitle(content) || "未命名";
}
