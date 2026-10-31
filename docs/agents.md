# krizaka-composer in detail

The Krizaka fork of Puck (akinaza ADR-010, amended 2026-10-31). Read this before touching the code.

## Upstream

- Remote `upstream` = `https://github.com/puckeditor/puck`; we started from the commit named in [NOTICE](../NOTICE).
- **Security and bug fixes** of upstream are cherry-picked, one pull request each, the upstream commit in the title
  (`fix(core): <what> (cherry-pick puckeditor/puck@<sha>)`), within a week of an upstream release.
- **Features** come in only when an issue asks for one.
- **Generic fixes go back upstream** (editor i18n hooks, accessibility, field-type hooks): a branch from this fork,
  a pull request to `puckeditor/puck`, linked from its krizaka-internal issue. Our schema, words and skin are not
  proposed upstream.
- Keep the canvas, drag and drop and the outline close to upstream so their fixes still apply; change them only with a
  reason in the pull request.
- Never open a pull request against `puckeditor/puck` by accident: `gh` in a fork defaults to the parent, so always pass
  `--repo krizaka/krizaka-composer` (the org's `pr-open` does).

## Plan (krizaka-internal#1889)

1. C0 — the fork set up (this state): CI on the org's reusable workflows, protection, registry. Nothing published.
2. C1 (this state) — `packages/core` is `@krizaka/composer`; the `ComposerDocument` schema in `/document`; the drops; first npm release by changesets (`.github/workflows/release.yml`).
3. C2 — the editor's words in French and English (`@krizaka/i18n`).
4. C3 — ergonomics: Krizaka tokens, `@krizaka/ui` controls, keyboard, accessibility.

## Not here

- Publishing is the changesets release workflow only (provenance, trusted publishing); upstream's publish workflows were removed.
- No product code: the shop catalogue and its block config live in their own repositories.
