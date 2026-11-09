import type { CSSProperties } from "react";
const glyphs = {
  pin: "\ue9a6",
  map: "\ue9a5",
  user: "\uea3a",
  heart: "\uea52",
  add: "\ue900",
  close: "\ue938",
  edit: "\ue9cb",
  email: "\ue953",
  phone: "\uea23",
  share: "\ue9fb",
  settings: "\ue9fa",
  previous: "\ue9bf",
  next: "\ue9c0",
  photo: "\ue9d0",
  food: "\ue97b",
  drink: "\ue97d",
  calendar: "\ue928",
  check: "\ue935",
};
export function Icon({
  name,
  style,
}: {
  name:
    | keyof typeof glyphs
    | "search"
    | "menu"
    | "beer"
    | "star"
    | "link"
    | "clock";
  style?: CSSProperties;
}) {
  if (name === "user")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={style}
      >
        <circle cx="12" cy="6.5" r="4.5" />
        <path d="M3 22v-4a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v4z" />
      </svg>
    );
  if (name === "heart")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <path d="M12 21 3 12C-3 5 6-2 12 5c6-7 15 0 9 7z" />
      </svg>
    );
  if (name === "previous" || name === "next")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <path
          d={
            name === "previous"
              ? "M20 12H4m6-7-7 7 7 7"
              : "M4 12h16m-6-7 7 7-7 7"
          }
        />
      </svg>
    );
  if (name === "search")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </svg>
    );
  if (name === "menu")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <path d="M2 5h20M2 12h20M2 19h20" />
      </svg>
    );
  if (name === "beer")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={style}
      >
        <path d="M3 3h13v3h3a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-3v2H3zm13 6v7h3V9zM6 6v12h2V6zm5 0v12h2V6z" />
      </svg>
    );
  if (name === "star")
    return (
      <span aria-hidden="true" className="icon" style={style}>
        ★
      </span>
    );
  if (name === "link")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <path d="m9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg
        aria-hidden="true"
        className="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={style}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 3" />
      </svg>
    );
  return (
    <span aria-hidden="true" className="icon originalIcon" style={style}>
      {glyphs[name]}
    </span>
  );
}
