# Krizaka Composer

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-composer&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-composer) [![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-composer&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-composer) [![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-composer&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-composer) [![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-composer&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-composer) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=krizaka_krizaka-composer&metric=coverage)](https://sonarcloud.io/summary/new_code?id=krizaka_krizaka-composer)

The visual page editor of the Krizaka family: **the Krizaka fork of [Puck](https://github.com/puckeditor/puck)**, to be
published on npm as `@krizaka/composer` (MIT). It keeps Puck's canvas, drag and drop, outline and phone layout, and
changes what the products need: a versioned document validated with zod, nested blocks, content per locale, variables
and bindings; an editor in French and English; Krizaka's tokens and `@krizaka/ui` controls, keyboard and accessibility.

|              |                                                                                                                                                |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| Package      | `@krizaka/composer` on npm (MIT), released with changesets and npm provenance; the editor is `packages/core`.                                  |
| Document     | `@krizaka/composer/document`: the versioned `ComposerDocument` (schema 2), validated with zod, no React, runs on a server.                     |
| Upstream     | `puckeditor/puck`, tracked as the `upstream` remote: security and bug fixes are cherry-picked, generic fixes are proposed back from this fork. |
| Licence      | MIT. Puck's [LICENSE](LICENSE) is kept unchanged; see [NOTICE](NOTICE).                                                                        |
| Used by      | [Akinaza](https://github.com/krizaka/akinaza)'s shop editor (Boutique › Page).                                                                 |
| Contributing | [AGENTS.md](AGENTS.md) and [docs/agents.md](docs/agents.md); the org's standards in [krizaka/.github](https://github.com/krizaka/.github).     |

## The document

A page is JSON: `{ schema: 2, locales, defaultLocale, root: { props }, blocks }`. A block is `{ id, type, props, slots }`;
`slots` hold nested blocks. A prop is text, a number, a boolean, a list of options, words per locale (`{ en, fr }`), a
variable (`{ var }`) or a binding (`{ bind }`) the host resolves, or an asset in the host's storage (`{ asset, poster? }`).
There is no markup and no code in a document: text holding a tag or a script address, an event-handler or `style` prop,
and `__proto__` keys are refused.

```ts
import {
  defineBlocks,
  validateDocument,
  readDocument,
} from "@krizaka/composer/document";

const registry = defineBlocks({
  blocks: {
    model: {
      fields: {
        src: {
          type: "asset",
          accept: ["model/gltf-binary"],
          poster: { accept: ["image/*"] },
        },
      },
    },
  },
});

// On a server, before storing: every issue with its path and a stable code, never a throw.
const result = validateDocument(body, {
  registry,
  assets: { mimeOf: (id) => storage.mimeOf(id) },
});
// An older stored document (the shop page, schema 1) is read once: migrate, then parse.
const stored = readDocument(row.document);
```

Field types are closed: `text`, `localized`, `enum`, `number` (min, max, step, unit), `boolean`, `asset` (MIME allow-list)
and `slot` (allowed types, count, depth). Versions are migrated by pure functions (`migrateDocument`); a newer document
than the code knows is refused. Puck's saved data is read once with `fromPuckData` and never written.

Dropped from the upstream fork: rich text (TipTap), external fields, `create-puck-app`, the Contentful and emotion
plugins, the heading analyzer, the demo and docs apps and the recipes.
