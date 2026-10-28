# Design Tokens Creator Agent — ⚠️ RETIRED

This agent is **retired** together with the `/create-design-tokens` command.

The source of design tokens is **the theme's `theme.json`** (bridge: `src/scss/variables.scss`). The plugin reads them directly and substitutes short aliases per the contract in [guides/css-custom-properties.md](../guides/css-custom-properties.md): the value exists in `theme.json` → `var(--alias)`, otherwise hardcode. The plugin's own `design-tokens.json` is no longer created.

If you are called anyway — **do not create files**; report that tokens come from the theme's `theme.json` and refer to the contract above.
