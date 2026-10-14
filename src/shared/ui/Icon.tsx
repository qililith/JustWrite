import type { ReactNode } from "react";

export type IconName =
  | "plus"
  | "pencil"
  | "trash"
  | "chevron-down"
  | "chevron-right"
  | "focus"
  | "close"
  | "fullscreen"
  | "exit-fullscreen"
  | "highlight";

const SHAPES: Record<IconName, ReactNode> = {
  plus: <path d="M8 3.25v9.5M3.25 8h9.5" />,
  pencil: (
    <>
      <path d="M10.75 2.75l2.5 2.5-7.5 7.5H3.25v-2.5z" />
      <path d="M9.25 4.25l2.5 2.5" />
    </>
  ),
  trash: (
    <>
      <path d="M2.75 4.5h10.5" />
      <path d="M6.25 4.5V3h3.5v1.5" />
      <path d="M4.25 4.5l.6 8.75h6.3l.6-8.75" />
      <path d="M6.75 7v4M9.25 7v4" />
    </>
  ),
  "chevron-down": <path d="M4.5 6.25 8 9.75l3.5-3.5" />,
  "chevron-right": <path d="M6.25 4.5 9.75 8l-3.5 3.5" />,
  focus: (
    <>
      <circle cx="8" cy="8" r="5.25" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />,
  fullscreen: <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />,
  "exit-fullscreen": <path d="M6 2.5V6H2.5M10 2.5V6h3.5M13.5 10H10v3.5M6 13.5V10H2.5" />,
  highlight: (
    <>
      <path d="M4.75 10 8 2.75 11.25 10M5.9 7.5h4.2" />
      <rect x="3" y="12" width="10" height="2" rx="1" fill="var(--highlight)" stroke="none" />
    </>
  ),
};

type Props = {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  );
}
