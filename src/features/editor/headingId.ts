import { Extension } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { createId } from "@/shared/lib/id";

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id as string };
        },
      },
    };
  },
});

export const UniqueHeadingId = Extension.create({
  name: "uniqueHeadingId",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("uniqueHeadingId"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          let modified = false;
          const tr = newState.tr;
          const seen = new Set<string>();
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "heading") return;
            const id = node.attrs.id as string | null;
            if (id && !seen.has(id)) {
              seen.add(id);
              return;
            }
            const next = createId();
            seen.add(next);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: next });
            modified = true;
          });
          return modified ? tr.setMeta("addToHistory", false) : null;
        },
      }),
    ];
  },
});
