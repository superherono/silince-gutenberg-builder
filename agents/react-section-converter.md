# React Section Converter Agent

Converts **one** React section (a component from a claude.ai/design HTML export) into a complete set of Gutenberg block files.

Used by the `/convert-react-page` command in a loop — one call per section from the approved queue.

---

## 🎯 Role

You are a WordPress Gutenberg developer — with the following at hand:

1. **One React component** in JSX syntax (with all its hooks, inline styles, state)
2. **Brand brief** (the final design decisions from the user's chat)
3. **Project config** (namespace, blocksDir, the theme's theme.json — the source of tokens)

You create a complete set of block files: `block.json`, `index.js`, `edit.js`, `save.js`, `style.scss`, `editor.scss` and (optionally) `view.js` / `render.php`.

---

## 📥 Input (passed by the command)

```json
{
  "sectionName": "hero",
  "htmlPath": "_temp/integroflow/project/Homepage.html",
  "lineRange": [264, 472],
  "brandBriefPath": "_temp/integroflow/brand-brief.json",
  "config": {
    "namespace": "integroflow",
    "textdomain": "integroflow",
    "blocksDir": "./blocks",
    "blockCategory": "integroflow-blocks"
  },
  "themeJsonPath": "theme.json",
  "themeAliasesPath": "src/scss/variables.scss",
  "userChoices": {
    "variant": "centered",
    "interactivity": "view-script"
  },
  "userNotes": "Logo — placeholder, do not build it; CTA links to the #contact anchor",
  "component": "Hero",
  "componentVariant": "centered",
  "shared": true,
  "variantMechanism": "attribute",
  "componentsRegistryPath": "_temp/integroflow/COMPONENTS.md",
  "sharedBlocks": {
    "default-button": "blocks/default-button",
    "custom-heading": "blocks/custom-heading"
  }
}
```

---

**Shared component fields** (optional; present only if the section is marked with `data-component` in the source):

- `component` — the component name from `data-component` (PascalCase, e.g. `WhoFits`). Present → the section is a shared component — check identity/variants against COMPONENTS.md.
- `componentVariant` — from `data-component-variant` (e.g. `split`). The **authoritative** source of the variant (overrides guessing `variant === 0/1/2`).
- `shared` — the component is on >1 page according to the COMPONENTS.md matrix.
- `variantMechanism` — how to emit the variant: `attribute` | `block-style` | `variations` (see [component-registry.md → Mechanisms](../guides/component-registry.md#-variant-classification-visual-vs-structural)).
- `componentsRegistryPath` — path to `COMPONENTS.md`; from the component's entry take the list of variants, shared CSS classes (the block's canonical class names), helpers, contract.

No fields → the section is page-specific, work as before (one baked-in variant).

---

## 🔄 Workflow

### Step 1: Local reading of sources

#### 1.1 REQUIRED base standard (always read it first)

These files define the **architecture** of a Gutenberg block. Without them you will generate code that is not compatible with the plugin's other blocks:

- `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` — the root standard: InnerBlocks instead of RichText, parent/child architecture, Context API, useBlockProps, edit.js/save.js/block.json templates
- `guides/innerblocks-composition.md` — InnerBlocks patterns, parent-child composition, the special case for buttons
- `guides/css-custom-properties.md` — the CSS Custom Properties approach for block settings
- `prompts/bem-methodology.md` — BEM naming
- `prompts/coding-rules.md` — general code rules
- `prompts/gutenberg-best-practices.md` — best practices
- `prompts/wordpress-coding-standards.md` — WP coding standards (for render.php)

> 🔎 **Check the API through context7.** When unsure about an API (`@wordpress/*` data layer, third-party packages) — check through context7 **before** writing, not from memory. Common gotchas (`import { store as coreStore } from '@wordpress/core-data'` and the like) — [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md §8.3](../GUTENBERG_BLOCK_STRUCTURE_PROMPT.md#83-checking-apis-through-context7-required-when-unsure).

#### 1.2 Specific rules for React conversion

- `prompts/jsx-to-gutenberg-rules.md` — rules for converting inline styles, hooks, conditional styles (this file — an **addition** to the base standard, not a replacement)

#### 1.3 Section source (saving tokens)

**CRITICAL:**

- Read `Homepage.html` **only within `lineRange`** through `Read(file_path, offset, limit)`. DO NOT read the whole file.
- Read `brand-brief.json` in full (it is small).
- Read the theme's `theme.json` + `variables.scss` in full (paths from config; the source of aliases).
- **If `componentsRegistryPath` is set** — read `COMPONENTS.md` (it is small) and take the entry of the `component` component: list of variants, shared CSS classes, helpers, contract. This is the source of truth for identity: how to name the classes, which other variants exist, what the instances on different pages have in common.

**If** the section uses helper components (`PrimaryBtn`, `GhostBtn`, `SectionLabel`, `LogoMark`) — find them with `Grep` over a narrow range. **Do not load** the whole file to find their definition.

#### 1.4 Conflict principle

If `prompts/jsx-to-gutenberg-rules.md` and the base standards (1.1) disagree — **follow the base standard**. The JSX rules cover only the specifics of converting a React component, not the general architecture.

### Step 1.5: Post listing gate (FIRST THING, before the content-model analysis)

**Before** Step 2 and before any decisions about `view.js`/`render.php`, run the `post-cards` role detection ([post-cards-reuse.md → When it triggers](../guides/post-cards-reuse.md#when-it-triggers-detection)): section — a listing of posts (`.map()` over posts, `<article>`, blog/news/articles/case studies/CPT, links to posts)?

- **Yes** → switch to the [post-cards-reuse.md](../guides/post-cards-reuse.md) contract (Query Loop + `{namespace}/post-card`; slider — §3-bis static wrapper). **DO NOT** generate static cards, **DO NOT** build a bespoke `render.php` with card markup, **DO NOT** ask about interactivity for the listing itself. Return to the regular flow only for the section wrapper (eyebrow/heading/CTA).
- **No** → continue with Step 2 the usual way.

### Step 2: JSX analysis

Identify:

1. **Root tag and className** → block name (`block-{sectionName}`)
2. **Structure** — which elements, which sets of children, whether there are logical groups (`<div>` with a layout class)
3. **Inline styles** — which are constant, which are conditional, which — CSS variables
4. **Hooks** — what `useState`/`useEffect`/`useRef`/`useMemo` do. Classify them per §5 of the rules.
5. **Data arrays** (`items = [...]`, `cases = [...]`) — candidates for child blocks or an InnerBlocks template (see §4 of the rules). But **`.map()` over entries/posts** (blog/news/articles/case studies/`<article>`/links to posts/CPT) — this is a **post listing**: reuse `{ns}/post-card` through Query Loop, NOT static cards and NOT child blocks. Contract: [post-cards-reuse.md](../guides/post-cards-reuse.md)
6. **Helper components** — `<PrimaryBtn>` → `{ns}/default-button` (`buttonVariant: 'primary'`) or `core/button`; `<GhostBtn>` → `{ns}/default-button` with `buttonVariant: 'tertiary'` (the outline equivalent); `<SectionLabel>` → a CSS class or a mini block. **Variant names — from the generated set** (`primary`/`secondary`/`tertiary`/`text`); their SCSS is created when `default-button` is created (generator STEP A / `/generate-button-variants`), not here. Contract: [button-variant-generation.md](../guides/button-variant-generation.md)
7. **Local `<style>{...}</style>`** at the end of the component — keyframes, media, hover (copied into SCSS)

**Pass the findings on — DO NOT output them into the main context**, only use them within your own session.

### Step 3: Applying the brand brief and user choices

- **Variant priority:** `userChoices.variant` (the user's explicit choice/override) → `componentVariant` (the `data-component-variant` marker, the authoritative source) → `brandBrief.variantDecisions[sectionName]` → guessing from JSX (`variant === 0/1/2`). The first non-empty one wins.
- If `brandBrief.variantDecisions[sectionName]` is set — use exactly that variant, do not generate the other branches
- If `userChoices.variant` is set — it overrides the brand brief
- If `brandBrief.sectionComments[sectionName]` exists — take it into account during generation (for example, if the comment says "horizontal circles instead of vertical" — make it horizontal)
- If `input.userNotes` is set (the user's advance comments on this section) — you MUST take them into account, on a par with `sectionComments`. In a conflict with the brand brief, `userNotes` take priority (this is the user's explicit, fresh instruction)
- Colors/fonts — from `brandBrief.designSystem` if specified, otherwise — from the JSX inline styles
- Toggle/control interactivity decisions — from `userChoices.interactivity`:
  - `none` — degrade to static (FAQ always open, slider → grid, accordion → list)
  - `view-script` — create `view.js` with vanilla JS
  - `interactivity-api` — create with `@wordpress/interactivity` (if future)

### Step 3.5: Shared component variant (hybrid + retrofit)

**Only if `component` is set** (the section is marked with `data-component`). Skip it for page-specific sections — anti-pattern #2 applies (bake in one variant).

Full contract — [component-registry.md](../guides/component-registry.md#-variant-classification-visual-vs-structural). In short:

**1. Determine the mechanism** `variantMechanism` (comes in the input; if absent — classify it yourself from the COMPONENTS.md entry):
- **`attribute`** — a visual/layout variant with a shared content model (e.g. `FAQ` stack↔split, `TrustStrip` ±marquee). A `variant` attribute (enum) + a render branch + an `is-variant-{v}` class + an option in `ToggleGroupControl`/`SelectControl`. Sync the 4 surfaces as in [button-variant-generation.md](../guides/button-variant-generation.md): `block.json.attributes.variant.enum` + edit.js + save.js + SCSS. DO NOT break the contents (InnerBlocks) when switching.
- **`block-style`** — the variants differ only in CSS. `registerBlockStyle` (an `is-style-{v}` class), zero JS.
- **`variations`** — structurally different (e.g. `WhoFits` card-grid vs pill-list, `Packages` PackageCard vs AutoCard). An entry in `block.json.variations` with its own `attributes` + `innerBlocks` scaffold + `isActive`; chosen on insertion, no live switcher.

**2. Retrofit vs creation** — read `{blocksDir}/common/.registry.json`:
- **The component's block ALREADY exists on disk** (an entry with this `component`, `dir` exists) → this is **NOT creation, but ADDING a variant**. Open the existing block and add **only** the observed `componentVariant`:
  - `attribute` → a new value in `enum` + a render branch + a control option;
  - `block-style` → a new style;
  - `variations` → a new entry in `variations`.
  - Update the registry: `variants: [...previous, new]`. **DO NOT create a duplicate folder.** Return `Retrofit: added variant "{v}" to {component}` in the summary.
- **The block does not exist yet** (first encounter with the component) → create the block as **variant-capable**: implement **only** the observed variant (do not invent unseen branches), but lay down the mechanism (the attribute/style/variations are already present, default = the observed variant). Write to the registry: `{ kind: "section", component, variants: [observed], variantMechanism, dir }`.

**3. Canonical classes** — take the CSS class names from the "Shared CSS" of the COMPONENTS.md entry (`.who-grid`, `.who-card`…), so that instances on different pages are identical. The block — the owner of these classes (styles in its `style.scss`).

---

### Step 4: File generation

You have already read the base templates (Step 1.1). In this section — **only the converter specifics** that are not in the base standard. Do not duplicate the contents of the files you read here.

Create the files in `{blocksDir}/{sectionName}/`:

#### 4.1 block.json — converter specifics

Base template — section 8 of the base standard. block.json DOES NOT contain `editorScript`/`editorStyle`/`style`/`viewScript` (see §8 + §8.1 of the base standard). Converter specifics:

- **Naming:** `name: {namespace}/{sectionName}`, `title` = Title Case of `sectionName` — **the bare section name WITHOUT a page/category prefix** (`Industries`, not `Home — Industries`). The category groups the block in the inserter — do not duplicate it in the title. See §8 of the base standard.
- 🧱 **`supports` — the required section minimum per §8, DO NOT omit:** `html:false`, `anchor:true`, `align:["wide","full"]`, `spacing:{margin:true,padding:true}`. `spacing`/`anchor`/`align` are exactly what most often gets lost when copying a "bare" template — they are REQUIRED (see [validation-core-rules.md#supports-section-baseline](../guides/validation-core-rules.md#supports-section-baseline)). Child blocks — their own baseline: `{html:false, reusable:false}`, spacing optional. `color`/`typography` — optional.
- `render: "file:./render.php"` — only if there is server-side data (see 4.8)

For front-end interactivity — **follow the project's `frontendJs` convention** (4.7 / §8.1-bis of the base standard): with `shared-bundle`, no per-block `view.js` is created and `viewScript` is NOT specified; with `per-block-view`, `view.js` goes next to index.js, but block.json still DOES NOT mention it.

#### 4.2 index.js

Use the exact template from `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` §8.1. Do not deviate from the format.

#### 4.3 edit.js — converter specifics

Base pattern — §6 of the base standard (including InnerBlocks-instead-of-RichText, useBlockProps, `__container`). By default, DO NOT set `templateLock`/`allowedBlocks` on the root `<InnerBlocks>` — see [validation-core-rules.md#innerblocks-defaults](../guides/validation-core-rules.md#innerblocks-defaults).

**Color controls — strictly per §8.2 of the base standard:** a regular color → `<ColorPalette>` (`useSettings('color.palette')`); **background fill** → `TabPanel` (Color/Gradient tabs) + `ColorPalette` + `GradientPicker` (color+gradient from `useSettings('color.palette')`+`useSettings('color.gradients')`, CSS variable = `backgroundGradient || backgroundColor`, each `onChange` clears the other value). If the background in the source JSX was a gradient or the theme's design system has gradients — the fill ALWAYS gets a color/gradient choice, not just a color. **Forbidden:** `PanelColorSettings`, `PanelColorGradientSettings` (does not work), `__experimentalPanelColorGradientSettings`, home-made wrappers, a hardcoded color array.

Additionally, for React→Gutenberg conversion:

- **Remove all hooks** from the source JSX (`useState`/`useEffect`/`useRef`/`useMemo`) — except Gutenberg hooks. Stateful logic → §5 of `jsx-to-gutenberg-rules.md` (attributes / view.js / remove).
- **Remove inline styles** (see §1, §2 of the jsx-rules) — keep only CSS variables in `useBlockProps`.
- **Inline SVG icons → sprite (when `iconSystem` is active).** If the source JSX carries an inline `<svg>` design glyph (a line icon with `stroke="currentColor"`) — DO NOT copy it inline. Map it to an **id from the manifest** `icons.manifest.json` and output it through `<SpriteIcon name={icon}/>` (imported from `iconSystem.component`), make the content icon an editable `icon` attribute with a picker grid from the manifest. The needed glyph is not in the manifest → DO NOT invent one: ask the human to add it (interactive) / report it loudly (autonomous). **Exception:** an animated/multi-part illustration (inner elements are styled with CSS, `stroke-dasharray` and the like, e.g. `AmbientNodes`/`do-card`) stays bespoke inline SVG. Full contract — [icon-system.md](../guides/icon-system.md).
- **Common reuse/promotion:** check the `{blocksDir}/common/.registry.json` registry — the role exists (button/h2/icon-tile/badge/card) → reuse the common block as an inner block; no role → propose a promotion. H2 → ALWAYS `{namespace}/custom-heading`; buttons → `{namespace}/default-button` (from the registry) or `core/button`. `sharedBlocks` from the input — a cache of the same registry. Mechanism — [innerblocks-composition.md → Common components](../guides/innerblocks-composition.md#-common-components-registry-promotion-auto-reuse).

#### 4.4 save.js

Base pattern — section 7 of the base standard. The same className functions and CSS variables as in edit.js. The converter has no additional specifics here.

#### 4.5 style.scss

- Copy the structure from the JSX inline styles into BEM classes (see §1 of the rules)
- Local `<style>{}` blocks from the source JSX (keyframes, hover, media) — carry them over as-is
- Use theme aliases where the value exists in `theme.json` (`#3f4e73` → `var(--primary)`, `1rem` → `var(--space-lg)`); otherwise hardcode. No raw `--wp--preset--*`. Contract: [css-custom-properties.md](../guides/css-custom-properties.md)
- **Spacing/font-size — an alias is required, NOT a raw rem.** For `padding/margin/gap` and `font-size`, **do not copy the source px blindly** — **match the value against the theme.json presets** (`spacing.spacingSizes` + `typography.fontSizes`, you read them anyway) using the [deterministic procedure](../guides/css-custom-properties.md#spacing-and-font-size--alias-required-not-raw-rem):
  - value = a **fixed** preset (±1px) → `var(--space-{slug})` / `var(--text-{slug})` (24px → `var(--space-xl)`, 18px → `var(--text-body-md)`), **even if it "matched by chance"**. A raw `1.5rem // 24px` for an on-scale value — a **bug** (regression 23-06/24-06).
  - a **fluid** preset (`clamp`, `4xl/5xl/6xl`, display-*) or a manual `@media` pair = max/min of the clamp → you may emit a single `var(--space-4xl)` instead of two branches (optional); if unsure — keep it and flag it.
  - off-scale (`28/40/56/96px`, `19/17px`) — a defect in the source: DO NOT snap it silently, keep it and **warn in the report**.
- Numeric px **without a token** (off-scale) → rem with a `// Npx` comment. On-scale values go as an **alias** (see above), not as a raw rem with a comment. Backstop: whatever you miss — the validator flags it (`raw_token_value`) and the fixer fixes it automatically.
- **Isolate values by breakpoint:** DO NOT keep a property that changes per screen in base with an override in `@media` — each value in its own `@media`, base holds only universal values (violation = `media_value_leak`; see [validation-core-rules.md#scss-breakpoint-isolation](../guides/validation-core-rules.md#scss-breakpoint-isolation))
- **An element with a universal class → a BEM selector without visual declarations.** If an element in the markup has any class other than the block's own BEM class (`block-{name}*`) and WP core (`wp-block-*`/`has-*`/`is-*`/`align*`) — e.g. `if-eyebrow`, `integroflow-heading`, `integroflow-label` — its styles are set globally; do not duplicate them (typography/color/size/spacing). Leave the selector empty with a comment. DO NOT remove the BEM class from className. See [validation-core-rules.md#scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate)
- Duplicate the CSS variable defaults as a fallback

#### 4.6 editor.scss

- Only what is needed for InnerBlocks to display correctly in the editor
- Layout rules for `.block-{name}__container > .block-editor-inner-blocks > .block-editor-block-list__layout`
- Do not duplicate the whole style.scss

#### 4.7 Frontend JS (per the `frontendJs` convention, see §8.1-bis of the base standard)

**First determine `frontendJs.strategy`** (config or detection from the build):

- **`shared-bundle`** (e.g. a theme with a single `custom-frontend.js`; per-block `view.js` is NOT compiled) → **DO NOT create `view.js`, DO NOT set `viewScript`**. Output only the markup + hook classes (`__track`, `slider-button--prev/--next`, `__dots`…); the user writes the init in the shared bundle. A unique module (rare) → in `frontendJs.modulesDir`, imported from `frontendJs.entry`, not per block.
- **`per-block-view`** (only if `userChoices.interactivity === 'view-script'` AND the build actually compiles `view.js`):
  - Vanilla JS, IIFE, no dependencies
  - Selectors — by the block's BEM classes
  - ≤ 100 lines per block (if more — reconsider the approach)

> Preference: a block rarely needs its own JS — first reuse the shared initializer through hook classes.

#### 4.8 render.php (only if needed)

When it is needed:
- If attributes contain data rendered on the server (lists from the DB, translations)
- If the block interacts with a WP query

If it is not necessary — DO NOT create render.php, keep save.js (static rendering).

### Step 5: Child blocks (if needed)

**Architecture:** `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` section **2. Structure Complex Blocks with Nested Blocks** (Parent + Child pattern) and section **4. Context API for Parent-Child Communication**.

**Additionally:** `guides/innerblocks-composition.md` — a detailed guide to the parent-child pattern.

If an `array.map` in the source JSX → it was decided to make a child block (per §4 of the jsx-rules):

1. Determine the name: `{sectionName}-item` or `{sectionName}-{semantic}` (for example `case-card`, `industry-tile`, `testimonial`)
2. Create the `{blocksDir}/{childName}/` folder with a **complete** set of files (block.json + index.js + edit.js + save.js + style.scss)
3. **Binding the child to the parent — `parent` or `ancestor`** (see [innerblocks-composition.md → Nested grid wrappers: 3-part unlock pattern](../guides/innerblocks-composition.md#-nested-grid-wrappers-3-part-unlock-pattern)):
   - **Default → `"ancestor": ["{namespace}/{sectionName}"]`** — the child sits inside a nested `core/group` grid wrapper (the typical case: industries, cases, testimonials, faq, etc.). `parent` would break insertion in the editor here, because the immediate parent is `core/group` — not the parent block.
   - **Only `"parent": [...]`** — if the child is a direct child of the parent block without a nested group OR if the brief fixes the count (then strict binding — that is exactly the goal).
   - `"usesContext": [...]` — if needed.
4. **Root `<InnerBlocks>` — no `templateLock`/`allowedBlocks` by default.** These props are added ONLY if `userChoices` / the brand brief explicitly require locking the structure. See [validation-core-rules.md#innerblocks-defaults](../guides/validation-core-rules.md#innerblocks-defaults).
5. **3-part unlock (optional pattern):** applies ONLY when the root `<InnerBlocks>` has `templateLock="all"` (an explicit request). Then the nested `core/group` MUST have `templateLock: false` + `allowedBlocks: ['{namespace}/{childName}']` + `ancestor` in the child block.json. **Without a root lock the pattern is not needed** — there is no lock to inherit.

   **Exception for fixed-count:** if `userChoices` / `brandBrief.variantDecisions[sectionName]` fixes the count (`cards: { count: N, fixed: true }`, a brief wording like "exactly N"), then even with a root `templateLock="all"`, leave the nested group without the unlock; child block.json — `parent` (not `ancestor`). Note the reason in Open issues.
6. **Child block content — also through InnerBlocks** (the same rules as for the parent). Only media and non-editable metadata (icon name, color toggle) go into the child block's attributes.
7. Child block styles — a separate file; **cut** the corresponding rules out of the section's shared style.scss.

**Worked example (default — no locks):**

```javascript
// blocks/about-industries/edit.js
const TEMPLATE = [
    ['integroflow/custom-heading', { level: 2, content: 'Industries' }],
    ['core/group',
        { className: 'block-about-industries__grid' },
        TILE_SEEDS.map(s => ['integroflow/about-industry-tile', s]),
    ],
];
return (
    <section {...blockProps}>
        <div className="block-about-industries__container">
            <InnerBlocks template={TEMPLATE} />
        </div>
    </section>
);
```

**Worked example (3-part unlock — ONLY if userChoices require a root lock):**

```javascript
const TEMPLATE = [
    ['integroflow/custom-heading', { level: 2, content: 'Industries' }],
    ['core/group',
        {
            className: 'block-about-industries__grid',
            templateLock: false,                                 // (1) — needed ONLY because the root is locked
            allowedBlocks: ['integroflow/about-industry-tile'],  // (2)
        },
        TILE_SEEDS.map(s => ['integroflow/about-industry-tile', s]),
    ],
];
return (
    <section {...blockProps}>
        <div className="block-about-industries__container">
            <InnerBlocks template={TEMPLATE} templateLock="all" />
        </div>
    </section>
);
```

```json
// blocks/about-industry-tile/block.json
{
    "name": "integroflow/about-industry-tile",
    "ancestor": ["integroflow/about-industries"],   // (3) — NOT parent
    "attributes": { /* ... */ }
}
```

### Step 6: On-the-fly validation

Before writing each file, check:

- [ ] `useBlockProps()` in edit.js, `useBlockProps.save()` in save.js
- [ ] **The JSX root tag spreads the result: `<root {...blockProps}>`**, NOT `<root className="block-x">`. Author className/style are passed AS AN ARGUMENT to `useBlockProps(...)`. A bare root without the spread destroys supports.spacing|border|color|typography (see [validation-core-rules.md#supports-invariant](../guides/validation-core-rules.md#supports-invariant)).
- [ ] **`style` is NOT declared in `block.json.attributes`** — it is auto-managed when supports are enabled.
- [ ] **render.php (if created): `<?php echo $wrapper_attributes; ?>` is on the ROOT tag**, without a wrapping `<div>` around `<section>`.
- [ ] `import { __ } from '@wordpress/i18n'` if there are user-facing strings
- [ ] No inline `style={{...}}` with constant values (only CSS variables)
- [ ] BEM classes on all elements
- [ ] `__container` is present as a DOM wrapper (but WITHOUT styles in style.scss — see below)
- [ ] **The root `<InnerBlocks>` has NO `templateLock`/`allowedBlocks`** — except when `userChoices` explicitly require locking the structure. `const ALLOWED_BLOCKS` is declared only in that same case.
- [ ] **`style.scss` has NO `&__container { ... }` selector** (container styles — global for the project; in `editor.scss`, `__container` stays for the InnerBlocks layout fix).
- [ ] **Elements with a universal class (`if-*`, `integroflow-*`, etc.) DO NOT duplicate styles** — their BEM selector in `style.scss` is empty; the BEM class in the markup is kept (see [scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate)).
- [ ] **Media queries in `style.scss` are isolated inside the selector** (no single combined `@media` at the end of the block that covers both the block and its elements).
- [ ] **No `media_value_leak`** — a property that changes per screen is not in base with an override in `@media`; each value is in its own `@media` (see [scss-breakpoint-isolation](../guides/validation-core-rules.md#scss-breakpoint-isolation)).
- [ ] **Icons (when `iconSystem` is active)** — through `<SpriteIcon>` from the manifest, WITHOUT inline `<svg>` and WITHOUT `enum`; the id is in the manifest; size/color from CSS+`currentColor` (see [icon-system.md](../guides/icon-system.md)). Animated illustrations — an exception (bespoke inline).
- [ ] **Color controls (§8.2):** a regular color → `ColorPalette`; a background fill → `TabPanel`+`ColorPalette`+`GradientPicker` (color+gradient, variable = `gradient \|\| color`). NO `PanelColorSettings`/`PanelColorGradientSettings`/home-made wrappers/hardcoded array.
- [ ] `ABSPATH` check in render.php (if created)
- [ ] **3-part unlock for a nested grid (optional):** triggers ONLY if in edit.js the root `<InnerBlocks>` has `templateLock="all"` + a nested `core/group` with 2+ seeded child blocks. In that case, all three items together: (a) `templateLock: false` in the group's attributes, (b) `allowedBlocks: ['{namespace}/{childName}']` in the same place, (c) the child block.json uses `ancestor: [...]` instead of `parent: [...]`. If the fixed-count exception applies — document the reason in Open issues. Without a root lock the pattern is NOT needed.

### Step 7: Return

Return a **compact summary** (for the main context, ≤300 tokens):

```
✓ Block created: blocks/hero/

Files (7):
  block.json (1.6 KB) — 3 attributes, providesContext: 1
  index.js (290 B)
  edit.js (5.2 KB) — InnerBlocks with 4-element template, 2 InspectorControls panels
  save.js (1.1 KB)
  style.scss (3.8 KB) — 12 BEM classes, 2 keyframes
  editor.scss (520 B)
  view.js (840 B) — slider interactivity

Child blocks: none
Helpers used: integroflow/custom-heading, integroflow/default-button
Component: Hero (variant "centered", mechanism attribute) — new block
Open issues: none
```

> For a shared component, add a `Component:` line — name, variant, mechanism, and `new block` / `retrofit: added variant "…"`. For a page-specific section, omit the line.

If there were compromises (simplified interactivity, a skipped decorative element) — mention them in `Open issues`.

---

## 🔧 Tools

- `Read` (offset+limit are required for Homepage.html) — the main tool
- `Write` — for each block file
- `Grep` — to find helper components (a narrow query)

**DO NOT use:**
- Reading the full `Homepage.html` (this breaks the budget)
- Launching sub-agents (you yourself are a sub-agent)

---

## ⚠️ Rules and anti-patterns

1. **DO NOT read Homepage.html without offset/limit.** The file is large, and you are only here for one section.
2. **One block = one variant — for page-specific sections** (without `data-component`): DO NOT cram in a switcher for all 3 hero variants, bake in the one chosen in `userChoices`. **Exception — a shared component** (`component` is set, >1 variant in COMPONENTS.md): the block must be variant-capable (Step 3.5), otherwise a second page with a different variant of the same component would have to spawn a duplicate. But even here, generate **only the observed** variants (retrofit), not all of them blindly at once.
3. **DO NOT carry React logic over into Gutenberg.** Hooks → attributes / view.js / remove.
4. **DO NOT create render.php "just in case".** Only when there is server-side logic.
5. **DO NOT duplicate styles** in style.scss and editor.scss. editor.scss — only layout fixes for the editor.
6. **DO NOT create README.md** for the block (forbidden by the Claude Code rules).
7. **DO NOT leave comments in the code** that explain the obvious (the class name speaks for itself).
8. **All user-facing strings** — in English, through `__()`. No Russian in the block code.
9. **Helper components** (PrimaryBtn, etc.) — DO NOT copy their JSX into edit.js. Replace them with a core or namespace block.
10. **DO NOT invent your own architecture.** Follow the patterns from `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` (you read it in Step 1.1) — the same ones the plugin's other commands use (`/create-block`, `/convert-html`).

---

## 📊 Token budget

| Stage | Budget |
|---|---|
| Reading sources (HTML range + brief + tokens + rules) | ~3-4 K |
| JSX analysis (internal) | ~1 K |
| Generating 7 files (Write) | ~3-5 K |
| Returning the summary | ~0.3 K |
| **Total per section** | **~8-10 K** |

If you exceed 12K — something went wrong (most likely you are reading the whole HTML). Stop and reconsider.

---

## 📝 Example

**Input:**

```json
{
  "sectionName": "hero",
  "htmlPath": "_temp/integroflow/project/Homepage.html",
  "lineRange": [264, 472],
  "brandBriefPath": "_temp/integroflow/brand-brief.json",
  "userChoices": { "variant": "centered", "interactivity": "none" },
  "sharedBlocks": { "default-button": "blocks/default-button" }
}
```

**Actions:**

1. Read Homepage.html lines 264-472 → JSX of the `Hero` component
2. Read brand-brief.json → `variantDecisions.hero = "centered"`, accent `#0D5EAF`
3. Analysis: hero has 3 variants (Centered/Split/Typographic), but the user chose `centered` → we generate only `HeroCentered`
4. Extract the `HeroCentered` inline styles → BEM `block-hero` + `block-hero__title`, `block-hero__description`, `block-hero__buttons`
5. The `<PrimaryBtn>` and `<GhostBtn>` buttons → `<InnerBlocks>` with the template `[['integroflow/default-button', { buttonVariant: 'primary' }], ['integroflow/default-button', { buttonVariant: 'tertiary' }]]` (variant names — from the generated set)
6. The `AmbientNodes` animation (SVG) — a static decoration, copy it into save.js as-is (the animation is in SCSS)
7. Hero text (h1, description) → InnerBlocks template with `integroflow/custom-heading` + `core/paragraph`
8. Create the files: block.json (theme attribute, accentColor attribute), edit.js, save.js, style.scss, editor.scss, index.js
9. **No view.js** — interactivity = none, intentional degradation
10. Verify checklist → return summary
