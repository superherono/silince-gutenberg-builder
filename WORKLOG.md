# Work Log — silince-gutnebrg-builder

Reverse chronological — newest on top. Capabilities reference — [README.md](README.md). Format: `## date — title` → **TL;DR** / **Changes** / **Decisions** (if any) / **Status**; full specification — in the project memory.

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
