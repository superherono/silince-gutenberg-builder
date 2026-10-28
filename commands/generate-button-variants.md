---
description: Generate button variants and sizes from the project's design system
---

# Command: generate-button-variants

Rebuilds the button variants (color: `primary`/`secondary`/… — the set is defined by the design file) and the size axis (`small`/`medium`/`large`) from the project's design system and syncs them across **4 surfaces** of the button block: `style.scss` (map), `block.json` (enum), `edit.js` (SelectControl + conditional overrides), `save.js`.

**Full contract:** [guides/button-variant-generation.md](../guides/button-variant-generation.md). The command is a thin entry point; all the logic is there.

## 📥 Parameters

**block-name** (optional): name of the button block without the namespace. If not given — the button is found by the discovery order (registry role `button` → convention `common/default-button` → `default-button` → scan). See [Finding the button block](../guides/button-variant-generation.md#finding-the-button-block-discovery).

**Options:**

- `--dry-run`: show what would be generated, but do not write files.

**Examples:**

```bash
/silince-gutnebrg-builder:generate-button-variants
/silince-gutnebrg-builder:generate-button-variants default-button
/silince-gutnebrg-builder:generate-button-variants default-button --dry-run
```

---

## 🔧 What it does (step by step)

1. **Find the button block** by the [discovery order](../guides/button-variant-generation.md#finding-the-button-block-discovery): resolve `blocksDir` (from config, default `./blocks`, relative to the theme root) → explicit `block-name` → the `common/.registry.json` registry (role `button`, check `dir` on disk) → convention (`{blocksDir}/common/default-button`, then `{blocksDir}/default-button`, then a scan of `block.json` files with the `buttonVariant` attribute). Several candidates → ask. **Not found → do not create one silently:** report it and offer a scaffold from `templates/button/`, otherwise stop.
2. **Read the inputs** (paths from `src/.claude/config.json`, relative to the theme root):
   - `designSystemPath` → the `components.button-*` section (which variants + the recipe). **Key not set or file not found → ask the user** (`AskUserQuestion`): provide a path / generate from the palette / cancel. Do not fall back to the palette silently. See [contract §7](../guides/button-variant-generation.md#7-no-design-file--ask-the-user).
   - `themeJsonPath` (default `theme.json`) → token values + existence validation.
   - `themeAliasesPath` (default `src/scss/variables.scss`) → alias whitelist.
3. **Build the recipes** per [contract §2–§4](../guides/button-variant-generation.md): slot→`--button-*`, `{token}`→`var(--alias)` (table in [css-custom-properties.md](../guides/css-custom-properties.md)), split `padding`, `border-width` when `border-color` is present, flags `underline-hover`/`dark-context`, default-hover for solid-fill without `hoverBackground`.
4. **Overwrite the 4 surfaces** ([contract §8](../guides/button-variant-generation.md)):
   - `style.scss` — the contents of `$button-variants` and `$button-sizes`. **Do not touch the `@each` loop and the base `--button-*` defaults.**
   - `block.json` — `buttonVariant.enum` + `default` (`primary`/the first one); `buttonSize.enum`.
   - `edit.js` — `SelectControl` options (variant/size); check the conditional overrides (§6).
   - `save.js` — check the conditional overrides (§6).
5. **Report:** the list of generated variants/sizes; tokens that did not resolve (if any) — noting that they were hardcoded per contract B1.

## ⚠️ Invariants

- The variant name must match across all 4 surfaces — otherwise the `--{name}` class is left without a rule (the same bug the legacy `--primary`/`--outline` had).
- Values — `var(--alias)` from theme.json, not hardcoded hex (contract B1). No alias/token → hardcode the value from theme.json; not in theme.json → a literal.
- Idempotency: a repeated run = a full rebuild from the current design file.
