// The bounds of a document: a page that is bounded on purpose, and a server that never parses an unbounded one.
export type DocumentLimits = {
  readonly maxBlocks: number;
  readonly maxDepth: number;
  readonly maxLocales: number;
  readonly maxText: number;
  readonly maxList: number;
};

/** @fixed: technical bounds of the format (a hostile document cannot exhaust a server), a host may pass its own. */
export const DEFAULT_LIMITS: DocumentLimits = {
  maxBlocks: 500,
  maxDepth: 8,
  maxLocales: 12,
  maxText: 5000,
  maxList: 50,
};
