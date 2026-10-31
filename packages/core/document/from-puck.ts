// Puck's saved data, read once into a document (the editor's earlier format), never written back: Puck data is not a
// format this package stores. `{ root: { props }, content: [{ type, props: { id, ...slots } }] }`: a prop that is an
// array of components is a slot.
import type { Block, ComposerDocument, PropValue } from "./types";

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isComponent = (v: unknown): v is { type: string; props: Json } =>
  isRecord(v) && typeof v.type === "string" && isRecord(v.props);

function toBlock(
  component: { type: string; props: Json },
  fallbackId: string
): Block {
  const { id, ...rest } = component.props;
  const props: Record<string, PropValue> = {};
  const slots: Record<string, Block[]> = {};
  for (const [name, value] of Object.entries(rest)) {
    if (Array.isArray(value) && value.length > 0 && value.every(isComponent)) {
      slots[name] = value.map((c, i) =>
        toBlock(c, `${typeof id === "string" ? id : fallbackId}-${name}-${i}`)
      );
    } else if (value !== undefined && value !== null) {
      props[name] = value as PropValue;
    }
  }
  return {
    id: typeof id === "string" ? id : fallbackId,
    type: component.type,
    props,
    slots,
  };
}

/** Puck data as a document in one locale; the host validates the result with `validateDocument`. */
export function fromPuckData(data: unknown, locale = "en"): ComposerDocument {
  const root =
    isRecord(data) && isRecord(data.root) && isRecord(data.root.props)
      ? data.root.props
      : {};
  const content =
    isRecord(data) && Array.isArray(data.content)
      ? data.content.filter(isComponent)
      : [];
  return {
    schema: 2,
    locales: [locale],
    defaultLocale: locale,
    root: { props: root as Record<string, PropValue> },
    blocks: content.map((c, i) => toBlock(c, `block-${i}`)),
  };
}
