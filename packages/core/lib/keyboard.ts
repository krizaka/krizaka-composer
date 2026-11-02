import type { KeyboardEvent } from "react";

// Sonar S1082: a pointer handler on a container is paired with the keyboard
// equivalent, so the container needs no ARIA role (S6819) and no tabindex.

// Enter and Space on a control inside the container activate it, as a click
// does: they stop here exactly as the click does. Other keys (shortcuts such
// as undo) keep bubbling.
export const stopActivationKey = (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.stopPropagation();
  }
};

// Escape pressed on the container itself or on a control that is not a text
// entry: the keyboard answer to a click on the empty area or on the backdrop.
export const isEscapeOutsideTextEntry = (e: KeyboardEvent) => {
  if (e.key !== "Escape") return false;

  const el = e.target as HTMLElement;

  return !(
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
};
