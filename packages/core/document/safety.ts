// What a document may never carry: markup, script, or a key that reaches an object's prototype. Text is plain text;
// the host draws it, the document never holds HTML or code.
import type { IssueCode } from "./types";

/** Keys of a value that mean a reference, so they are not locales. */
export const RESERVED_LOCALE_KEYS: ReadonlySet<string> = new Set([
  "var",
  "bind",
  "asset",
  "poster",
]);

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "dangerouslySetInnerHTML",
  "innerHTML",
  "style",
  "ref",
]);
const PROP_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const MARKUP = /<\s*\/?\s*[a-zA-Z!?]/;
const SCRIPT_URL = /(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** A prop or slot name: an identifier that is not on the forbidden list and not an event handler (`onClick`). */
export function isSafeKey(name: string): boolean {
  return (
    PROP_NAME.test(name) && !FORBIDDEN_KEYS.has(name) && !/^on[A-Z]/.test(name)
  );
}

/** Why a string is refused, or nothing when it is plain text within `max` characters. */
export function checkText(
  text: string,
  max: number
): { code: IssueCode; message: string } | undefined {
  if (text.length > max)
    return { code: "limit", message: `at most ${max} characters` };
  if (MARKUP.test(text))
    return { code: "unsafe_text", message: "text holds no markup" };
  if (SCRIPT_URL.test(text))
    return { code: "unsafe_text", message: "text holds no script address" };
  if (CONTROL.test(text))
    return { code: "unsafe_text", message: "text holds no control character" };
  return undefined;
}
