import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react";
import { Icon } from "@/shared/ui/Icon";

const LEVELS = [1, 2, 3, 4, 5] as const;

type Props = {
  editor: Editor;
};

export function BubbleBar({ editor }: Props) {
  const setParagraph = () => editor.chain().focus().setParagraph().run();
  const setHeading = (level: (typeof LEVELS)[number]) => {
    const id = editor.getAttributes("heading").id as string | undefined;
    editor.chain().focus().setHeading({ level }).run();
    if (id) editor.chain().updateAttributes("heading", { id }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top" }}
      className="bubble-bar"
    >
      <button
        type="button"
        className={editor.isActive("paragraph") ? "is-on" : ""}
        onClick={setParagraph}
      >
        正文
      </button>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          className={editor.isActive("heading", { level }) ? "is-on" : ""}
          onClick={() => setHeading(level)}
        >
          H{level}
        </button>
      ))}
      <span className="sep" />
      <button
        type="button"
        className={`bubble-bold${editor.isActive("bold") ? " is-on" : ""}`}
        aria-label="加粗"
        title="加粗（Ctrl+B）"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        className={`bubble-icon${editor.isActive("highlight") ? " is-on" : ""}`}
        aria-label="高亮"
        title="高亮"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Icon name="highlight" />
      </button>
    </BubbleMenu>
  );
}
