// The types of the Composer document (schema 2). Plain JSON: nothing here is code, markup or a function, so a
// document can be stored, diffed, validated on a server and rendered by any host.

/** The format version of the code, bumped with a migration (`migrate.ts`). */
// @fixed: the format version is a property of this code, not a setting.
export const DOCUMENT_SCHEMA_VERSION = 2;

/** Words of one value per locale: `{ en: "Book", fr: "Réserver" }`. */
export type LocalizedText = { readonly [locale: string]: string };
/** A value the host supplies by name (a shop's name, today's date). */
export type Variable = { readonly var: string };
/** A value the host reads from its data (a service's price). */
export type Binding = { readonly bind: string };
/** A file in the host's storage, by id; `poster` is a still image of it (a video, a 3D model). */
export type AssetRef = { readonly asset: string; readonly poster?: string };

export type PropValue =
  | string
  | number
  | boolean
  | readonly string[]
  | LocalizedText
  | Variable
  | Binding
  | AssetRef;

export type Props = { readonly [name: string]: PropValue };

export type Block = {
  readonly id: string;
  readonly type: string;
  readonly props: Props;
  /** Nested blocks by slot name. */
  readonly slots: { readonly [slot: string]: readonly Block[] };
};

export type ComposerDocument = {
  readonly schema: typeof DOCUMENT_SCHEMA_VERSION;
  readonly locales: readonly string[];
  readonly defaultLocale: string;
  readonly root: { readonly props: Props };
  readonly blocks: readonly Block[];
};

/** One reason a document is refused: where, which stable code, and a message for a person. */
export type DocumentIssue = {
  readonly path: string;
  readonly code: IssueCode;
  readonly message: string;
};

export const ISSUE_CODES = [
  "shape",
  "duplicate_id",
  "unsafe_key",
  "unsafe_text",
  "locale",
  "limit",
  "unknown_block",
  "unknown_prop",
  "invalid_prop",
  "slot",
  "asset_unknown",
  "asset_mime",
] as const;
export type IssueCode = (typeof ISSUE_CODES)[number];

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly DocumentIssue[] };
