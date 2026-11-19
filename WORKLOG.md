# Work Log — silince-gutnebrg-builder

Reverse chronological — newest on top. Capabilities reference — [README.md](README.md). Format: `## date — title` → **TL;DR** / **Changes** / **Decisions** (if any) / **Status**; full specification — in the project memory.

---

## 2026-11-19 — 1.0.1: post card entry resolution (#1, #3)

TL;DR  On the front-end the post card shows the same entry as in the editor: the loop item inside a Query Loop, otherwise only the entry selected in the sidebar.

Changes
· `templates/post-card/render.php` — the selected entry (`postId`) is no longer overridden by the page the card sits on (#1, PR #2).
· `templates/post-card/init.php` — server-side Query Loop tracker `{{NAMESPACE}}_post_card_in_query_loop()`; a card without a selection renders nothing outside a loop, a leftover `postId` inside a loop is ignored (#3, PR #4).
· `templates/post-card/README.md` — "Which entry the card shows" section.

Decisions
· On the server `core/post-template` passes only `postId`/`postType` to inner blocks (no `queryId`), so the loop is detected by counting Post Template renders; `the_content` opens a fresh level so a card inside a post shown in full by a Query Loop stays standalone.
· A card rendered from PHP without `postId` no longer picks up the current post — pass `postId` explicitly (README).

Status  merged to main · checked on a throwaway WordPress 7.1.5 site (block + classic theme, 42/42) · already scaffolded copies of post-card are not updated

---

## 2026-07-03 — COMPONENTS.md consumption + MCP-only source

TL;DR  The plugin reads the design's component registry (`data-component` → component/variant choice); design URL import — only via the `claude_design` MCP.

Changes
· New guide `guides/component-registry.md` — two registries (input `COMPONENTS.md` vs output `common/.registry.json`), `PascalCase→kebab` normalization, variant classifier, mechanisms, retrofit.
· `convert-react-page.md` — indexing by `data-component` (priority), prefilling Group/Variant from markers, state fields (`component`/`componentVariant`/`shared`), `--update-source` matching by component.
· `react-section-converter.md` — variant from `componentVariant`, Step 3.5 (hybrid emission + retrofit), anti-pattern #2 narrowed for shared.
· `innerblocks-composition.md`, `command-orchestration.md`, `convert-html.md`, `create-block.md`, `README.md` — registry cross-check + autonomous defaults.
· URL import moved to the `claude_design` MCP; WebFetch fallback removed; fix for the new URL format `…/design/p/<hash>?file=` + nested/encoded `?file=`.

Decisions
· We keep the "component / not a component" question — prefill the default from the marker, the user confirms (silently in `--no-comments`).
· Variant hybrid: visual → attribute/blockStyle (switchable in the admin); structural → block variations on insertion.
· Incremental retrofit: converting 1 page at a time → a variant-capable block, appending a variant to an existing one (no duplicates); relies on the persistent `common/.registry.json`.
· URL loading — MCP-only + availability preflight (a literal 20s timer cannot be implemented at the agent level → see `commands/convert-react-page.md` STEP 1.1). Interactive: stop + advice. Autonomous: smart retry (bounded, up to 4 attempts) → report + stop; MCP missing → stop immediately.
· Rules for maintaining the React source (edit shared → mirror, keep markers) — the site developer's responsibility; we do not pull them into the plugin.

Open  (1) The `data-component`/`@component` grep patterns were not checked against live HTML. (2) Nested/encoded `?file=` + `open_file` were not tested on a live MCP import. — verify on the first `/convert-react-page` run.

Status  working tree · not committed
