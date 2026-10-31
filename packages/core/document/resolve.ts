// Variables and bindings are resolved by the host, never by the document: `{ var }` is a value it supplies by name,
// `{ bind }` a value it reads from its data. This is the pure step that replaces them, so a renderer sees plain values.
import { resolveLocalized } from "./locale";
import { isAssetRef, isBinding, isVariable } from "./validate";
import type { Block, ComposerDocument, PropValue, Props } from "./types";

export type HostValues = {
  readonly variables?: Readonly<Record<string, PropValue | undefined>>;
  readonly bind?: (key: string) => PropValue | undefined;
};

export type ResolvedValue =
  | Exclude<PropValue, { readonly var: string } | { readonly bind: string }>
  | undefined;
export type ResolvedProps = { readonly [name: string]: ResolvedValue };

/** One value: a reference becomes the host's value (or `undefined` when it has none); anything else is returned as is. */
export function resolveValue(
  value: PropValue,
  host: HostValues
): ResolvedValue {
  if (isVariable(value))
    return (host.variables?.[value.var] ?? undefined) as ResolvedValue;
  if (isBinding(value))
    return (host.bind?.(value.bind) ?? undefined) as ResolvedValue;
  return value as ResolvedValue;
}

export const resolveProps = (props: Props, host: HostValues): ResolvedProps =>
  Object.fromEntries(
    Object.entries(props).map(([name, v]) => [name, resolveValue(v, host)])
  );

/** A block's props for a locale: references resolved, words picked (with the default locale as fallback). */
export function propsForLocale(
  props: Props,
  locale: string,
  doc: ComposerDocument,
  host: HostValues = {}
): Readonly<
  Record<
    string,
    | string
    | number
    | boolean
    | readonly string[]
    | { readonly asset: string; readonly poster?: string }
    | undefined
  >
> {
  return Object.fromEntries(
    Object.entries(resolveProps(props, host)).map(([name, v]) => {
      const isWords =
        typeof v === "object" &&
        v !== null &&
        !Array.isArray(v) &&
        !isAssetRef(v);
      return [
        name,
        isWords
          ? resolveLocalized(v as Record<string, string>, locale, doc)?.text
          : v,
      ];
    })
  );
}

/** The variables and bindings a document asks the host for, to check them against what the host can supply. */
export function referencesOf(
  blocks: readonly Block[],
  props: Props = {}
): { variables: string[]; bindings: string[] } {
  const variables = new Set<string>();
  const bindings = new Set<string>();
  const scan = (p: Props) => {
    for (const v of Object.values(p)) {
      if (isVariable(v)) variables.add(v.var);
      if (isBinding(v)) bindings.add(v.bind);
    }
  };
  scan(props);
  const visit = (list: readonly Block[]) => {
    for (const b of list) {
      scan(b.props);
      Object.values(b.slots).forEach(visit);
    }
  };
  visit(blocks);
  return { variables: [...variables].sort(), bindings: [...bindings].sort() };
}
