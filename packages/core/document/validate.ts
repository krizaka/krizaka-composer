// The server-side validator: `parseDocument` plus the host's registry (block types, props, slots) and, when the host
// can say what an asset is, the asset checks. Refuses with every issue and its path; it never renders and never throws.
import type {
  AssetField,
  BlockRegistry,
  BlockSpec,
  FieldDef,
  PropFieldDef,
  SlotField,
} from "./fields";
import { DEFAULT_LIMITS, type DocumentLimits } from "./limits";
import { parseDocument, walkBlocks } from "./schema";
import {
  type AssetRef,
  type Block,
  type ComposerDocument,
  type DocumentIssue,
  type IssueCode,
  type ParseResult,
  type PropValue,
} from "./types";

/** What the host knows about its storage: the MIME type of an asset id, or nothing when it does not exist. */
export type AssetCatalogue = {
  readonly mimeOf: (id: string) => string | undefined;
};

export type ValidateOptions = {
  readonly registry: BlockRegistry;
  readonly assets?: AssetCatalogue;
  readonly limits?: DocumentLimits;
};

type Report = (path: string, code: IssueCode, message: string) => void;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export const isVariable = (v: unknown): v is { var: string } =>
  isRecord(v) && typeof v.var === "string";
export const isBinding = (v: unknown): v is { bind: string } =>
  isRecord(v) && typeof v.bind === "string";
export const isAssetRef = (v: unknown): v is AssetRef =>
  isRecord(v) && typeof v.asset === "string";
const isReference = (v: unknown) => isVariable(v) || isBinding(v);

/** Does a MIME type match an allow-list entry (`image/*`, `model/gltf-binary`)? */
export function mimeMatches(mime: string, pattern: string): boolean {
  const [type, subtype] = mime.toLowerCase().split("/");
  const [pType, pSub] = pattern.toLowerCase().split("/");
  return type === pType && (pSub === "*" || subtype === pSub);
}

const kindOf = (v: PropValue): string =>
  typeof v === "object" ? (Array.isArray(v) ? "list" : "object") : typeof v;

function checkAsset(
  value: unknown,
  field: AssetField,
  path: string,
  report: Report,
  assets?: AssetCatalogue
) {
  if (!isAssetRef(value))
    return report(path, "invalid_prop", "an asset reference ({ asset })");
  const verify = (id: string, accept: readonly string[], where: string) => {
    const mime = assets?.mimeOf(id);
    if (assets && mime === undefined)
      return report(where, "asset_unknown", `the asset "${id}" does not exist`);
    if (mime !== undefined && !accept.some((p) => mimeMatches(mime, p)))
      report(
        where,
        "asset_mime",
        `${mime} is not accepted (${accept.join(", ")})`
      );
  };
  verify(value.asset, field.accept, `${path}.asset`);
  if (value.poster !== undefined) {
    if (field.poster)
      verify(value.poster, field.poster.accept, `${path}.poster`);
    else report(`${path}.poster`, "invalid_prop", "this field takes no poster");
  }
}

function checkNumber(
  value: unknown,
  field: Extract<FieldDef, { type: "number" }>,
  path: string,
  report: Report
) {
  if (typeof value !== "number")
    return report(path, "invalid_prop", "a number");
  if (field.min !== undefined && value < field.min)
    report(path, "invalid_prop", `at least ${field.min}`);
  if (field.max !== undefined && value > field.max)
    report(path, "invalid_prop", `at most ${field.max}`);
  if (
    field.step &&
    field.min !== undefined &&
    Math.abs(
      (value - field.min) / field.step -
        Math.round((value - field.min) / field.step)
    ) > 1e-9
  ) {
    report(
      path,
      "invalid_prop",
      `a multiple of ${field.step} from ${field.min}`
    );
  }
}

function checkEnum(
  value: unknown,
  field: Extract<FieldDef, { type: "enum" }>,
  path: string,
  report: Report
) {
  const values = field.multiple ? value : [value];
  if (field.multiple && !Array.isArray(values))
    return report(path, "invalid_prop", "a list of options");
  for (const v of values as unknown[])
    if (typeof v !== "string" || !field.options.includes(v))
      report(path, "invalid_prop", `one of ${field.options.join(", ")}`);
}

function checkLocalized(
  value: unknown,
  field: Extract<FieldDef, { type: "localized" }>,
  path: string,
  report: Report
) {
  if (!isRecord(value) || isAssetRef(value))
    return report(path, "invalid_prop", "words per locale ({ en, fr })");
  for (const [locale, text] of Object.entries(value)) {
    if (typeof text !== "string")
      report(`${path}.${locale}`, "invalid_prop", "text");
    else if (field.maxLength !== undefined && text.length > field.maxLength)
      report(
        `${path}.${locale}`,
        "limit",
        `at most ${field.maxLength} characters`
      );
  }
}

function checkProp(
  value: PropValue,
  field: PropFieldDef,
  path: string,
  report: Report,
  assets?: AssetCatalogue
) {
  if (isReference(value)) {
    if (field.bindable === false)
      report(path, "invalid_prop", "this field takes no variable or binding");
    return;
  }
  switch (field.type) {
    case "text":
      if (typeof value !== "string")
        return report(path, "invalid_prop", "text");
      if (field.maxLength !== undefined && value.length > field.maxLength)
        report(path, "limit", `at most ${field.maxLength} characters`);
      return;
    case "localized":
      return checkLocalized(value, field, path, report);
    case "enum":
      return checkEnum(value, field, path, report);
    case "number":
      return checkNumber(value, field, path, report);
    case "boolean":
      if (typeof value !== "boolean")
        report(path, "invalid_prop", `a boolean, not ${kindOf(value)}`);
      return;
    case "asset":
      return checkAsset(value, field, path, report, assets);
  }
}

function checkSpecProps(
  spec: BlockSpec,
  props: Readonly<Record<string, PropValue>>,
  path: string,
  report: Report,
  assets?: AssetCatalogue
) {
  for (const [name, value] of Object.entries(props)) {
    const field = spec.fields[name];
    if (!field || field.type === "slot")
      report(
        `${path}.${name}`,
        "unknown_prop",
        `"${name}" is not a prop of this block`
      );
    else checkProp(value, field, `${path}.${name}`, report, assets);
  }
  for (const [name, field] of Object.entries(spec.fields)) {
    if (field.type !== "slot" && field.required && !(name in props))
      report(`${path}.${name}`, "invalid_prop", "required");
  }
}

function checkSlots(
  block: Block,
  spec: BlockSpec,
  path: string,
  registry: BlockRegistry,
  report: Report
) {
  for (const [name, children] of Object.entries(block.slots)) {
    const field = spec.fields[name];
    if (!field || field.type !== "slot") {
      report(
        `${path}.slots.${name}`,
        "slot",
        `"${name}" is not a slot of this block`
      );
      continue;
    }
    checkSlot(children, field, `${path}.slots.${name}`, registry, report);
  }
}

function levelsBelow(blocks: readonly Block[]): number {
  return [...walkBlocks(blocks)].reduce(
    (deepest, w) => Math.max(deepest, w.depth),
    0
  );
}

function checkSlot(
  children: readonly Block[],
  field: SlotField,
  path: string,
  registry: BlockRegistry,
  report: Report
) {
  if (field.max !== undefined && children.length > field.max)
    report(path, "slot", `at most ${field.max} blocks`);
  if (field.maxDepth !== undefined && levelsBelow(children) > field.maxDepth)
    report(path, "slot", `at most ${field.maxDepth} levels below`);
  for (const [i, child] of children.entries()) {
    if (field.allow && !field.allow.includes(child.type))
      report(
        `${path}.${i}.type`,
        "slot",
        `"${child.type}" is not allowed here (${field.allow.join(", ")})`
      );
    else if (!Object.prototype.hasOwnProperty.call(registry.blocks, child.type))
      report(
        `${path}.${i}.type`,
        "unknown_block",
        `"${child.type}" is not a block`
      );
  }
}

/** Validates a document against the host's blocks. Parse first, then every block against its spec. */
export function validateDocument(
  input: unknown,
  options: ValidateOptions
): ParseResult<ComposerDocument> {
  const parsed = parseDocument(input, options.limits ?? DEFAULT_LIMITS);
  if (!parsed.ok) return parsed;
  const issues: DocumentIssue[] = [];
  const report: Report = (path, code, message) =>
    issues.push({ path, code, message });
  const { registry, assets } = options;

  checkSpecProps(
    registry.root ?? { fields: {} },
    parsed.value.root.props,
    "root.props",
    report,
    assets
  );
  for (const { block, path } of walkBlocks(parsed.value.blocks)) {
    const spec = Object.prototype.hasOwnProperty.call(
      registry.blocks,
      block.type
    )
      ? registry.blocks[block.type]
      : undefined;
    if (!spec) {
      report(`${path}.type`, "unknown_block", `"${block.type}" is not a block`);
      continue;
    }
    checkSpecProps(spec, block.props, `${path}.props`, report, assets);
    checkSlots(block, spec, path, registry, report);
  }
  return issues.length > 0 ? { ok: false, issues } : parsed;
}
