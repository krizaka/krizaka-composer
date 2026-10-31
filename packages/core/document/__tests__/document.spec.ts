/** @jest-environment node */
import {
  DEFAULT_LIMITS,
  defineBlocks,
  fromPuckData,
  listFallbacks,
  mimeMatches,
  parseDocument,
  propsForLocale,
  referencesOf,
  resolveLocalized,
  validateDocument,
  type ComposerDocument,
} from "../index";

const doc = (over: Partial<ComposerDocument> = {}): ComposerDocument => ({
  schema: 2,
  locales: ["en", "fr"],
  defaultLocale: "en",
  root: { props: {} },
  blocks: [],
  ...over,
});
const block = (id: string, type = "text", props = {}, slots = {}) => ({
  id,
  type,
  props,
  slots,
});
const codes = (input: unknown) => {
  const r = parseDocument(input);
  return r.ok ? [] : r.issues.map((i) => `${i.code}@${i.path}`);
};

describe("parseDocument", () => {
  it("accepts a document with nested blocks, words, references and an asset", () => {
    const r = parseDocument(
      doc({
        blocks: [
          block(
            "a",
            "section",
            {
              title: { en: "Hello", fr: "Bonjour" },
              shop: { var: "shop.name" },
              price: { bind: "service.price" },
              count: 3,
              on: true,
              tags: ["x"],
            },
            {
              children: [
                block("b", "model", { src: { asset: "m1", poster: "p1" } }),
              ],
            }
          ),
        ],
      })
    );
    expect(r.ok).toBe(true);
  });

  it("refuses what is not a document, with a path", () => {
    expect(parseDocument(null).ok).toBe(false);
    expect(
      codes({ ...doc(), blocks: [{ id: "a", type: "t", props: {} }] })
    ).toEqual(["shape@blocks.0.slots"]);
    expect(codes({ ...doc(), schema: 3 })[0]).toMatch(/^shape@schema/);
  });

  it("refuses extra keys: a document has a closed shape", () => {
    expect(codes({ ...doc(), extra: 1 })[0]).toMatch(/^shape@/);
  });

  it("refuses a duplicate id, at the second", () => {
    expect(codes(doc({ blocks: [block("a"), block("a")] }))).toEqual([
      "duplicate_id@blocks.1.id",
    ]);
  });

  it("refuses a default locale outside the locales, and words in a locale the document lacks", () => {
    expect(codes(doc({ defaultLocale: "de" }))).toEqual([
      "locale@defaultLocale",
    ]);
    expect(
      codes(doc({ blocks: [block("a", "t", { title: { de: "Hallo" } })] }))
    ).toEqual(["locale@blocks.0.props.title.de"]);
  });

  it("refuses markup, script addresses and control characters in any text", () => {
    for (const bad of [
      "<script>alert(1)</script>",
      "a <b>bold</b>",
      "javascript:alert(1)",
      "data:text/html,x",
      "a\u0000b",
      "<!-- x -->",
    ]) {
      expect(codes(doc({ blocks: [block("a", "t", { label: bad })] }))).toEqual(
        ["unsafe_text@blocks.0.props.label"]
      );
    }
    expect(
      codes(
        doc({
          blocks: [block("a", "t", { label: { en: "<img src=x onerror=1>" } })],
        })
      )
    ).toEqual(["unsafe_text@blocks.0.props.label.en"]);
    expect(
      parseDocument(
        doc({ blocks: [block("a", "t", { label: "1 < 2 and 3 > 2" })] })
      ).ok
    ).toBe(true);
  });

  it("refuses keys that reach the prototype or inject markup", () => {
    const hostile = JSON.parse(
      '{"__proto__": "x", "dangerouslySetInnerHTML": "x", "onClick": "x", "style": "x"}'
    );
    const r = parseDocument(doc({ blocks: [block("a", "t", hostile)] }));
    expect(r.ok).toBe(false);
    expect(r.ok ? [] : r.issues.map((i) => i.code)).toEqual(
      Array(3).fill("unsafe_key")
    );
  });

  it("never lets a __proto__ key through", () => {
    const r = parseDocument(
      doc({ blocks: [block("a", "t", JSON.parse('{"__proto__": "x"}'))] })
    );
    expect(
      r.ok ? Object.keys(r.value.blocks[0].props) : ["refused"]
    ).not.toContain("__proto__");
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it("holds the bounds", () => {
    const deep = (n: number): ReturnType<typeof block> =>
      block(`d${n}`, "t", {}, n > 0 ? { c: [deep(n - 1)] } : {});
    expect(codes(doc({ blocks: [deep(DEFAULT_LIMITS.maxDepth)] }))).toEqual([
      expect.stringMatching(/^limit@/),
    ]);
    expect(
      parseDocument(doc({ blocks: [deep(DEFAULT_LIMITS.maxDepth - 1)] })).ok
    ).toBe(true);
    expect(
      codes(
        doc({
          blocks: Array.from({ length: 4 }, (_, i) => block(`b${i}`)),
        }) as unknown
      )
    ).toEqual([]);
    const r = parseDocument(
      doc({ blocks: Array.from({ length: 4 }, (_, i) => block(`b${i}`)) }),
      { ...DEFAULT_LIMITS, maxBlocks: 3 }
    );
    expect(r.ok ? "" : r.issues[0].code).toBe("limit");
    expect(
      codes(
        doc({
          blocks: [
            block("a", "t", { s: "x".repeat(DEFAULT_LIMITS.maxText + 1) }),
          ],
        })
      )
    ).toEqual(["limit@blocks.0.props.s"]);
  });
});

describe("validateDocument", () => {
  const registry = defineBlocks({
    root: {
      fields: { density: { type: "enum", options: ["compact", "airy"] } },
    },
    blocks: {
      page: {
        fields: {
          body: {
            type: "slot",
            allow: ["heading", "model"],
            max: 3,
            maxDepth: 1,
          },
        },
      },
      heading: {
        fields: {
          text: { type: "localized", required: true, maxLength: 20 },
          size: { type: "number", min: 1, max: 6, step: 1 },
          kind: { type: "enum", options: ["a", "b"], multiple: true },
          plain: { type: "text", bindable: false },
        },
      },
      model: {
        fields: {
          src: {
            type: "asset",
            accept: ["model/gltf-binary"],
            poster: { accept: ["image/*"] },
          },
          auto: { type: "boolean" },
        },
      },
    },
  });
  const assets = {
    mimeOf: (id: string) =>
      ({ m1: "model/gltf-binary", i1: "image/webp", v1: "video/mp4" }[id]),
  };
  const run = (d: ComposerDocument) => {
    const r = validateDocument(d, { registry, assets });
    return r.ok ? [] : r.issues.map((i) => `${i.code}@${i.path}`);
  };
  const page = (children: unknown[]) =>
    doc({ blocks: [block("p", "page", {}, { body: children })] });
  const heading = (props: object) =>
    block("h", "heading", { text: { en: "Hi" }, ...props });

  it("accepts a valid tree, the 3D asset with its poster, and references in place of values", () => {
    expect(
      run(
        page([
          heading({ size: 2, kind: ["a"], text: { var: "title" } }),
          block("m", "model", {
            src: { asset: "m1", poster: "i1" },
            auto: { bind: "x" },
          }),
        ])
      )
    ).toEqual([]);
  });
  it("refuses an unknown block, prop, slot", () => {
    expect(run(doc({ blocks: [block("x", "nope")] }))).toEqual([
      "unknown_block@blocks.0.type",
    ]);
    expect(run(page([heading({ extra: 1 })]))).toEqual([
      "unknown_prop@blocks.0.slots.body.0.props.extra",
    ]);
    expect(
      run(doc({ blocks: [block("p", "page", {}, { footer: [] })] }))
    ).toEqual(["slot@blocks.0.slots.footer"]);
    expect(
      run(
        doc({
          blocks: [block("h", "heading", { text: { en: "x" } }, { body: [] })],
        })
      )
    ).toEqual(["slot@blocks.0.slots.body"]);
  });
  it("holds the slot rules: allowed types, count, depth", () => {
    expect(run(page([block("q", "page")]))).toEqual([
      "slot@blocks.0.slots.body.0.type",
    ]);
    expect(
      run(
        page([
          heading({}),
          block("h2", "heading", { text: { en: "x" } }),
          block("h3", "heading", { text: { en: "x" } }),
          block("h4", "heading", { text: { en: "x" } }),
        ])
      )
    ).toContain("slot@blocks.0.slots.body");
  });
  it("holds the field rules", () => {
    expect(run(page([heading({ size: 9 })]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.size",
    ]);
    expect(run(page([heading({ size: 2.5 })]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.size",
    ]);
    expect(run(page([heading({ kind: ["z"] })]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.kind",
    ]);
    expect(run(page([heading({ text: { en: "x".repeat(21) } })]))).toEqual([
      "limit@blocks.0.slots.body.0.props.text.en",
    ]);
    expect(run(page([heading({ plain: { var: "v" } })]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.plain",
    ]);
    expect(run(page([block("h", "heading", {})]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.text",
    ]);
    expect(run({ ...doc(), root: { props: { density: "tight" } } })).toEqual([
      "invalid_prop@root.props.density",
    ]);
  });
  it("holds the asset rules: it exists, its MIME is allowed, its poster too", () => {
    const model = (src: object) => page([block("m", "model", { src })]);
    expect(run(model({ asset: "nope" }))).toEqual([
      "asset_unknown@blocks.0.slots.body.0.props.src.asset",
    ]);
    expect(run(model({ asset: "v1" }))).toEqual([
      "asset_mime@blocks.0.slots.body.0.props.src.asset",
    ]);
    expect(run(model({ asset: "m1", poster: "m1" }))).toEqual([
      "asset_mime@blocks.0.slots.body.0.props.src.poster",
    ]);
    expect(run(model({ asset: "m1", poster: "i1" }))).toEqual([]);
    expect(run(page([block("m", "model", { src: "x" })]))).toEqual([
      "invalid_prop@blocks.0.slots.body.0.props.src",
    ]);
  });
  it("answers the parse issues first", () => {
    expect(
      run(doc({ blocks: [block("a", "heading", { text: "<b>" })] }))
    ).toEqual(["unsafe_text@blocks.0.props.text"]);
  });
  it("does not trust a block type that is an object property name", () => {
    expect(run(doc({ blocks: [block("a", "constructor")] }))).toEqual([
      "unknown_block@blocks.0.type",
    ]);
  });
});

describe("mimeMatches", () => {
  it("matches exactly or by family, ignoring case", () => {
    expect(mimeMatches("image/webp", "image/*")).toBe(true);
    expect(mimeMatches("Model/GLTF-Binary", "model/gltf-binary")).toBe(true);
    expect(mimeMatches("video/mp4", "image/*")).toBe(false);
    expect(mimeMatches("image/svg+xml", "image/png")).toBe(false);
  });
});

describe("locales and references", () => {
  const d = doc({
    blocks: [
      block("a", "t", {
        title: { en: "Hi", fr: "Salut" },
        sub: { en: "Only" },
        shop: { var: "shop" },
      }),
      block(
        "b",
        "t",
        { x: { bind: "k" } },
        { c: [block("c", "t", { y: { var: "z" } })] }
      ),
    ],
  });
  it("falls back to the default locale and says so", () => {
    expect(resolveLocalized({ en: "Hi" }, "fr", d)).toEqual({
      text: "Hi",
      locale: "en",
      fallback: true,
    });
    expect(resolveLocalized({ fr: "Salut" }, "fr", d)).toEqual({
      text: "Salut",
      locale: "fr",
      fallback: false,
    });
    expect(resolveLocalized({ fr: "Salut" }, "en", d)).toBeUndefined();
  });
  it("lists the words to translate", () => {
    expect(listFallbacks(d, "fr")).toEqual(["blocks.0.props.sub"]);
    expect(listFallbacks(d, "en")).toEqual([]);
  });
  it("resolves props for a locale with the host's values", () => {
    const props = propsForLocale(d.blocks[0].props, "fr", d, {
      variables: { shop: "Salon" },
    });
    expect(props).toEqual({ title: "Salut", sub: "Only", shop: "Salon" });
    expect(
      propsForLocale({ x: { bind: "k" }, m: { asset: "i" } }, "en", d, {
        bind: () => 7,
      })
    ).toEqual({ x: 7, m: { asset: "i" } });
  });
  it("lists the variables and bindings the host must supply", () => {
    expect(referencesOf(d.blocks, d.root.props)).toEqual({
      variables: ["shop", "z"],
      bindings: ["k"],
    });
  });
});

describe("fromPuckData", () => {
  it("reads Puck data once, slots included, and the result validates", () => {
    const puck = {
      root: { props: { title: "T" } },
      content: [
        {
          type: "Grid",
          props: {
            id: "g1",
            cols: 2,
            items: [{ type: "Card", props: { id: "c1", text: "x" } }],
          },
        },
      ],
    };
    const d = fromPuckData(puck);
    expect(d.blocks[0]).toEqual({
      id: "g1",
      type: "Grid",
      props: { cols: 2 },
      slots: {
        items: [{ id: "c1", type: "Card", props: { text: "x" }, slots: {} }],
      },
    });
    expect(parseDocument(d).ok).toBe(true);
  });
  it("copes with nothing", () => {
    expect(fromPuckData(undefined).blocks).toEqual([]);
  });
});
