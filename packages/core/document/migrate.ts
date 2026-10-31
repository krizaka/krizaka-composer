// Migrations of the document: pure functions schema n -> n + 1, applied in memory when an older one is read; the host
// writes the migrated one back on its next save. A document newer than this code is refused, never guessed.
//
// Schema 1 is the shop page of `@krizaka/ui/shop` (`{ schema: 1, preset, density, accent, sections }`): read once, here,
// and never written again.
import { DEFAULT_LIMITS, type DocumentLimits } from "./limits";
import { parseDocument } from "./schema";
import {
  DOCUMENT_SCHEMA_VERSION,
  type ComposerDocument,
  type ParseResult,
  type PropValue,
} from "./types";

type Json = Record<string, unknown>;

export type Migration = {
  /** The schema it reads. */
  readonly from: number;
  /** Pure: returns a new document, never mutates; throws a `MigrationError` for what it cannot carry over. */
  readonly up: (doc: Json) => Json;
};

export class MigrationError extends Error {}

export type MigrationResult =
  | { readonly ok: true; readonly document: Json; readonly from: number }
  | { readonly ok: false; readonly reason: string };

const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isWords = (v: Json) =>
  Object.keys(v).length > 0 &&
  Object.entries(v).every(
    ([k, t]) => (k === "fr" || k === "en") && typeof t === "string"
  );
/** Settings that name a file of the host's storage in the shop format. */
const ASSET_KEYS: ReadonlySet<string> = new Set(["media", "mediaId"]);

function toValue(
  name: string,
  value: unknown,
  path: string
): PropValue | undefined {
  if (value === undefined) return undefined;
  if (ASSET_KEYS.has(name) && typeof value === "string")
    return { asset: value };
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string"))
    return value as string[];
  if (isRecord(value) && isWords(value)) return value as Record<string, string>;
  throw new MigrationError(`${path}: a setting this format cannot carry over`);
}

function toProps(
  settings: unknown,
  path: string,
  first: Record<string, PropValue> = {}
): Record<string, PropValue> {
  const props: Record<string, PropValue> = { ...first };
  for (const [name, value] of Object.entries(
    isRecord(settings) ? settings : {}
  )) {
    const v = toValue(name, value, `${path}.${name}`);
    if (v !== undefined) props[name] = v;
  }
  return props;
}

function toBlock(raw: unknown, path: string, extra: Record<string, PropValue>) {
  if (
    !isRecord(raw) ||
    typeof raw.key !== "string" ||
    typeof raw.type !== "string"
  )
    throw new MigrationError(
      `${path}: a section or block has a key and a type`
    );
  return {
    id: raw.key,
    type: raw.type,
    props: toProps(raw.settings, `${path}.settings`, extra),
    slots: {} as Record<string, unknown[]>,
  };
}

/** The shop page (schema 1) as a document: sections are blocks, a section's blocks fill its `blocks` slot. */
export function shopPageToDocument(doc: Json): Json {
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  const blocks = sections.map((section, i) => {
    const path = `sections.${i}`;
    const block = toBlock(
      section,
      path,
      typeof (section as Json)?.variant === "string"
        ? { variant: (section as Json).variant as string }
        : {}
    );
    const children =
      isRecord(section) && Array.isArray(section.blocks) ? section.blocks : [];
    if (children.length > 0)
      block.slots.blocks = children.map((c, j) =>
        toBlock(c, `${path}.blocks.${j}`, {})
      );
    return block;
  });
  const preset = isRecord(doc.preset) ? doc.preset : {};
  const root: Record<string, PropValue> = {};
  if (typeof preset.id === "string") root.preset = preset.id;
  if (typeof preset.version === "number") root.presetVersion = preset.version;
  if (typeof doc.density === "string") root.density = doc.density;
  if (typeof doc.accent === "string") root.accent = doc.accent;
  return {
    schema: 2,
    locales: ["en", "fr"],
    defaultLocale: "en",
    root: { props: root },
    blocks,
  };
}

/** The migrations of the document, oldest first. */
export const MIGRATIONS: readonly Migration[] = [
  { from: 1, up: shopPageToDocument },
];

/** Brings a stored document to the current schema (then `parseDocument` it, or use `readDocument`). */
export function migrateDocument(
  input: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  current = DOCUMENT_SCHEMA_VERSION
): MigrationResult {
  if (!isRecord(input)) return { ok: false, reason: "a document is an object" };
  const from = input.schema;
  if (typeof from !== "number" || !Number.isInteger(from) || from < 1)
    return { ok: false, reason: "the document has no schema version" };
  if (from > current)
    return {
      ok: false,
      reason: `schema ${from} is newer than this code knows (${current})`,
    };
  let doc: Json = input;
  try {
    for (let n = from; n < current; n++) {
      const step = migrations.find((m) => m.from === n);
      if (!step) return { ok: false, reason: `no migration from schema ${n}` };
      doc = { ...step.up(doc), schema: n + 1 };
    }
  } catch (error) {
    if (error instanceof MigrationError)
      return { ok: false, reason: error.message };
    throw error;
  }
  return { ok: true, document: doc, from };
}

/** Read a stored document of any known version: migrate, then parse. */
export function readDocument(
  input: unknown,
  limits: DocumentLimits = DEFAULT_LIMITS
): ParseResult<ComposerDocument> {
  const migrated = migrateDocument(input);
  if (!migrated.ok)
    return {
      ok: false,
      issues: [{ path: "schema", code: "shape", message: migrated.reason }],
    };
  return parseDocument(migrated.document, limits);
}
