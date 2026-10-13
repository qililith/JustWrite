import type { JSONContent } from "@tiptap/react";
import { textFromJSON } from "@/shared/lib/text";

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  const cjkCount = text.match(CJK)?.length ?? 0;
  const latinCount = text
    .replace(CJK, " ")
    .split(/\s+/)
    .filter((token) => HAS_WORD_CHAR.test(token)).length;
  return cjkCount + latinCount;
}

function blocksText(nodes: JSONContent[]): string {
  return nodes.map((node) => textFromJSON(node)).join("\n");
}

export function countContent(content: JSONContent): number {
  return countWords(blocksText(content.content ?? []));
}

export function countNodes(nodes: JSONContent[]): number {
  return countWords(blocksText(nodes));
}
