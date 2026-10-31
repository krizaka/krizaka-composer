// Words per locale, with the fallback made visible: a host that falls back to the default language shows it, and the
// editor lists the places to translate.
import { walkBlocks } from "./schema";
import type { ComposerDocument, LocalizedText, Props } from "./types";

export type ResolvedText =
  | {
      readonly text: string;
      readonly locale: string;
      readonly fallback: boolean;
    }
  | undefined;

/** The text for a locale: its own, else the default locale's (`fallback: true`), else nothing. */
export function resolveLocalized(
  value: LocalizedText,
  locale: string,
  doc: Pick<ComposerDocument, "defaultLocale">
): ResolvedText {
  const own = value[locale];
  if (own !== undefined) return { text: own, locale, fallback: false };
  const base = value[doc.defaultLocale];
  return base === undefined
    ? undefined
    : { text: base, locale: doc.defaultLocale, fallback: true };
}

const isLocalized = (v: unknown, doc: ComposerDocument): v is LocalizedText =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  Object.keys(v).length > 0 &&
  Object.keys(v).every((k) => doc.locales.includes(k));

function missingIn(
  props: Props,
  path: string,
  locale: string,
  doc: ComposerDocument
): string[] {
  return Object.entries(props)
    .filter(([, v]) => isLocalized(v, doc) && !(locale in v))
    .map(([name]) => `${path}.${name}`);
}

/** The paths of the words that have no text in `locale` and fall back to the default one. */
export function listFallbacks(doc: ComposerDocument, locale: string): string[] {
  if (locale === doc.defaultLocale) return [];
  return [
    ...missingIn(doc.root.props, "root.props", locale, doc),
    ...[...walkBlocks(doc.blocks)].flatMap(({ block, path }) =>
      missingIn(block.props, `${path}.props`, locale, doc)
    ),
  ];
}
