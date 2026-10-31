// The shape of the document as zod schemas, and `parseDocument`: shape, then the rules zod cannot say (unique ids, the
// locales, the bounds, no markup). The block types and their props are the host's (`validate.ts`).
import * as z from "zod";

import { DEFAULT_LIMITS, type DocumentLimits } from "./limits";
import { checkText, isSafeKey, RESERVED_LOCALE_KEYS } from "./safety";
import {
  DOCUMENT_SCHEMA_VERSION,
  type Block,
  type ComposerDocument,
  type DocumentIssue,
  type IssueCode,
  type ParseResult,
} from "./types";

const LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const locale = z.string().regex(LOCALE, "a locale tag (en, fr-CA)");
const localizedText = z.record(locale, z.string());
const variable = z.strictObject({ var: z.string().min(1).max(80) });
const binding = z.strictObject({ bind: z.string().min(1).max(120) });
const assetRef = z.strictObject({
  asset: z.string().min(1).max(80),
  poster: z.string().min(1).max(80).optional(),
});

const propValue = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.string()),
  variable,
  binding,
  assetRef,
  localizedText,
]);
const props = z.record(z.string(), propValue);

const block: z.ZodType<Block> = z.lazy(() =>
  z.strictObject({
    id: z.string().regex(ID, "an id (letters, digits, - and _)"),
    type: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/, "a block type"),
    props,
    slots: z.record(z.string(), z.array(block)),
  })
);

export const documentSchema: z.ZodType<ComposerDocument> = z.strictObject({
  schema: z.literal(DOCUMENT_SCHEMA_VERSION),
  locales: z.array(locale).min(1),
  defaultLocale: locale,
  root: z.strictObject({ props }),
  blocks: z.array(block),
}) as z.ZodType<ComposerDocument>;

const at = (path: readonly PropertyKey[]) => path.map(String).join(".");

/** Every block with its path and depth (the top level is depth 1), in document order. */
export function* walkBlocks(
  blocks: readonly Block[],
  path = "blocks",
  depth = 1
): Generator<{ block: Block; path: string; depth: number }> {
  for (const [i, b] of blocks.entries()) {
    const here = `${path}.${i}`;
    yield { block: b, path: here, depth };
    for (const [slot, children] of Object.entries(b.slots))
      yield* walkBlocks(children, `${here}.slots.${slot}`, depth + 1);
  }
}

type Report = (path: string, code: IssueCode, message: string) => void;

function checkProps(
  properties: Readonly<Record<string, unknown>>,
  path: string,
  report: Report,
  doc: ComposerDocument,
  limits: DocumentLimits
) {
  for (const [name, value] of Object.entries(properties)) {
    const where = `${path}.${name}`;
    if (!isSafeKey(name))
      report(where, "unsafe_key", `"${name}" is not an allowed prop name`);
    checkValue(value, where, report, doc, limits);
  }
}

function checkValue(
  value: unknown,
  path: string,
  report: Report,
  doc: ComposerDocument,
  limits: DocumentLimits
) {
  if (typeof value === "string") {
    const problem = checkText(value, limits.maxText);
    if (problem) report(path, problem.code, problem.message);
  } else if (Array.isArray(value)) {
    if (value.length > limits.maxList)
      report(path, "limit", `at most ${limits.maxList} entries`);
    value.forEach((v, i) => checkValue(v, `${path}.${i}`, report, doc, limits));
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const isReference = keys.some((k) => RESERVED_LOCALE_KEYS.has(k));
    for (const [k, v] of Object.entries(value)) {
      if (!isReference && !doc.locales.includes(k))
        report(
          `${path}.${k}`,
          "locale",
          `"${k}" is not one of the document's locales`
        );
      checkValue(v, `${path}.${k}`, report, doc, limits);
    }
  }
}

/** The rules zod cannot say, over a document of the right shape. */
function checkRules(
  doc: ComposerDocument,
  limits: DocumentLimits
): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const report: Report = (path, code, message) =>
    issues.push({ path, code, message });

  if (doc.locales.length > limits.maxLocales)
    report("locales", "limit", `at most ${limits.maxLocales} locales`);
  if (new Set(doc.locales).size !== doc.locales.length)
    report("locales", "locale", "a locale is listed twice");
  if (!doc.locales.includes(doc.defaultLocale))
    report(
      "defaultLocale",
      "locale",
      "the default locale is one of the locales"
    );
  for (const l of doc.locales)
    if (RESERVED_LOCALE_KEYS.has(l))
      report("locales", "locale", `"${l}" is reserved`);

  checkProps(doc.root.props, "root.props", report, doc, limits);

  const seen = new Set<string>();
  let count = 0;
  for (const { block: b, path, depth } of walkBlocks(doc.blocks)) {
    count += 1;
    if (seen.has(b.id))
      report(`${path}.id`, "duplicate_id", `the id "${b.id}" is used twice`);
    seen.add(b.id);
    if (depth > limits.maxDepth)
      report(path, "limit", `blocks nest at most ${limits.maxDepth} deep`);
    checkProps(b.props, `${path}.props`, report, doc, limits);
    for (const slot of Object.keys(b.slots))
      if (!isSafeKey(slot))
        report(
          `${path}.slots.${slot}`,
          "unsafe_key",
          `"${slot}" is not an allowed slot name`
        );
  }
  if (count > limits.maxBlocks)
    report("blocks", "limit", `at most ${limits.maxBlocks} blocks`);
  return issues;
}

/** Reads untrusted JSON into a document: every issue with its path, never a throw. Does not know the block types. */
export function parseDocument(
  input: unknown,
  limits: DocumentLimits = DEFAULT_LIMITS
): ParseResult<ComposerDocument> {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: at(i.path),
        code: "shape" as const,
        message: i.message,
      })),
    };
  }
  const issues = checkRules(parsed.data, limits);
  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: parsed.data };
}
