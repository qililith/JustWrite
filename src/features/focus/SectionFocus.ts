import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { computeFocusRange } from "./focusRange";

export const sectionFocusKey = new PluginKey("sectionFocus");

export const SectionFocus = Extension.create({
  name: "sectionFocus",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: sectionFocusKey,
        state: {
          init: () => ({ focusId: null as string | null }),
          apply(tr, value) {
            const next = tr.getMeta(sectionFocusKey);
            if (next && "focusId" in next) return { focusId: next.focusId };
            return value;
          },
        },
        props: {
          decorations(state) {
            const { focusId } = sectionFocusKey.getState(state) as {
              focusId: string | null;
            };
            if (!focusId) return null;
            const range = computeFocusRange(state.doc, focusId);
            if (!range) return null;
            const decos: Decoration[] = [];
            state.doc.forEach((node, offset) => {
              const from = offset;
              const to = offset + node.nodeSize;
              if (to <= range.from || from >= range.to) {
                decos.push(
                  Decoration.node(from, to, { class: "is-section-hidden" }),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
