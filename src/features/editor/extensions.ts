import Bold from "@tiptap/extension-bold";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import Document from "@tiptap/extension-document";
import Highlight from "@tiptap/extension-highlight";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { HeadingWithId, UniqueHeadingId } from "./headingId";
import { SectionFocus } from "@/features/focus/SectionFocus";

export const editorExtensions = [
  Document,
  Paragraph,
  Text,
  HeadingWithId.configure({ levels: [1, 2, 3, 4, 5] }),
  UniqueHeadingId,
  Bold,
  Highlight.configure({ multicolor: false }),
  History,
  Placeholder.configure({ placeholder: "开始写作" }),
  BubbleMenu,
  SectionFocus,
];
