// The closed set of field types a block may declare (ADR-010): nothing here is a function or markup, so a registry is
// data a server can hold as well as an editor. A host defines its blocks with `defineBlocks`.
export type TextField = {
  readonly type: "text";
  readonly maxLength?: number;
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type LocalizedField = {
  readonly type: "localized";
  readonly maxLength?: number;
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type EnumField = {
  readonly type: "enum";
  readonly options: readonly string[];
  /** Several options at once: the value is a list. */
  readonly multiple?: boolean;
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type NumberField = {
  readonly type: "number";
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Shown beside the value (`px`, `%`); the editor draws a slider with a live preview when min and max are set. */
  readonly unit?: string;
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type BooleanField = {
  readonly type: "boolean";
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type AssetField = {
  readonly type: "asset";
  /** MIME allow-list: exact (`model/gltf-binary`) or by family (`image/*`). */
  readonly accept: readonly string[];
  /** A still image of the asset, for a video or a 3D model; the list is the MIME patterns it may have. */
  readonly poster?: { readonly accept: readonly string[] };
  readonly required?: boolean;
  readonly bindable?: boolean;
};
export type SlotField = {
  readonly type: "slot";
  /** The block types allowed inside; absent, any block of the registry. */
  readonly allow?: readonly string[];
  readonly max?: number;
  /** The most levels of blocks below this slot (1 = only leaves). */
  readonly maxDepth?: number;
};

export type FieldDef =
  | TextField
  | LocalizedField
  | EnumField
  | NumberField
  | BooleanField
  | AssetField
  | SlotField;
export type PropFieldDef = Exclude<FieldDef, SlotField>;

export type BlockSpec = {
  readonly fields: { readonly [name: string]: FieldDef };
};
export type BlockRegistry = {
  /** The page's own settings (a theme, a density). */
  readonly root?: BlockSpec;
  readonly blocks: { readonly [type: string]: BlockSpec };
};

/** Identity function that types a registry; the editor config and the server validator read the same object. */
export const defineBlocks = <const R extends BlockRegistry>(registry: R): R =>
  registry;
