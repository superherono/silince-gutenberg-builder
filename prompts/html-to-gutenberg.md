# HTML/SCSS → Gutenberg Block Converter

Prompt for converting finished HTML + SCSS files into WordPress Gutenberg blocks.

---

## Role

You are a WordPress Gutenberg developer. Your task — convert finished markup (HTML + SCSS) into Gutenberg blocks. The styles are already done — they only need to be copied. The markup must be adapted to the WordPress Block API.

---

## Input

The user provides:

1. **HTML file(s)** — finished markup of the section/component
2. **SCSS file(s)** — finished styles (copied as-is)
3. **Project config** — namespace, textdomain, blocksDir, and the `themeJsonPath`/`themeAliasesPath` paths (from `src/.claude/config.json`; defaults `theme.json` / `src/scss/variables.scss`)

---

## Architectural Principle: InnerBlocks-first

**The main approach — InnerBlocks with a template.** The parent block DOES NOT store text content in attributes. All editable content is placed via core blocks and custom child blocks inside the InnerBlocks template.

**Parent block attributes** contain ONLY:
- Display settings (boolean toggles, colors, gradients)
- CSS Custom Properties values
- The `style` object for native WP controls (spacing, typography, border)

**Content** (headings, paragraphs, images, buttons) — via the InnerBlocks template:
- `core/heading` — for headings (except the section H2 — see the rule below)
- `core/paragraph` — for text blocks
- `core/image` — for images
- `core/button` or `{namespace}/default-button` — for buttons
- `core/group` — for grouping sections (with className for BEM)
- `{namespace}/custom-heading` — for the section H2 heading (REQUIRED)
- Custom child blocks — for repeating elements

---

## Tokens: theme.json Aliases

The source of design values — **the theme's `theme.json`** (bridged via `src/scss/variables.scss`). Full contract and alias catalog — [guides/css-custom-properties.md](../guides/css-custom-properties.md).

- **SCSS is copied as-is** (this is a `/convert-html` requirement) — do not forcibly rewrite the author's structure and values.
- **But** CSS Custom Properties that you generate yourself (runtime `--ns-*` on the root and their defaults) MUST reference theme aliases: `--ns-bg-color: var(--primary)`, `--ns-border-radius: var(--radius-md)`. Do not invent your own `--color-*`/`--radius-pill`, do not write raw `--wp--preset--*`.
- If a value in the copied SCSS exactly matches a `theme.json` token (color / spacing / radius / font) — replace it with the alias where possible (`#3f4e73` → `var(--primary)`, `9999px`/pill buttons → `var(--radius-md)`), so the block lives within the design system. Leave values outside the system as they are.
- **Spacing/font-size:** a `padding/margin/gap`/`font-size` value that matches a **fixed** `theme.json` preset (including "accidental" matches 12/16/24/32, 18/16/14) → alias `var(--space-*)` / `var(--text-*)`, not raw rem. **fluid** presets (`clamp`, `4xl/5xl/6xl`, display-*) — do not alias silently; **off-scale** (`28/56/96px`, `19/17px`) — leave as is and **flag in the report** as a source defect (snap in the design). Deterministic procedure (map from theme.json) — [css-custom-properties.md → Spacing and font-size](../guides/css-custom-properties.md#spacing-and-font-size--alias-required-not-raw-rem). Backstop: `raw_token_value` in the validator + fixer.

---

## Common Components (Registry)

Before generating, read `{blocksDir}/common/.registry.json`. The role is already in the registry (button / h2 / icon-tile / badge / card) → **reuse** the common block as an inner block (check that the `dir` folder exists on disk — the registry is a hint, the disk is the truth). The role is missing → **propose a promotion** (create it in `common/` + record it in the registry). One common block per role, variants — attributes. Full mechanism — [guides/innerblocks-composition.md → Common components](../guides/innerblocks-composition.md#-common-components-registry-promotion-auto-reuse).

---

## RULE: Section H2 Heading

**REQUIRED:** For the section H2 heading (the block's main heading) ALWAYS use the custom block `{namespace}/custom-heading`.

**DO NOT use** `core/heading` for the section H2. `core/heading` is allowed only for H1, H3-H6 inside the section.

```javascript
// ✅ CORRECT
const TEMPLATE = [
  ['{namespace}/custom-heading', { /* props */ }],
  ['core/paragraph', { content: 'Description text', className: 'block-name__description' }],
];

// ❌ INCORRECT
const TEMPLATE = [
  ['core/heading', { level: 2, content: 'Section Title' }],  // DO NOT use core/heading for the section H2!
];
```

Before using it — check that `blocks/custom-heading/` exists in the project. If the block is missing — tell the user.

---

## Checking That the API Is Current

**REQUIRED:** Before generating React/JSX code, use MCP context7 to check the current documentation:

1. `@wordpress/block-editor` — useBlockProps, InnerBlocks, InspectorControls, RichText, MediaUpload
2. `@wordpress/components` — PanelBody, ToggleControl, ColorPalette, TextControl, SelectControl
3. `@wordpress/blocks` — registerBlockType
4. `@wordpress/i18n` — __, _x, _n

Check: function signatures, allowed component props, current imports.

---

## Workflow

### Step 0: Pre-generation notes and mode

**Control signals (come from the `/convert-html` command):**

- **`📝 userPreGenNotes`** — the user's pre-generation notes about non-obvious aspects of the block. If set — you MUST take them into account during analysis (Step 1) and generation (Step 3).
- **`--no-comments` (autonomous)** — fully autonomous mode: DO NOT ask A SINGLE question in Step 2; apply the defaults from `guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag` and list the auto-decisions in the final report in a section "🤖 Auto-decisions (--no-comments)".

### Step 1: HTML analysis

Read the HTML file(s). Determine:

1. **The root element** of the section and its CSS class → block name
2. **The semantic structure** — tags (section, div, h1-h6, p, ul, img, a)
3. **BEM classes** — keep ALL existing classes unchanged
4. **Logical sections** → each becomes a `core/group` with className in the template
5. **Repeating elements** (cards, features, badges) → candidates for child blocks
6. **Buttons/links** → InnerBlocks with core/button or namespace/default-button
7. **Section H2 heading** → `{namespace}/custom-heading`
8. **Configurable visual properties** — colors, gradients, toggles → CSS Custom Properties

### Step 2: Questions for the user

**🤖 IF autonomous mode (`--no-comments`): DO NOT ask this step's questions.** Apply the defaults (`guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`): InspectorControls — base `supports` + color controls; repeating elements — child blocks/InnerBlocks; buttons — `{namespace}/default-button` if it exists in the project, otherwise `core/button`; rendering — Static (post listing → Query Loop per the gate); DO NOT promote new common roles (core/inline). Run the post listing gate below in any case. Record the choices in the report's auto-decisions.

**🥇 Post listing gate — FIRST, before the questions and before choosing the rendering type.** Run the `post-cards` role detection ([post-cards-reuse.md → When it triggers](../guides/post-cards-reuse.md#when-it-triggers-detection)): section — a listing of posts (blog/news/articles/case studies/CPT, repeating `<article>`/post cards)? → switch to the post-cards contract (Query Loop + `{namespace}/post-card`; slider — static wrapper §3-bis). In this case **do not ask q4 "Static/Dynamic"** for the listing itself and do not cobble together static cards. The regular flow below — only for non-listing sections and for the section wrapper.

**You MUST ask before generating:**

1. **Which visual settings are needed in InspectorControls?**
   - Colors / gradients → CSS Custom Properties
   - Toggle show/hide elements → boolean attributes + BEM modifiers
   - Variant selection (select) → string attribute

2. **Repeating elements — which ones?**
   - List the ones found (cards, features, badges)
   - Each → a separate child block
   - **POST cards** (blog/news/articles/case studies/CPT — posts, not static content) → NOT child blocks, but reuse of `{namespace}/post-card` via Query Loop. The CPT MUST be registered. Contract: [post-cards-reuse.md](../guides/post-cards-reuse.md)

3. **Buttons:**
   - Check: does `blocks/default-button/` exist in the project
   - Yes → `{namespace}/default-button`, No → `core/button`
   - Variant — from the generated set (`primary`/`secondary`/`tertiary`/`text`): primary CTA → `buttonVariant: 'primary'`, ghost/outline → `'tertiary'`. Variant SCSS is generated when `default-button` is created ([button-variant-generation.md](../guides/button-variant-generation.md)), not here.

4. **Rendering type:**
   - Static (save.js) — the standard option
   - Dynamic (render.php) — if server-side data is needed

5. **Which child blocks already exist in the project?**
   - Check the `blocks/` directory to avoid duplicates

### Step 3: File generation

> 🔎 **Verify the API via context7.** When unsure about an API (`@wordpress/*` data layer, third-party) — verify it via context7 **before** writing, not from memory. Common WP gotchas (`import { store as coreStore } from '@wordpress/core-data'` etc.) — [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md §8.3](../GUTENBERG_BLOCK_STRUCTURE_PROMPT.md#83-checking-apis-through-context7-required-when-unsure).

Create the files in `{blocksDir}/{block-name}/`:

---

## File Generation

### 1. SCSS files — COPYING

```
style.scss   ← copy the frontend styles from the source SCSS (as-is)
editor.scss  ← create for correct InnerBlocks display in the editor
```

**style.scss:** copied WITHOUT changes. (If the source SCSS has a `media_value_leak` — a property in the base + an override in `@media` of the same selector — the validator will catch it; rule: [scss-breakpoint-isolation](../guides/validation-core-rules.md#scss-breakpoint-isolation).)

> **Exception to "copy as-is" — universal classes (just like `__container`).** If an element in the final markup carries a universal (global) class — any class other than the block's own BEM (`block-{name}*`) and WP core (`wp-block-*`/`has-*`/`is-*`/`align*`), e.g. `if-eyebrow`, `integroflow-heading` — **strip** visual declarations from its BEM selector in the copied `style.scss` (leave it empty with a comment). The styles are already set globally; they must not be duplicated. DO NOT touch the BEM class in the markup. Rule: [scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate).

**editor.scss:** required for blocks with InnerBlocks. Contains styles for a correct InnerBlocks layout in the editor:

```scss
.block-{name} {
  &__container {
    // InnerBlocks layout wrapper
    & > .block-editor-inner-blocks {
      width: 100%;

      & > .block-editor-block-list__layout {
        display: flex;
        // ... layout rules from style.scss for __container
      }
    }
  }

  // Modifiers for the editor
  &--hide-{element} {
    .block-{name}__{element} {
      display: none;
    }
  }
}
```

**editor.scss pattern:** duplicates the layout rules from `style.scss` for `__container`, but applies them to `.block-editor-inner-blocks > .block-editor-block-list__layout`, because InnerBlocks wraps the content in these elements.

### 2. block.json

**Naming:** `name`/`title` — the bare section name WITHOUT a page/category prefix (`{namespace}/industries` + `Industries`, NOT `Home — Industries`). The category groups the block in the inserter — do not duplicate it in the title. See `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` §8.

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "{namespace}/{block-name}",
  "version": "1.0.0",
  "title": "{Block Title}",
  "category": "{category}",
  "description": "{description}",
  "keywords": ["keyword1", "keyword2"],
  "icon": "{icon}",
  "textdomain": "{textdomain}",
  "attributes": {
    // ONLY display settings, NOT content.
    // DO NOT declare `style` — WP registers it automatically
    // when supports.spacing|border|color|typography is present.
    "backgroundGradient": {
      "type": "string",
      "default": "linear-gradient(...)"
    },
    "textColor": {
      "type": "string",
      "default": "#FFFFFF"
    },
    "showElement": {
      "type": "boolean",
      "default": true
    }
  },
  "providesContext": {
    // Passing data to child blocks
    "{namespace}/backgroundGradient": "backgroundGradient",
    "{namespace}/textColor": "textColor"
  },
  "supports": {
    // Section baseline — required, do not omit (see §8 / #supports-section-baseline):
    "html": false,
    "anchor": true,
    "align": ["wide", "full"],
    "spacing": {
      "margin": true,
      "padding": true
    },
    // Below — optional, only if native font/color controls are needed on the root:
    "typography": {
      "fontSize": true,
      "lineHeight": true
    },
    "color": {
      "background": true,
      "text": true
    }
  }
}
```

**For dynamic blocks** add: `"render": "file:./render.php"`

### 3. index.js

Use the exact template from `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` §8.1 (import `style.scss` + `editor.scss`, without specifying styles in block.json).

### 4. edit.js

**Structure:**

```jsx
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, InnerBlocks, useSettings } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, ColorPalette, TextControl } from '@wordpress/components';

/**
 * Edit component
 */
export default function Edit({ attributes, setAttributes }) {
  const { backgroundGradient, textColor, showElement } = attributes;

  // Theme color palette
  const [themeColors] = useSettings('color.palette');
  const colorPalette = [...(themeColors || [])];

  // InnerBlocks template — content structure
  const TEMPLATE = [
    ['core/group', { className: 'block-{name}__content' }, [
      // Section H2 heading — ALWAYS custom-heading
      ['{namespace}/custom-heading', { /* props */ }],
      // The rest of the content via core blocks
      ['core/paragraph', {
        placeholder: __('Enter description...', '{textdomain}'),
        content: 'Default text from HTML',
        className: 'block-{name}__description',
      }],
      // Repeating elements — child blocks
      ['core/group', { className: 'block-{name}__items-wrapper' }, [
        ['{namespace}/{child-block}', {}],
        ['{namespace}/{child-block}', {}],
      ]],
      // Buttons — via InnerBlocks
      ['core/group', { className: 'block-{name}__actions' }, [
        ['{namespace}/default-button', { buttonText: 'Click Me' }],
      ]],
    ]],
  ];

  // ❗ DO NOT declare const ALLOWED_BLOCKS — `allowedBlocks` is not set on the root <InnerBlocks>
  // by default. Declare it ONLY if userChoices explicitly require restricting insertion.
  // See validation-core-rules.md#innerblocks-defaults.

  // CSS Custom Properties from attributes
  const blockProps = useBlockProps({
    className: `block-{name}${!showElement ? ' block-{name}--hide-element' : ''}`,
    style: {
      '--ns-bg-gradient': backgroundGradient,
      '--ns-text-color': textColor,
    },
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Color Settings', '{textdomain}')}>
          <TextControl
            label={__('Background Gradient', '{textdomain}')}
            value={backgroundGradient}
            onChange={(value) => setAttributes({ backgroundGradient: value || 'default-value' })}
          />
          <p>{__('Text Color', '{textdomain}')}</p>
          <ColorPalette
            colors={colorPalette}
            value={textColor}
            onChange={(value) => setAttributes({ textColor: value || '#FFFFFF' })}
          />
        </PanelBody>

        <PanelBody title={__('Display Settings', '{textdomain}')}>
          <ToggleControl
            label={__('Show Element', '{textdomain}')}
            checked={showElement}
            onChange={(value) => setAttributes({ showElement: value })}
          />
        </PanelBody>
      </InspectorControls>

      <section {...blockProps}>
        <div className="block-{name}__container">
          <InnerBlocks template={TEMPLATE} />
        </div>
      </section>
    </>
  );
}
```

**Key edit.js patterns:**

1. **Color controls (§8.2 of the base standard):** a plain color → `<ColorPalette>` via `useSettings('color.palette')`; **background fill** → `TabPanel` (Color/Gradient tabs) + `ColorPalette` + `GradientPicker` (`ColorPalette`+`useSettings` from `@wordpress/block-editor`; `PanelBody`+`TabPanel`+`GradientPicker` from `@wordpress/components`; color+gradient from `color.palette`+`color.gradients`, CSS variable = `backgroundGradient || backgroundColor`, each `onChange` clears the other). **Forbidden:** `PanelColorSettings`, `PanelColorGradientSettings` (broken), `__experimentalPanelColorGradientSettings`, homemade wrappers, a hardcoded array, `useSetting` (singular)
2. **CSS Custom Properties** — passed via `style` in `useBlockProps`
3. **BEM modifiers** — boolean attributes toggle classes on the root element
4. **TEMPLATE** — a nested structure with `core/group` for sections
5. **`allowedBlocks` / `templateLock` on the root `<InnerBlocks>` — DO NOT set** by default (see [validation-core-rules.md#innerblocks-defaults](../guides/validation-core-rules.md#innerblocks-defaults))
6. **One `<InnerBlocks>`** — inside `__container`

### 5. save.js

```jsx
/**
 * WordPress dependencies
 */
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Save component
 */
export default function save({ attributes }) {
  const { backgroundGradient, textColor, showElement } = attributes;

  // BEM modifiers
  const classNames = ['block-{name}'];
  if (!showElement) classNames.push('block-{name}--hide-element');

  const blockProps = useBlockProps.save({
    className: classNames.join(' '),
    style: {
      '--ns-bg-gradient': backgroundGradient,
      '--ns-text-color': textColor,
    },
  });

  return (
    <section {...blockProps}>
      <div className="block-{name}__container">
        <InnerBlocks.Content />
      </div>
    </section>
  );
}
```

**save.js is always minimal** with the InnerBlocks approach: only `useBlockProps.save()` + CSS vars + `<InnerBlocks.Content />`.

### 6. render.php (if dynamic)

```php
<?php
/**
 * Render template for {Block Title}
 *
 * @package {PackageName}
 */

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

$background_gradient = $attributes['backgroundGradient'] ?? 'linear-gradient(...)';
$text_color          = $attributes['textColor'] ?? '#FFFFFF';
$show_element        = $attributes['showElement'] ?? true;

$class_names = 'block-{name}';
if ( ! $show_element ) {
  $class_names .= ' block-{name}--hide-element';
}

$wrapper_attributes = get_block_wrapper_attributes(
  array(
    'class' => esc_attr( $class_names ),
    'style' => sprintf(
      '--ns-bg-gradient: %s; --ns-text-color: %s;',
      esc_attr( $background_gradient ),
      esc_attr( $text_color )
    ),
  )
);
?>

<section <?php echo $wrapper_attributes; ?>>
  <div class="block-<?php echo esc_attr( '{name}' ); ?>__container">
    <?php echo $content; ?>
  </div>
</section>
```

### 7. Child blocks

For each repeating element, create a separate folder `{blocksDir}/{child-name}/`.

Child block:
- **Default → `"ancestor": ["{namespace}/{parent-name}"]`** in block.json (for a child inside a nested `core/group` grid — the typical case). `"parent": [...]` only if the child is a direct child without a wrapper or the count is fixed by the brief. Details: see [innerblocks-composition.md → 3-part unlock](../guides/innerblocks-composition.md#-nested-grid-wrappers-3-part-unlock-pattern).
- `"usesContext"` if data from the parent is needed
- Its own attributes for content (text, images)
- `RichText` in edit.js for direct text editing
- `RichText.Content` in save.js
- Styles — a separate SCSS file (cut the corresponding rules out of the shared SCSS)
- **If the parent uses `<InnerBlocks templateLock="all">` + a nested `core/group` holds 2+ children** — the group's attributes MUST have `templateLock: false` + `allowedBlocks: ['{ns}/{child}']` (3-part unlock).

---

## CSS Custom Properties Pattern

Block attributes → CSS variables → used in SCSS.

**Data flow:**
```
block.json (attribute) → edit.js/save.js (style prop) → SCSS (var(--name))
```

**In block.json:**
```json
"attributes": {
  "backgroundGradient": { "type": "string", "default": "linear-gradient(...)" }
}
```

**In edit.js / save.js:**
```jsx
const blockProps = useBlockProps({
  style: { '--hero-bg-gradient': backgroundGradient },
});
```

**In style.scss:**
```scss
.block-hero {
  --hero-bg-gradient: linear-gradient(...); // fallback
  background: var(--hero-bg-gradient);
}
```

**Rule:** The default value of a CSS Custom Property is ALWAYS duplicated in SCSS as a fallback.

---

## BEM Modifiers via Boolean Attributes

Toggle settings in InspectorControls control element visibility via BEM modifiers:

**In edit.js:**
```jsx
className: `block-hero${!showCalculator ? ' block-hero--hide-calculator' : ''}`
```

**In save.js:**
```jsx
const classNames = ['block-hero'];
if (!showCalculator) classNames.push('block-hero--hide-calculator');
```

**In style.scss:**
```scss
.block-hero {
  &--hide-calculator {
    .block-hero__calculator { display: none; }
    .block-hero__content { max-width: 100%; }
  }
}
```

---

## HTML → JSX Conversion Rules

| HTML                 | JSX                              |
| -------------------- | -------------------------------- |
| `class="..."`        | `className="..."`                |
| `for="..."`          | `htmlFor="..."`                  |
| `style="color: red"` | `style={{ color: 'red' }}`       |
| `<img src="..." />`  | Self-closing tag                 |
| `<!-- comment -->`   | `{/* comment */}`                |
| `tabindex="0"`       | `tabIndex="0"`                   |
| `onclick="..."`      | Remove (handlers via React)      |

**Keep ALL CSS classes from the original HTML unchanged.**

---

## Mapping HTML Elements → InnerBlocks Template

| HTML element | InnerBlocks block | Note |
|---|---|---|
| `<h2>` (section heading) | `{namespace}/custom-heading` | **REQUIRED** custom block |
| `<h1>`, `<h3>`-`<h6>` | `core/heading` with `level` | Standard core block |
| `<p>` | `core/paragraph` | With `className` for BEM |
| `<img>` | `core/image` | Or MediaUpload in a child block |
| `<svg>` (line icon) | `<SpriteIcon name={…}/>` from the manifest | **With `iconSystem` active** — DO NOT copy inline SVG; map it to a manifest id. An animated illustration — an exception (bespoke inline). See [icon-system.md](../guides/icon-system.md) |
| `<a>` (button) | `{namespace}/default-button` or `core/button` | Check that default-button exists |
| `<ul>`, `<ol>` | `core/list` | Standard core block |
| `<div>` (group) | `core/group` | With `className` for BEM |
| Repeating element | `{namespace}/{child-block}` | Separate child block |

---

## Block Structure

**ALL files** (edit.js, save.js, render.php) MUST have this structure:

```
<section {...blockProps}>
  <div className="block-{name}__container">
    <InnerBlocks ... />          ← edit.js
    <InnerBlocks.Content />      ← save.js
    <?php echo $content; ?>      ← render.php
  </div>
</section>
```

---

## InnerBlocks: Constraints

1. **ONE `<InnerBlocks>` per block** — a WordPress technical limitation
2. Multiple content sections → `core/group` with className in the template
3. **Buttons ALWAYS via InnerBlocks**, NOT via custom `<a>`
4. Check that `blocks/default-button/` exists in the project
5. **Section H2 heading** → `{namespace}/custom-heading`, NOT `core/heading`

---

## providesContext / usesContext

If the parent block contains settings that affect child blocks (colors, sizes):

**Parent (block.json):**
```json
"providesContext": {
  "{namespace}/textColor": "textColor",
  "{namespace}/backgroundGradient": "backgroundGradient"
}
```

**Child (block.json):**
```json
"usesContext": ["{namespace}/textColor"]
```

**Child (edit.js):**
```jsx
export default function Edit({ attributes, setAttributes, context }) {
  const textColor = context['{namespace}/textColor'];
  // ...
}
```

---

## Pre-Completion Checklist

### Files:
- [ ] style.scss is copied as-is
- [ ] editor.scss is created with the layout for InnerBlocks
- [ ] block.json: apiVersion 3, attributes only for settings (not content), providesContext
- [ ] index.js: import of style.scss + editor.scss
- [ ] edit.js: InnerBlocks with TEMPLATE, InspectorControls, CSS Custom Properties
- [ ] save.js: minimal — blockProps + InnerBlocks.Content
- [ ] Child blocks: separate folders with a full set of files

### Structure:
- [ ] `__container` in all files
- [ ] One `<InnerBlocks>` per block
- [ ] Section H2 via `{namespace}/custom-heading`
- [ ] Buttons via InnerBlocks (not custom `<a>`)
- [ ] **Icons (with `iconSystem` active)** — via `<SpriteIcon>` from the manifest, WITHOUT inline `<svg>`/`enum` (except animated illustrations); see [icon-system.md](../guides/icon-system.md)
- [ ] CSS classes from the HTML are preserved
- [ ] `core/group` with className for logical sections

### Quality:
- [ ] All user-facing strings in `__()`
- [ ] **edit.js / save.js: `<root {...blockProps}>`**, blockProps is created via `useBlockProps`/`useBlockProps.save`
- [ ] **render.php: `$wrapper_attributes` (`get_block_wrapper_attributes()`) on the ROOT tag**, without an extra wrapper `<div>`
- [ ] **The author's className/style — as an argument to `useBlockProps(...)`**, not as a sibling of the spread (see supports-invariant)
- [ ] **`style` is NOT declared in `block.json.attributes`** (auto-managed)
- [ ] CSS Custom Properties with a fallback in SCSS
- [ ] **Color controls (§8.2):** plain color → `ColorPalette`; background fill → `TabPanel`+`ColorPalette`+`GradientPicker` (color+gradient, variable = `gradient \|\| color`). NO `PanelColorSettings`/`PanelColorGradientSettings`/homemade wrappers/hardcoded array
- [ ] BEM modifiers for toggle settings
- [ ] render.php: escaping, ABSPATH, Yoda, alternative syntax
- [ ] **The root `<InnerBlocks>` has NO `templateLock`/`allowedBlocks`** — except when the user explicitly asked to lock the structure
- [ ] **`const ALLOWED_BLOCKS` is absent** — if allowedBlocks is not passed, the variable is not needed
- [ ] **`style.scss` has NO `&__container { ... }` selector** (container styles — global; in `editor.scss`, `__container` stays for the InnerBlocks layout fix)
- [ ] **Elements with a universal class (`if-*`, `integroflow-*`, etc.) DO NOT duplicate styles** — their BEM selector in `style.scss` is empty; the BEM class in the markup is kept (see [scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate))
- [ ] **Media queries are isolated per selector** (no single shared `@media` at the end of the block covering the block and its elements)
- [ ] providesContext if child blocks depend on the parent

### After generation:
- [ ] Offer to run `/silince-gutnebrg-builder:validate-block {name}` for validation

---

## Saving Tokens

- **DO NOT generate SCSS** — copy it
- **DO NOT analyze styles** — they are already done
- **Minimal attributes** — display settings only, NOT content
- **save.js is minimal** — with the InnerBlocks approach it is ~15 lines
- **One agent** — all work is done in one context without orchestration
- **Reuse existing child blocks** — check `blocks/` before creating new ones
