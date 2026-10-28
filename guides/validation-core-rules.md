# Validation Core Rules - Core validation rules

A compact reference of critical rules for validating Gutenberg blocks.

---

## block.json

### Required fields

- `apiVersion`: 3
- `name`: "namespace/blockname"
- `title`: not empty
- `category`: defined
- `attributes`: an object with fields

### Attributes

Every attribute MUST have `type` and `default`:

```json
{
	"title": {
		"type": "string",
		"default": "Heading"
	},
	"isActive": {
		"type": "boolean",
		"default": false
	}
}
```

### Render field

- Dynamic block: `"render": "file:./render.php"`
- Static block: the field is absent

---

<a id="supports-invariant"></a>
## supports-invariant (CRITICAL)

If `block.json` declares any of `supports.spacing | supports.border | supports.color | supports.typography | supports.shadow | supports.dimensions`, the root tag MUST receive the wrapper:

| File | Wrapper | What happens without it |
|---|---|---|
| edit.js | `<root {...blockProps}>` | The Styles controls in the inspector do nothing to the DOM |
| save.js | `<root {...blockProps}>` (where `blockProps = useBlockProps.save(...)`) | The saved HTML has no supports styles; the block "breaks" on re-render |
| render.php | `<root <?php echo get_block_wrapper_attributes(...); ?>>` | The same on the front end of a dynamic block |

**Forbidden patterns** (silently lose supports styles):

```jsx
// ❌ className/style written on the JSX element → overwrites the auto-generated values
<section className="block-foo" style={{ color: 'red' }} {...blockProps}>

// ❌ blockProps is created but not spread onto the root
const blockProps = useBlockProps({ className: 'block-foo' });
return <section className="block-foo">...</section>;
```

```php
// ❌ wrapper_attributes on an extra <div>, the real <section> is bare
<div <?php echo $wrapper_attributes; ?>>
  <section class="block-foo">...</section>
</div>
```

**Correct — author className/style are passed as an ARGUMENT to the hook/function:**

```jsx
const blockProps = useBlockProps({
  className: 'block-foo',
  style: { '--foo-accent': accentColor },
});
return <section {...blockProps}>...</section>;
```

```php
$wrapper = get_block_wrapper_attributes( array( 'class' => 'block-foo' ) );
echo "<section {$wrapper}>...</section>";
```

**The `style` attribute does NOT need to be declared in `block.json`** — WordPress registers it automatically when any of the supports above is present. Declaring `"style": { "type": "object", "default": {} }` manually is redundant and invites the anti-pattern of manually destructuring `style` from `attributes` and then writing it onto JSX.

---

<a id="supports-section-baseline"></a>
## supports-section-baseline (🟡 auto-fixable)

**Section blocks MUST declare a fixed minimum of `supports`.** This is the design system baseline; historically it got lost when copying a "bare" template (`{html:false}`) — a typical symptom: the section has no `spacing`, and the editor offers no native spacing controls.

**What a "section block" is:** a block WITHOUT `parent` and WITHOUT `ancestor` in `block.json` (i.e. a top-level section, not a child). Having `parent`/`ancestor` ⇒ it is a child block, the rule does NOT apply.

**Required minimum for a section:**

```json
"supports": {
	"html": false,
	"anchor": true,
	"align": ["wide", "full"],
	"spacing": { "margin": true, "padding": true }
}
```

**Violation trigger `missing_section_supports` (🟡):** the block is a section block, but at least one of these is missing (or falsy):

- `supports.anchor === true`
- `supports.align` contains `"wide"` and `"full"`
- `supports.spacing.margin === true`
- `supports.spacing.padding === true`

**Auto-fixable** — the fixer adds the missing keys and does not touch existing values or order (see [auto-fix-examples.md → missing_section_supports](auto-fix-examples.md#missing_section_supports)).

**Important:** adding `spacing` activates the [supports-invariant](#supports-invariant) — the fixer MUST **at the same time** make sure the root tag in edit.js/save.js spreads `{...blockProps}` (render.php — `$wrapper_attributes`). If it is not spread, the invariant is fixed first, then `spacing` is added (otherwise the supports styles are silently lost).

**Exceptions (DO NOT trigger):**

- child blocks (`parent`/`ancestor` is present) — they have their own baseline `{html:false, reusable:false}`, `spacing` is optional;
- `color` / `typography` — optional, their absence is NOT a violation.

---

<a id="innerblocks-defaults"></a>
## innerblocks-defaults (CRITICAL)

**The root `<InnerBlocks>` is rendered without `templateLock` and `allowedBlocks` by default.** These props are added ONLY if the user explicitly asked to lock the structure (through `userChoices` / brand brief / a direct instruction).

```jsx
// ✅ Correct — minimal API
<InnerBlocks template={TEMPLATE} />

// ❌ Wrong — restrictions imposed without the user asking
<InnerBlocks template={TEMPLATE} allowedBlocks={ALLOWED_BLOCKS} templateLock="all" />
<InnerBlocks template={TEMPLATE} allowedBlocks={ALLOWED_BLOCKS} templateLock={false} />
```

**Consequences:**

- Do not generate `const ALLOWED_BLOCKS = [...]` — it is not used.
- If the parent's structure is not locked, the **3-part unlock** pattern for a nested `core/group` (`templateLock: false` + `allowedBlocks` on the group + `ancestor` on the child) does **NOT apply** — there is nothing to lock and nothing to inherit. Apply the unlock only when the root explicitly has `templateLock="all"`. Details: [innerblocks-composition.md → 3-part unlock](innerblocks-composition.md).
- On nested `core/group` blocks, `templateLock: false` is not needed by default either — it is a correct hint for the inserter only when paired with an explicit root lock.

**When it is appropriate to set them:**

- `templateLock="all"` on the root — the user wants to fix the structure rigidly (label / title / grid / footer). Then the 3-part unlock is required.
- `allowedBlocks` on a nested `core/group` — only as part of the 3-part unlock.

---

<a id="scss-media-structure"></a>
## scss-media-structure (CRITICAL)

**Media queries are written INSIDE each selector (the block and each element separately).** A single combined `@media` at the end of the block that wraps rules for both the block and its elements is forbidden.

```scss
// ❌ Wrong — media queries grouped at the end of the block
.block-foo {
  padding: 80px 0;
  &__title { font-size: 2rem; }

  @media (max-width: $md3) {
    padding: 24px 0;
    &__title { font-size: 1.5rem; }
  }
}

// ✅ Correct — each selector has its own @media inside
.block-foo {
  @media (min-width: $md3) { padding: 80px 0; }
  @media (max-width: $md3) { padding: 24px 0; }

  &__title {
    @media (min-width: $md3) { font-size: 2rem; }
    @media (max-width: $md3) { font-size: 1.5rem; }
  }
}
```

**Order inside a selector:** base (responsive-invariant) properties → `@media (min-width: …)` → `@media (max-width: …)`. A property that is the same at all breakpoints stays in base (outside media); a responsive property goes into media. More details with an example — [scss-breakpoint-isolation](#scss-breakpoint-isolation).

**Applies to `style.scss`.** In `editor.scss` a different order is allowed, because it serves other purposes (InnerBlocks layout fixes).

---

<a id="scss-breakpoint-isolation"></a>
## scss-breakpoint-isolation (CRITICAL)

**A property whose value CHANGES across breakpoints cannot sit in base and be overridden in `@media`.** Each breakpoint-dependent value lives ENTIRELY inside its own `@media`. Base holds ONLY properties that are the same on all screens. Even the mobile value of a responsive property goes into `@media (max-width: $mdX)`, and NOT into base.

```scss
// ❌ Wrong — a base value that is overridden in @media (value-leak)
&__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;   // ← in base, but overridden below
  gap: 3rem;                         // ← same here
  align-items: start;

  @media (max-width: $md3) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

// ✅ Correct — only universal values in base; each responsive value in its own @media
&__grid {
  display: grid;        // same on all screens → base
  align-items: start;   // same → base

  @media (min-width: $md3) {
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
  @media (max-width: $md3) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
```

**Boundary convention.** Breakpoints `$md1–$md5` are defined in the theme (`src/scss/_breakpoints.scss`, auto-injected into every block) as em with a fractional offset (`47.9988em`, etc.). Pair `@media (min-width: $mdX)` (≥) with `@media (max-width: $mdX)` (≤) — the fractional offset removes practical overlap at the boundary. The block just references `$mdX` and does NOT define its own numeric breakpoint values.

**Violation — error code `media_value_leak`:** the same property is declared both in the selector's base and in an `@media` inside it → the base value is overridden → it is not universal. Fix: move the base value into the matching `@media (max-width: …)` branch (see [auto-fix-examples.md → media_value_leak](auto-fix-examples.md)).

**Applies to `style.scss`.**

---

<a id="scss-no-container-styles"></a>
## scss-no-container-styles (CRITICAL)

**In `style.scss`, DO NOT generate a `&__container { ... }` selector (or `.block-X__container { ... }`).** Container styles are defined globally in the project — duplicating them breaks centralized control over maximum width, paddings, max-width breakpoints, etc.

```scss
// ❌ Wrong — duplicated container styles
.block-foo {
  &__container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
}

// ✅ Correct — `__container` is absent from style.scss
.block-foo {
  &__title { /* … */ }
  &__body { /* … */ }
}
```

**What stays required:**

- `<div className="block-X__container">` as a **DOM element** in all files (edit.js, save.js, render.php) — this is a structural requirement, see the Container rule below.
- In `editor.scss` the `&__container` block is kept — there it is a **layout fix** for displaying InnerBlocks inside the editor (`& > .block-editor-inner-blocks { … }`), not the block's visual styles.

---

<a id="scss-universal-class-no-duplicate"></a>
## scss-universal-class-no-duplicate (CRITICAL)

**If an element carries a universal (global) class, its BEM selector in `style.scss` contains NO visual declarations.** The visual styles of such an element are already set globally in the theme through the universal class; they must not be duplicated in the block (divergence, specificity conflicts, double maintenance). This generalizes [scss-no-container-styles](#scss-no-container-styles): the "container" is a special case of a globally managed element.

**What a universal class is (heuristic).** A class on an element counts as **universal** if it is NOT:

- **the block's own BEM class:** `block-{name}`, `block-{name}__{el}`, `block-{name}--{mod}`;
- **a WP-managed class:** `wp-block-*`, `wp-element-*`, `has-*`, `is-*`, `aligncenter` / `alignwide` / `alignfull` / `alignleft` / `alignright`.

Everything else is a universal class (e.g. `if-eyebrow`, `integroflow-heading`, `integroflow-heading--m`, `integroflow-label`). A modifier of a universal class (`--m`) is universal too. Detection is **at the element level**: if an element has at least ONE universal class, its BEM selector is not styled.

```html
<!-- The element carries both a BEM class (block-why-us__eyebrow) and a universal class (if-eyebrow) -->
<p class="block-why-us__eyebrow if-eyebrow wp-block-paragraph">Why us</p>
```

```scss
// ❌ Wrong — duplicates styles that .if-eyebrow already provides
&__eyebrow {
  margin: 0 0 var(--space-4xl);
  font-size: var(--text-eyebrow);
  font-weight: 600;
  line-height: var(--leading-snug);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
}

// ✅ Correct — BEM selector without visual declarations
&__eyebrow {
  // Styles owned by universal class .if-eyebrow — do not duplicate.
}
```

**Required to stay:**

- **The BEM class is ALWAYS in the markup** (className in edit.js/save.js/render.php), next to the universal class: `class="block-why-us__eyebrow if-eyebrow …"`. The BEM class is a structural hook; the universal class does NOT replace it. The rule empties **only** the visual declarations in `style.scss`, but does NOT remove the class from the DOM.
- **An empty BEM selector with a comment** (as above) is the canonical output. Omitting the selector entirely is also acceptable, but an empty one with an explanation documents itself: it shows why there are no styles.

**Rule boundaries:**

- The root block (`block-{name}` + `wp-block-{ns}-{name}`) and elements WITHOUT a universal class are styled as usual.
- If an element with a universal class has **block-specific positioning** that the universal class does NOT set (e.g. grid-area), by default we do NOT write it either (see [css-custom-properties.md](css-custom-properties.md)); positioning is usually on the container (gap/grid). A real exception — only on the user's explicit request.

**Violation — error code `duplicated_universal_styles`:** a BEM selector in `style.scss` contains visual declarations for an element that carries a universal class in the markup. Fix: clear the selector's declarations (leave it empty with a comment), do not touch the markup (see [auto-fix-examples.md → duplicated_universal_styles](auto-fix-examples.md)).

**Applies to `style.scss`** (does not apply in `editor.scss` — it has its own InnerBlocks layout fixes).

---

<a id="icon-sprite"></a>
## icon-sprite (CRITICAL, when `iconSystem` is active)

**Applies ONLY if `src/.claude/config.json` has `iconSystem` with `type: "sprite"`** (or the manifest is found on disk). Full contract — [icon-system.md](icon-system.md).

When the theme uses an SVG sprite, icons (design-system line glyphs) are rendered through the shared `SpriteIcon` from the manifest, NOT as inline SVG / enum. Violations:

- **`icon_attribute_enum`** — `block.json` declares an `enum` on the `icon` attribute. The icon set is dynamic (from the manifest) → there must be no `enum`. Fix: remove the `enum`, keep `{ "type": "string", "default": "<id from the manifest>" }`. **Auto-fixable.**
- **`hardcoded_icon_select`** — in `edit.js` the icon picker is built from a hardcoded list (`SelectControl` with literal `options`/an array of ids) instead of a grid from `icons.manifest.json`. Fix: rebuild the picker on `iconManifest.map(...)` (`BaseControl` + buttons + `SpriteIcon`). Partial auto-fix.
- **`inline_icon_svg`** — `edit.js`/`save.js`/`render.php` has an inline `<svg>` with paths/geometry for a design glyph instead of `<SpriteIcon name={…}/>`. **Report-only** (mapping to a manifest id is semantic). Exception: an animated/multi-part illustration (inner elements styled with CSS) is LEGAL as a bespoke inline SVG, NOT a violation.
- **`icon_not_in_manifest`** — the `default` of the `icon` attribute (or a seed value in the parent template) is an id that is not in `icons.manifest.json`. **Report** (a human adds the glyph to `iconSystem.sourceDir` + `iconSystem.rebuildCmd`).

**Gate:** without `iconSystem` in the config, these codes do NOT run.

---

<a id="color-palette-source"></a>
## color-palette-source (CRITICAL)

Color/gradient controls in a block — strictly per [§8.2 of the base standard](../GUTENBERG_BLOCK_STRUCTURE_PROMPT.md#82-color-and-gradient--through-theme-settings-usesettings). Two legal patterns:

- **regular color** → `<ColorPalette colors={colorPalette}>` (`colorPalette` from `useSettings('color.palette')`);
- **background fill** → `TabPanel` (Color/Gradient tabs) + `<ColorPalette>` + `<GradientPicker>` (`ColorPalette`+`useSettings` from `@wordpress/block-editor`; `PanelBody`+`TabPanel`+`GradientPicker` from `@wordpress/components`; palette+gradients from `useSettings('color.palette')`+`useSettings('color.gradients')`; CSS variable = `backgroundGradient || backgroundColor`; each `onChange` clears the other value).

**⚠️ `PanelColorGradientSettings` is NOT sanctioned** (the composite does not work in practice: the palette/gradients were not picked up). Build the fill with the primitives above.

Violations:

- **`panel_color_settings`** — uses `PanelColorSettings`, `PanelColorGradientSettings`, `__experimentalPanelColorGradientSettings`, `ColorGradientSettingsDropdown`, a homemade color control wrapper, a hardcoded array `colors={[{name,color}]}`, or the deprecated `useSetting` (singular). **Auto-fixable** (→ `ColorPalette` for a regular color; → `TabPanel`+`ColorPalette`+`GradientPicker` for a fill). Fix: see [auto-fix-examples.md → panel_color_settings](auto-fix-examples.md).
  - ⚠️ `ColorPalette` and `GradientPicker` **on their own** are legal primitives, NOT a violation. The error targets specifically the panel composites (`PanelColorSettings`/`PanelColorGradientSettings`/experimental) and homemade controls.
- **`background_fill_color_only`** — the block has an editable background fill (the background CSS variable is fed only by `backgroundColor`, without `backgroundGradient`/a gradient control), although it should support a gradient. **Report-only** (requires knowledge of the design/intent — we do not force auto-adding a gradient).

**Applies to `edit.js`** (and `save.js` — to check `backgroundGradient || backgroundColor`).

---

## edit.js

### Imports

```jsx
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';
```

### useBlockProps

```jsx
const blockProps = useBlockProps({
	className: '{block-name}',
});
```

### Container rule

**STRUCTURE:** `__container` is used **EVERYWHERE** (edit.js, save.js, render.php)

```jsx
// ✓ Correct - single structure
<section {...blockProps}>
  <div className='block-hero__container'>
    <div className='block-hero__body'>
      ...
    </div>
  </div>
</section>
```

### Internationalization

All visible strings go through `__()`:

```jsx
placeholder={__('Enter heading...', 'textdomain')}
label={__('Background Color', 'textdomain')}
```

### NO Russian

**CRITICAL:** NO Russian characters in the UI:

```jsx
// ✗ WRONG
placeholder={__('Заголовок', 'textdomain')}
default: "Текст кнопки"

// ✓ Correct
placeholder={__('Heading', 'textdomain')}
default: "Button Text"
```

### RichText

```jsx
<RichText tagName='h1' value={title} onChange={(value) => setAttributes({ title: value })} placeholder={__('Enter heading...', 'textdomain')} allowedFormats={['core/bold', 'core/italic']} />
```

---

## save.js (Static)

### useBlockProps.save()

```jsx
const blockProps = useBlockProps.save({
	className: '{block-name}',
});
```

### Container rule

**STRUCTURE:** Identical to edit.js — `__container` is required

```jsx
// ✓ Correct
<section {...blockProps}>
	<div className='block-hero__container'>
		<div className='block-hero__body'>...</div>
	</div>
</section>
```

### RichText.Content

```jsx
<RichText.Content tagName='h1' value={title} />
```

### NO hooks

NO useState, useEffect, or dynamic data in save.js

---

## render.php (Dynamic)

### ABSPATH

**CRITICAL:** The first line of the file:

```php
<?php
if ( ! defined( 'ABSPATH' ) ) {
  exit;
}
```

### Container rule

**STRUCTURE:** Identical to edit.js/save.js — `__container` is required

```php
<section <?php echo get_block_wrapper_attributes(); ?>>
  <div class="block-hero__container">
    <div class="block-hero__body">
```

### Defaults

```php
$title = $attributes['title'] ?? '';
$items = $attributes['items'] ?? array();
$count = $attributes['count'] ?? 0;
$is_active = $attributes['isActive'] ?? false;
```

### Escaping

**CRITICAL:** All output MUST be escaped:

```php
echo wp_kses_post( $title );  // RichText content
echo esc_html( $text );       // Plain text
echo esc_attr( $class );      // HTML attributes
echo esc_url( $link );        // URL
```

### Alternative syntax

```php
<?php if ( ! empty( $title ) ) : ?>
  <h2><?php echo esc_html( $title ); ?></h2>
<?php endif; ?>

<?php foreach ( $items as $item ) : ?>
  <li><?php echo esc_html( $item ); ?></li>
<?php endforeach; ?>
```

### Yoda style

```php
if ( true === $is_active )   // ✓ Correct
if ( $is_active === true )   // ✗ WRONG
```

### Full tags + spaces

```php
<?php echo $var; ?>          // ✓ Correct
<? echo $var; ?>             // ✗ Short tag

if ( ! empty( $title ) )     // ✓ Spaces
if (!empty($title))          // ✗ No spaces
```

---

## style.scss

### BEM notation

```scss
.block-hero {
	&__body {
	}
	&__title {
	}
	&__title--large {
	} // Modifier
}

// ✗ WRONG:
// .hero — no block- prefix
// .block-hero_title — wrong separator
// .block-hero__title-large — wrong modifier
// .block-hero__container — container styles are forbidden, see scss-no-container-styles
```

### Isolated media queries

```scss
.block-hero {
	&__title {
		font-weight: 700;

		@media (min-width: $md3) {
			font-size: 3rem; // 48px
		}

		@media (max-width: $md3) {
			font-size: 2rem; // 32px
		}
	}
}
```

### REM with comments

Raw rem with a comment — **only for off-scale values** (not in theme.json `spacingSizes`/`fontSizes`). A value on the scale → **alias**, not raw rem (see [scss-token-aliasing](#scss-token-aliasing)).

```scss
font-size: 1.95rem; // 31.2px — off-scale: no preset, raw is OK
padding: 2.4rem; // 38.4px — off-scale, raw is OK
// padding: 1.5rem; // 24px  ← NOT like this: 24px = preset xl → var(--space-xl)
```

### Breakpoints

```scss
@media (min-width: $md1) {
} // 480px
@media (min-width: $md2) {
} // 768px
@media (min-width: $md3) {
} // 1024px
@media (min-width: $md4) {
} // 1280px
@media (min-width: $md5) {
} // 1440px
```

<a id="scss-token-aliasing"></a>
### scss-token-aliasing (spacing / font-size)

`padding / margin / gap` and `font-size` values **that match a theme.json preset** (`spacingSizes` / `fontSizes`) MUST be the alias `var(--space-{slug})` / `var(--text-{slug})`, not raw rem/px. The map is built from the project's theme.json using the [resolve procedure](css-custom-properties.md#spacing-and-font-size--alias-required-not-raw-rem) — no hardcoded numbers.

**Violation code `raw_token_value` (🟡):** raw rem/px on spacing/font whose value = a **fixed** theme.json preset.
- **Auto-fixable** — the fixer replaces it with the alias (see [auto-fix-examples.md → raw_token_value](auto-fix-examples.md)). A targeted value replacement; it does not touch the structure.
- Example: `margin-bottom: 1.5rem; // 24px` → `margin-bottom: var(--space-xl);` (24px = preset `xl`).

**Fluid presets (`clamp`, usually `4xl/5xl/6xl`, display-*) — NOT auto-fixed**, only a 🟡 warning:
- a manual `@media` pair (`64px` desktop / `40px` mobile) equal to the `max`/`min` of the `4xl` clamp → recipe "collapse both branches into `var(--space-4xl)`" (a human makes the edit — the risk is the same as with `media_value_leak`).

**Off-scale** (the value matched no preset) — **NOT a validator error**: it is a defect of the source (the designer agent did not snap to the scale). Note it in the report, but do not block; it is fixed in the source design.

> Without theme.json (no `themeJsonPath` / file) the rule does not run — there is nothing to check against.

---

## editor.scss

```scss
.wp-block-namespace-blockname {
	min-height: 20rem; // 320px
	padding: 1rem; // 16px
}
```

---

## index.js

```jsx
import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import save from './save';
import metadata from './block.json';

registerBlockType(metadata.name, {
	edit,
	save,
});
```

---

## Issue levels

### 🔴 Critical (block usage)

- No escaping in PHP (XSS)
- No ABSPATH check (direct access)
- Missing `__container` element
- Invalid JSON
- Russian characters in the UI

### 🟡 Warnings (must be fixed)

- No i18n (`__()`)
- Sizes in px instead of rem
- Incorrect BEM classes
- No px comments

### 🔵 Recommendations (nice to have)

- Additional !empty() checks
- Accessibility attributes
- Code optimization

---

## Quick checklist

### Container Rule (STRUCTURE)

- [ ] edit.js — WITH `__container`
- [ ] save.js — WITH `__container`
- [ ] render.php — WITH `__container`
- [ ] Structure is identical in all files

### Security PHP (CRITICAL)

- [ ] ABSPATH check
- [ ] All output is escaped
- [ ] Defaults (??) for attributes

### No Russian (CRITICAL)

- [ ] All UI strings in English
- [ ] placeholder, label, default without Russian

### BEM (IMPORTANT)

- [ ] .block-name\_\_element
- [ ] .block-name\_\_element--modifier
- [ ] Correct separators (\_\_, --)

✅ Done!
