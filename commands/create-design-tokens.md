---
description: "[DEPRECATED] Tokens now come from the theme's theme.json, the design-tokens.json file is not created"
---

# Command: create-design-tokens — ⚠️ DEPRECATED

This command is **retired**. The plugin NO longer creates `design-tokens.json`.

## Why

The single source of design tokens is **the theme's `theme.json`**. The plugin reads it directly (+ the `src/scss/variables.scss` bridge) and substitutes short aliases (`var(--primary)`, `var(--space-lg)`, `var(--radius-md)`…) per the contract: the value exists in `theme.json` → `var(--alias)`, otherwise hardcode. No raw `--wp--preset--*` and no custom `--color-*`.

Full contract, alias catalog and name derivation rules — [guides/css-custom-properties.md](../guides/css-custom-properties.md).

## What to do instead

- Add/change a token → edit the theme's `theme.json` (a new token automatically reaches the front end and the editor, the `variables.scss` bridge gives it a short alias).
- See the available aliases → open the theme's `src/scss/variables.scss`.
- Block generation (`create-block` / `convert-html` / `convert-react-page`) substitutes the theme aliases on its own — no separate step is needed.

## Behavior when called

If this command is called anyway — tell the user that it is deprecated, show the short summary above and **do not create any files**.
