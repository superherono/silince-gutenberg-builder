# /convert-html — Converting HTML/SCSS into a Gutenberg block

Converts ready-made markup (HTML + SCSS) into a WordPress Gutenberg block.

## Usage

```
/silince-gutnebrg-builder:convert-html <path-to-html> [<path-to-scss>] [--no-comments]
```

**Parameters:**

- `<path-to-html>` — path to the HTML file with the section markup
- `<path-to-scss>` — path to the SCSS file (optional if it is in the same folder)
- `--no-comments` — fully autonomous mode: DO NOT ask the user A SINGLE question (no pre-generation notes, no Step 2 questions, no common promotion), run the conversion on defaults. Contract and defaults table: `guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`.

## Algorithm

1. **Read the prompt** from `${CLAUDE_PLUGIN_ROOT}/prompts/html-to-gutenberg.md` — it is the full conversion instruction
2. **Read the project config** from `src/.claude/config.json` (namespace, textdomain, blocksDir)
3. **Pre-generation notes (default)** — if `--no-comments` is NOT passed, ask via `AskUserQuestion`: "Are there any non-obvious points or wishes for this block that I should take into account before generation?" (two ways to answer: a "No" option + a free-text field). Save it to `userPreGenNotes` and keep it in context throughout the conversion. Contract: `guides/command-orchestration.md#-6-pre-generation-notes-pre-emptive-comments`. **If `--no-comments` is passed** — skip this step (`userPreGenNotes = null`).
4. **Read the HTML file** — determine the block structure
5. **Read the SCSS file** — it will be copied as-is
6. **Common reuse** — read `{blocksDir}/common/.registry.json`: the role (button / h2 / icon-tile / badge / card) exists → reuse the common blocks as inner blocks (if the folder is on disk); the role is missing → propose promotion. **With `--no-comments`:** reuse existing ones silently, DO NOT promote new roles (core/inline), candidates — into the report. See `guides/innerblocks-composition.md` → Common components
   - **If the HTML has `data-component` OR the project has `COMPONENTS.md`** — the section may be a shared component: check against [component-registry.md](../guides/component-registry.md) (a variant-capable block, do not create a duplicate, retrofit the variant into the existing block).
7. **Ask the user questions** (from the list in the prompt). **With `--no-comments`: DO NOT ask — apply the autonomous defaults** (see `guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`) and list the auto-decisions in the final report.
8. **Use context7** to check that the WordPress Block API usage is up to date
9. **Generate the files** according to the prompt (taking `userPreGenNotes` into account, if set)
10. **Offer validation** via `/silince-gutnebrg-builder:validate-block`

## Important

- Follow ALL rules from `${CLAUDE_PLUGIN_ROOT}/prompts/html-to-gutenberg.md`
- CSS classes from the HTML are kept WITHOUT changes
- SCSS is copied as-is, NOT generated
- The section's H2 heading → `{namespace}/custom-heading` (REQUIRED)
- Design values — aliases from the theme's `theme.json` (`var(--primary)`, `var(--radius-md)`…); see `guides/css-custom-properties.md`. The author's SCSS is copied as-is, but the generated `--ns-*` reference the theme aliases
- Content goes through the InnerBlocks template, NOT through RichText attributes in the parent block
