# JSX → Gutenberg Block Rules

Rules for converting a React JSX component (as in claude.ai/design exports) into a Gutenberg block (edit.js + save.js + style.scss).

Used by the `react-section-converter` agent when converting a single section.

---

## ⚠️ The Base Standard — Required

This prompt **SUPPLEMENTS**, not replaces, the base Gutenberg block architecture standard:

**Before applying the rules below, read:**

1. `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` — the root standard (InnerBlocks instead of RichText, parent/child pattern, Context API, useBlockProps, edit.js/save.js/block.json templates)
2. `guides/innerblocks-composition.md` — a detailed guide to InnerBlocks and parent-child composition
3. `guides/css-custom-properties.md` — the CSS Custom Properties approach
4. `prompts/bem-methodology.md` — BEM naming

**In case of a conflict** between the rules in this file and `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` — follow the base standard. This file covers only the specifics of converting a React component (inline styles, hooks, conditional styles), not the overall block architecture.

---

## 1. Inline styles → BEM SCSS

**Rule:** Any `style={{ ... }}` with a constant value → a BEM class in SCSS. **DO NOT leave inline styles in the final JSX**, except CSS Custom Properties (see §3).

**Class name:**

- Section root: `block-{section-name}`
- Child element: `block-{section-name}__{element-name}`
- Modifier: `block-{section-name}__{element-name}--{modifier}`

**Example:**

```jsx
// JSX integroflow:
<section style={{ background: '#282724', padding: '112px 0' }}>
  <h2 style={{ fontSize: 48, fontWeight: 500, letterSpacing: '-0.035em' }}>Title</h2>
</section>

// → edit.js / save.js — root via useBlockProps (see supports-invariant):
const blockProps = useBlockProps({ className: 'block-cta' });
return (
  <section {...blockProps}>
    <h2 className="block-cta__title">Title</h2>
  </section>
);

// → style.scss:
.block-cta {
  background: #282724;
  padding: 112px 0;

  &__title {
    font-size: 3rem; // 48px
    font-weight: 500;
    letter-spacing: -0.035em;
  }
}
```

⚠️ **The root tag ALWAYS via `{...blockProps}`** (see [validation-core-rules.md#supports-invariant](../guides/validation-core-rules.md#supports-invariant)). A bare `<section className="block-x">` without the spread destroys supports styles (spacing/border/color/typography from the inspector → the attributes are saved but never land on the DOM).

**Numeric values** in JSX (`fontSize: 48`) → pixels in SCSS → convert to `rem` (`48 / 16 = 3rem`) with a `// 48px` comment.

---

## 2. Conditional styles (`dark ? '#fff' : '#000'`) — three cases

**Case A: a binary visual mode (dark/light, hide/show)** → boolean attribute + BEM modifier.

```jsx
// Before:
<div style={{ background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000' }}>

// After, in block.json:
"attributes": { "isDark": { "type": "boolean", "default": false } }

// After, in edit.js / save.js — className is passed AS AN ARGUMENT to useBlockProps:
const blockProps = useBlockProps({
  className: `block-hero${isDark ? ' block-hero--dark' : ''}`,
});
return <div {...blockProps}>...</div>;

// After, in style.scss:
.block-hero {
  background: #fff; color: #000;
  &--dark { background: #000; color: #fff; }
}
```

**Case B: a value from a palette (accent color from an array)** → string attribute + CSS Custom Property.

```jsx
// Before:
<button style={{ background: accentHex }}>

// block.json:
"attributes": { "accentColor": { "type": "string", "default": "#0D5EAF" } }

// edit.js / save.js:
const blockProps = useBlockProps({ style: { '--block-cta-accent': accentColor } });
<button className="block-cta__btn">

// style.scss:
.block-cta { --block-cta-accent: #0D5EAF; &__btn { background: var(--block-cta-accent); } }
```

**Case C: enum (variant 0/1/2)** → string attribute + BEM modifier + SelectControl.

```jsx
// Before:
{variant === 0 && <HeroCentered />}{variant === 1 && <HeroSplit />}

// block.json:
"attributes": { "variant": { "type": "string", "default": "centered", "enum": ["centered", "split", "typographic"] } }

// edit.js: SelectControl + className `block-hero--variant-${variant}`
```

---

## 3. CSS Custom Properties: when

Use a CSS variable **only** if:
1. The value is editable (an attribute from InspectorControls)
2. The value is used in several places in the CSS
3. The value comes from the parent via `providesContext`

Otherwise — hardcode it in SCSS. **Do not create variables** for every color.

**The CSS variable default is always duplicated in SCSS as a fallback:**

```scss
.block-hero { --block-hero-bg: #FFF; background: var(--block-hero-bg); }
```

---

## 4. Repeating elements (`array.map`) — InnerBlocks or a child block

**Signal:** `{cases.map(c => <CaseCard c={c} />)}`, `{items.map(...)}`.

**Solution:**

| Array elements | Solution |
|---|---|
| Uniform text (icons, links, FAQ) | InnerBlocks template with `core/paragraph` / `core/list-item` |
| A complex element with several fields (case study, testimonial, feature card) | Child block `{namespace}/{name}-item` + InnerBlocks template |
| Decoration only (3-5 identical line SVGs) | With `iconSystem` active — via the `<SpriteIcon>` sprite (NOT hardcoded inline SVG), even if not editable; see [icon-system.md](../guides/icon-system.md). Without `iconSystem` — hardcode in JSX. An animated illustration — always bespoke inline |

**Child block pattern** (see also `prompts/html-to-gutenberg.md` §"Child blocks" and [innerblocks-composition.md → 3-part unlock](../guides/innerblocks-composition.md#-nested-grid-wrappers-3-part-unlock-pattern)):

- Parent: `"providesContext": { "{ns}/variant": "variant" }` if the styles depend on the parent
- Child: **default `"ancestor": ["{ns}/{parent}"]`** (for a child inside a nested `core/group` grid — the typical case); `"parent": ["{ns}/{parent}"]` only for a direct child without a wrapper or for fixed-count cases. Plus `"usesContext": [...]`, its own attributes for content.
- In the parent's edit.js: `<InnerBlocks template={[['{ns}/{child}', {}], ['{ns}/{child}', {}]]} />` — **without** `allowedBlocks` and `templateLock` on the root by default (see [validation-core-rules.md#innerblocks-defaults](../guides/validation-core-rules.md#innerblocks-defaults))
- **3-part unlock** for a nested `core/group` (`templateLock: false` + `allowedBlocks` on the group + `ancestor` on the child) applies ONLY if the root explicitly has `templateLock="all"`. Without a root lock the pattern is NOT needed.

---

## 5. Hooks and interactivity

**`useState`/`useRef`/`useEffect` — handling:**

| What the hook does | Solution |
|---|---|
| Stores editable data | Remove the hook, move the data to block attributes |
| Controls open/closed state (accordion, modal) | `view.js` (vanilla JS) on the front end — runtime interactivity |
| Controls a visual variant (slider current page, active tab) | `view.js` OR Interactivity API (`@wordpress/interactivity`) |
| Provider hook (`useTweaks`, `useMemo` with static data) | Remove — it is part of the prototype, not the block |

> ⚠️ **First check the project's `frontendJs` convention** ([GUTENBERG_BLOCK_STRUCTURE_PROMPT.md §8.1-bis](../GUTENBERG_BLOCK_STRUCTURE_PROMPT.md#81-bis-frontend-js-the-frontendjs-convention-shared-bundle-vs-per-block-view)). The `shared-bundle` strategy (typical for themes with a single `custom-frontend.js`) → **DO NOT create a per-block `view.js`** and **DO NOT set `viewScript`** (it will not be compiled); output the markup + hook classes, the user writes the init in the shared bundle / a rare unique module goes into `modulesDir`. The template below — only for the `per-block-view` strategy.

**`view.js` template** (only with `frontendJs.strategy === 'per-block-view'` and when runtime interactivity is present):

```javascript
( () => {
  document.querySelectorAll('.block-faq__item').forEach(item => {
    const btn = item.querySelector('.block-faq__question');
    btn?.addEventListener('click', () => item.classList.toggle('is-open'));
  });
} )();
```

The `view.js` file goes next to `index.js` — **only if the project build actually compiles it** (`frontendJs.strategy === 'per-block-view'`). **DO NOT specify `viewScript` in block.json** — see `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` sections 8.1 / 8.1-bis. With `shared-bundle` this file is not created (see the callout above).

---

## 6. JSX → Gutenberg JSX: syntax

| JSX integroflow | Gutenberg edit.js / save.js |
|---|---|
| `<div onClick={fn}>` (inside save) | Remove onClick — handlers via view.js, not JSX |
| `<a href="#">` | Kept (text block) |
| `style={{ color: 'red' }}` | See §1, §2 |
| `className="x"` | Kept |
| `{condition && <X/>}` | Kept in edit.js; in save.js — based on an attribute |
| `{array.map(...)}` | See §4 (InnerBlocks or hardcode) |
| `import {X} from '@wordpress/...'` | Add to the file header (see §7) |

---

## 7. Required Gutenberg imports

**edit.js:**

```javascript
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, InnerBlocks, useSettings } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl, ColorPalette, TextControl } from '@wordpress/components';
```

`useSettings` is needed for `useSettings('color.palette')` — see base standard §8.2.

**Color controls (§8.2):** plain color → `<ColorPalette>` (`useSettings('color.palette')`); **background fill** → `TabPanel` (Color/Gradient tabs) + `ColorPalette` + `GradientPicker` (`ColorPalette`+`useSettings` from `@wordpress/block-editor`; `PanelBody`+`TabPanel`+`GradientPicker` from `@wordpress/components`; color+gradient from `color.palette`+`color.gradients`; CSS variable = `backgroundGradient || backgroundColor`; each `onChange` clears the other). **Forbidden:** `PanelColorSettings`, `PanelColorGradientSettings` (broken), `__experimentalPanelColorGradientSettings`, homemade wrappers, a hardcoded array, `useSetting` (singular).

**save.js:**

```javascript
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
```

`RichText` is NOT imported in either edit.js or save.js — text content goes through InnerBlocks with core blocks (see base standard §1).

**index.js:** see base standard §8.1 — the required template that imports `style.scss` + `editor.scss`.

---

## 8. SCSS rules (apply during conversion)

- Maximum **3 levels of nesting**
- **Media queries are isolated inside each selector** (the block and each element separately). A single combined `@media` at the end of the block, covering rules for both the block and its elements, is forbidden. See [validation-core-rules.md#scss-media-structure](../guides/validation-core-rules.md#scss-media-structure).
- **DO NOT declare `__container` in `style.scss`** — container styles are managed globally at the project level. See [validation-core-rules.md#scss-no-container-styles](../guides/validation-core-rules.md#scss-no-container-styles).
- **Element with a universal class → BEM selector without visual declarations** — if the element has any class other than the block's own BEM and WP core (e.g. `if-eyebrow`, `integroflow-heading`), its styles are global; do not duplicate them, leave the selector empty. DO NOT remove the BEM class from the markup. See [validation-core-rules.md#scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate).
- `px` numbers from JSX → `rem` with a `// {original}px` comment (1rem = 16px)
- `letter-spacing`, `line-height` — leave as is (number or em)
- `@keyframes` from local integroflow `<style>{...}</style>` blocks → copied into style.scss as-is
- Duplicate CSS variable defaults as a fallback (`--x: #fff;` at the start of the block)

---

## 9. block.json attributes — quick reference

The "InnerBlocks instead of attributes for content" principle — section 1 of the base standard. Here — the typical solution for converting a React section:

| In attributes | Via InnerBlocks |
|---|---|
| Boolean toggles (isDark, showElement) | Texts (headings, paragraphs, descriptions) |
| String enum (variant: centered/split) | Buttons (see §10) |
| Color via ColorPalette | Images (`core/image` or `MediaUpload` in a child) |
| — (`style` is auto-managed by supports, NO need to declare it) | Lists (`core/list`) |

---

## 10. Section H2 and buttons — must use InnerBlocks

See also `prompts/html-to-gutenberg.md` (H2 and button rules). In short:

- **Section H2** (the block's main heading) → ALWAYS `{namespace}/custom-heading`. Never `core/heading`.
- **Buttons** → check whether `blocks/default-button` exists in the project: yes → `{namespace}/default-button`, no → `core/button`. Variant — from the generated set (`primary`/`secondary`/`tertiary`/`text`): `<PrimaryBtn>` → `buttonVariant: 'primary'`, ghost/outline → `'tertiary'`. Variant SCSS is generated when `default-button` is created ([guides/button-variant-generation.md](../guides/button-variant-generation.md)), not in the converter.
- **Post listing** (`.map()` over posts, `<article>`, blog/news/articles/case studies/CPT) → reuse the server-side `{namespace}/post-card` via the native Query Loop (`core/query` → `post-template` → `{ns}/post-card`), **NOT** static cards. The CPT MUST be registered. Contract: [post-cards-reuse.md](../guides/post-cards-reuse.md).
- **Do not duplicate button logic inline in JSX** — InnerBlocks template:

```javascript
const TEMPLATE = [
  ['{ns}/custom-heading', { content: 'Section Title' }],
  ['core/paragraph', { content: '...' , className: 'block-{name}__description' }],
  ['{ns}/default-button', { buttonText: 'Click', buttonUrl: '#' }],
];
```

---

## 11. Checklist before returning the block

- [ ] **edit.js/save.js root tag — `<root {...blockProps}>`**, NOT a bare `<root className="...">`
- [ ] **Author className/style is passed AS AN ARGUMENT to `useBlockProps(...)`**, not as a sibling of the spread
- [ ] **`style` is NOT declared in `block.json.attributes`** (auto-managed with supports.spacing|border|color|typography)
- [ ] **The root `<InnerBlocks>` has NO `templateLock`/`allowedBlocks`** — except on an explicit request to lock it
- [ ] **`const ALLOWED_BLOCKS` is absent** if allowedBlocks is not used
- [ ] **`style.scss` has NO `&__container` selector** (container styles — global)
- [ ] **Elements with a universal class (`if-*`, `integroflow-*`, etc.) DO NOT duplicate styles** — the BEM selector is empty, the BEM class in the markup is kept
- [ ] **Media queries are isolated inside the selector**, not grouped into a single `@media` at the end
- [ ] **Icons (with `iconSystem` active)** — via `<SpriteIcon>` from the manifest, WITHOUT inline `<svg>`/`enum`; except animated illustrations (see [icon-system.md](../guides/icon-system.md))
- [ ] **Color controls (§8.2):** plain color → `ColorPalette`; background fill → `TabPanel`+`ColorPalette`+`GradientPicker` (color+gradient). NO `PanelColorSettings`/`PanelColorGradientSettings`/homemade wrappers
- [ ] No inline `style={{}}` in JSX (except CSS variables in `useBlockProps`)
- [ ] All colors/sizes in SCSS, not in JSX
- [ ] BEM classes on all elements
- [ ] Conditional styles handled per §2 (modifier / variable / enum)
- [ ] Hooks removed or moved to view.js / attributes
- [ ] Arrays → InnerBlocks template or child blocks
- [ ] block.json contains attributes (NOT text content)
- [ ] Section H2 via `custom-heading`, buttons via `default-button` / `core/button`
- [ ] The `__container` wrapper is in place
- [ ] All user-facing strings in `__()`
- [ ] Runtime interactivity handled per `frontendJs` (§8.1-bis): `shared-bundle` → structure + hook classes, WITHOUT `view.js`/`viewScript`; `per-block-view` → `view.js` next to index.js (without `viewScript` in block.json)

---

## 13. Token-saving principle

- DO NOT rewrite the whole JSX from scratch — copy the tag structure, replace styles with classes
- DO NOT generate comments in the block code (see the plugin's main rules)
- DO NOT duplicate CSS — move shared rules into the parent class
- DO NOT create attributes "for the future" — only what is actually edited
- DO NOT comment the obvious (what the component does) — it is clear from the block name
