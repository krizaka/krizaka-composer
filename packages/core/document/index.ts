// `@krizaka/composer/document`: the document, its validation, its migration. No React, no DOM: it runs on a server.
export * from "./types";
export * from "./limits";
export { documentSchema, parseDocument, walkBlocks } from "./schema";
export { isSafeKey, checkText } from "./safety";
export * from "./fields";
export {
  validateDocument,
  mimeMatches,
  type AssetCatalogue,
  type ValidateOptions,
} from "./validate";
export { resolveLocalized, listFallbacks, type ResolvedText } from "./locale";
export {
  resolveValue,
  resolveProps,
  propsForLocale,
  referencesOf,
  type HostValues,
  type ResolvedProps,
  type ResolvedValue,
} from "./resolve";
export {
  migrateDocument,
  readDocument,
  shopPageToDocument,
  MIGRATIONS,
  MigrationError,
  type Migration,
  type MigrationResult,
} from "./migrate";
export { fromPuckData } from "./from-puck";
