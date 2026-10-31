/** @jest-environment node */
import {
  migrateDocument,
  parseDocument,
  readDocument,
  shopPageToDocument,
} from "../index";

// A shop document of today (`@krizaka/ui/shop`, schema 1), as the starters write it.
const shop = {
  schema: 1,
  preset: { id: "salon-vitrine", version: 1 },
  density: "compact",
  sections: [
    {
      key: "s_hero",
      type: "hero",
      variant: "poster",
      settings: { focus: "center", media: "med_1" },
      blocks: [
        { key: "b_open", type: "fact", settings: { kind: "open-now" } },
        { key: "b_area", type: "fact", settings: { kind: "area" } },
      ],
    },
    {
      key: "s_services",
      type: "services",
      variant: "menu",
      settings: {
        source: "all",
        groupBy: "category",
        columns: 1,
        aside: "hours",
      },
    },
    {
      key: "s_faq",
      type: "faq",
      variant: "list",
      settings: {},
      blocks: [
        {
          key: "q1",
          type: "question",
          settings: {
            question: { fr: "Où ?", en: "Where?" },
            answer: { en: "Here" },
          },
        },
      ],
    },
    {
      key: "s_policy",
      type: "policy",
      variant: "short",
      settings: { show: ["cancellation", "prices"] },
    },
    {
      key: "s_gallery",
      type: "gallery",
      variant: "grid",
      settings: { source: "pick" },
      blocks: [
        {
          key: "p1",
          type: "photo",
          settings: { mediaId: "med_2", caption: "A" },
        },
      ],
    },
  ],
};

describe("migration 1 -> 2 (the shop page)", () => {
  it("turns sections into blocks, their blocks into a slot, the preset into root props", () => {
    const r = migrateDocument(shop);
    expect(r).toMatchObject({ ok: true, from: 1 });
    const d = (r as { document: any }).document;
    expect(d.schema).toBe(2);
    expect(d.root.props).toEqual({
      preset: "salon-vitrine",
      presetVersion: 1,
      density: "compact",
    });
    expect(d.blocks[0]).toEqual({
      id: "s_hero",
      type: "hero",
      props: { variant: "poster", focus: "center", media: { asset: "med_1" } },
      slots: {
        blocks: [
          {
            id: "b_open",
            type: "fact",
            props: { kind: "open-now" },
            slots: {},
          },
          { id: "b_area", type: "fact", props: { kind: "area" }, slots: {} },
        ],
      },
    });
    expect(d.blocks[2].slots.blocks[0].props).toEqual({
      question: { fr: "Où ?", en: "Where?" },
      answer: { en: "Here" },
    });
    expect(d.blocks[3].props.show).toEqual(["cancellation", "prices"]);
    expect(d.blocks[4].slots.blocks[0].props.mediaId).toEqual({
      asset: "med_2",
    });
  });

  it("gives a document that parses", () => {
    expect(readDocument(shop)).toMatchObject({ ok: true });
  });

  it("is pure: the input is not touched, and the same input gives the same output", () => {
    const frozen = JSON.parse(JSON.stringify(shop));
    const once = shopPageToDocument(frozen);
    expect(frozen).toEqual(shop);
    expect(shopPageToDocument(frozen)).toEqual(once);
  });

  it("leaves a current document alone", () => {
    const current = (migrateDocument(shop) as { document: object }).document;
    expect(migrateDocument(current)).toEqual({
      ok: true,
      document: current,
      from: 2,
    });
    expect(parseDocument(current).ok).toBe(true);
  });

  it("refuses with a reason: not an object, no version, newer, a setting it cannot carry", () => {
    expect(migrateDocument([])).toEqual({
      ok: false,
      reason: "a document is an object",
    });
    expect(migrateDocument({})).toEqual({
      ok: false,
      reason: "the document has no schema version",
    });
    expect(migrateDocument({ schema: 9 })).toMatchObject({
      ok: false,
      reason: expect.stringContaining("newer"),
    });
    expect(
      migrateDocument({
        ...shop,
        sections: [
          {
            key: "a",
            type: "t",
            variant: "v",
            settings: { nested: { deep: { x: 1 } } },
          },
        ],
      })
    ).toEqual({
      ok: false,
      reason:
        "sections.0.settings.nested: a setting this format cannot carry over",
    });
    expect(readDocument({})).toMatchObject({
      ok: false,
      issues: [{ path: "schema" }],
    });
  });

  it("refuses a section without a key", () => {
    expect(
      migrateDocument({ ...shop, sections: [{ type: "x" }] })
    ).toMatchObject({ ok: false });
  });
});
