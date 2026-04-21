import type { ReactElement } from "react";

type IconName =
  | "arrow"
  | "check"
  | "heart"
  | "moon"
  | "mic"
  | "image"
  | "play"
  | "plus"
  | "close"
  | "pen"
  | "book"
  | "settings"
  | "chevron";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Fill the icon path with `color` (default: only stroke) */
  filled?: boolean;
};

const PATHS: Record<IconName, ReactElement> = {
  arrow: (
    <>
      <path d="M4 12h16" />
      <path d="M14 6l6 6-6 6" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  heart: <path d="M12 20s-7-4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 5-9 9-9 9z" />,
  moon: <path d="M20 13A8 8 0 1 1 11 4a6 6 0 0 0 9 9z" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <circle cx="9" cy="11" r="2" />
      <path d="M4 19l5-5 5 4 4-3 3 3" />
    </>
  ),
  play: <path d="M7 4v16l13-8z" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  book: <path d="M4 5h7v15H4zM13 5h7v15h-7z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
};

export function IconV2({
  name,
  size = 18,
  color = "currentColor",
  filled = false,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
