# Auto-Fix Examples - Examples of Automatic Fixes

Detailed examples for all 14 types of auto-fixable errors.

---

## 1. missing_i18n - Missing internationalization

**Error:**

```jsx
placeholder = 'Heading';
label = 'Settings';
title = 'Panel';
```

**Fix:**

```jsx
placeholder={__('Heading', 'textdomain')}
label={__('Settings', 'textdomain')}
title={__('Panel', 'textdomain')}
```

**Algorithm:**

1. Find all string literals in JSX attributes
2. Wrap them in `{__('...', 'textdomain')}`
3. Check that the `{ __ }` import is present

---

## 2. missing_escaping - No escaping in PHP

**Error in render.php:**

```php
echo $title;
echo $content;
echo '<div class="' . $class_name . '">';
echo '<a href="' . $url . '">';
```

**Fix:**

```php
echo esc_html( $title );
echo wp_kses_post( $content );
echo '<div class="' . esc_attr( $class_name ) . '">';
echo '<a href="' . esc_url( $url ) . '">';
```

**Rules for choosing the function:**

- Plain text → `esc_html()`
- HTML content → `wp_kses_post()`
- Attributes → `esc_attr()`
- URL → `esc_url()`

---

## 3. px_instead_of_rem - Sizes in px instead of rem

**Error in SCSS:**

```scss
font-size: 48px;
padding: 24px 32px;
margin-bottom: 16px;
```

**Fix:**

```scss
font-size: 3rem; // 48px
padding: 1.5rem 2rem; // 24px 32px
margin-bottom: 1rem; // 16px
```

**Algorithm:**

1. Find all values with `px`
2. Divide by 16
3. Add a comment with the original px value

> ⚠️ This applies to **off-scale** values. If the value matches a theme.json preset (`24px`=`xl`, `16px`=`lg`…) — the final form is not a raw rem but an **alias** (`var(--space-xl)`), see `3a. raw_token_value`.

---

## 3a. raw_token_value - Raw rem/px instead of a token alias

**Error in SCSS** (value = a fixed theme.json preset, but hardcoded):

```scss
.block-x__title {
  margin-bottom: 1.5rem; // 24px
  padding: 1rem 2rem;    // 16px 32px
  font-size: 0.8125rem;  // 13px
}
```

**Fix** (the `value→slug` map is built from the project's theme.json; for this theme.json `xl=24`, `lg=16`, `2xl=32`, eyebrow=13px):

```scss
.block-x__title {
  margin-bottom: var(--space-xl);
  padding: var(--space-lg) var(--space-2xl);
  font-size: var(--text-eyebrow);
}
```

**Algorithm:**

1. Build a map from `themeJsonPath` (`spacingSizes` + `fontSizes`), normalizing to px; **fixed** (literal) vs **fluid** (`clamp`).
2. Properties `padding/margin/gap`/`font-size`: value = a **fixed** preset (±1px) → replace with `var(--space-{slug})`/`var(--text-{slug})`, remove the `// Npx` comment.
3. **Fluid** preset / manual `@media` pair (max/min of the clamp) → **DO NOT touch**, report with the recipe "collapse into `var(--space-4xl)`". **Off-scale** → **DO NOT touch**, it is a source defect.
4. Do not alias `width/height/top/left/inset`, `line-height`, `letter-spacing` — only spacing properties and font-size.

Full contract: [scss-token-aliasing](validation-core-rules.md#scss-token-aliasing) · [agents/fixer.md → Recipe: raw_token_value](../agents/fixer.md). The numbers in the example come from the sample theme.json and are not hardcoded in the plugin.

---

## 4. wrong_use_block_props - Incorrect useBlockProps

**Error in save.js:**

```jsx
const blockProps = useBlockProps(); // WRONG
```

**Fix:**

```jsx
const blockProps = useBlockProps.save(); // CORRECT
```

---

## 4a. missing_block_props_spread - root without spread / wrapper not on the root

See the full recipe: [agents/fixer.md → Recipe: missing_block_props_spread](../agents/fixer.md). Three cases (root without `{...blockProps}`, author className/style as a sibling, double PHP wrapper) — short diffs are there too. Covers the root cause of "supports are declared, but the styles do not land on the DOM".

---

## 4b. redundant_style_attribute - `style` in attributes when supports are enabled

```json
// ❌ Before
"attributes": { "style": { "type": "object", "default": {} }, ... },
"supports": { "spacing": { "padding": true } }

// ✅ After — remove the style key; WP registers it automatically
"attributes": { ... },
"supports": { "spacing": { "padding": true } }
```

If `style` was destructured in edit.js/save.js and not used — remove it from the destructuring.

---

## 4c. unnecessary_template_lock - `templateLock`/`allowedBlocks` on the root `<InnerBlocks>` without a request

```jsx
// ❌ Before
const ALLOWED_BLOCKS = ['core/heading', 'core/paragraph', 'integroflow/default-button'];
return (
  <section {...blockProps}>
    <div className="block-hero__container">
      <InnerBlocks template={TEMPLATE} allowedBlocks={ALLOWED_BLOCKS} templateLock={false} />
    </div>
  </section>
);

// ✅ After
return (
  <section {...blockProps}>
    <div className="block-hero__container">
      <InnerBlocks template={TEMPLATE} />
    </div>
  </section>
);
```

`const ALLOWED_BLOCKS = [...]` is removed because it is no longer used anywhere. Full recipe with skip rules: [agents/fixer.md → Recipe: unnecessary_template_lock](../agents/fixer.md).

---

## 4d. forbidden_container_styles - `__container` styles in `style.scss`

```scss
// ❌ Before — container styles in style.scss
.block-hero {
  &__title { font-size: 2rem; }
  &__container {
    background-color: var(--hero-bg-color);
    padding: 80px 0;
    max-width: 1200px;
    margin: 0 auto;
  }
}

// ✅ After — keep only what belongs to the block itself,
// container rules removed (managed globally in the project)
.block-hero {
  background-color: var(--hero-bg-color);
  padding: 80px 0;

  &__title { font-size: 2rem; }
}
```

`max-width: 1200px; margin: 0 auto;` are removed — these are typical global container rules. DO NOT touch `editor.scss` — `__container` stays there for the InnerBlocks layout fix. Full recipe: [agents/fixer.md → Recipe: forbidden_container_styles](../agents/fixer.md).

---

## 4d-bis. duplicated_universal_styles - duplicated styles on an element with a universal class

The element carries a universal (global) class — its visual styles are already defined in the theme and must not be duplicated in the block.

```html
<!-- Markup: the element carries both the BEM class and the universal class .if-eyebrow -->
<p class="block-why-us__eyebrow if-eyebrow wp-block-paragraph">Why us</p>
```

```scss
// ❌ Before — duplicates styles that .if-eyebrow already provides
.block-why-us {
  &__eyebrow {
    margin: 0 0 var(--space-4xl);
    font-size: var(--text-eyebrow);
    font-weight: 600;
    text-transform: uppercase;
    color: var(--primary);
  }
  &__title { font-size: var(--text-display-md); }
}

// ✅ After — visual declarations removed; the BEM class in the markup is NOT touched
.block-why-us {
  &__eyebrow {
    // Styles owned by universal class .if-eyebrow — do not duplicate.
  }
  &__title { font-size: var(--text-display-md); }
}
```

The markup is left untouched — `block-why-us__eyebrow` stays in className next to `if-eyebrow`. Only the visual declarations of the BEM selector are removed. Full recipe: [agents/fixer.md → Recipe: duplicated_universal_styles](../agents/fixer.md).

---

## 4d-ter. icon_attribute_enum + hardcoded_icon_select (when `iconSystem` is active)

Theme with an SVG sprite: the icon is an id from the manifest, rendered via `SpriteIcon`, WITHOUT `enum` and inline SVG.

```json
// ❌ block.json — before (enum hardcoded)
"icon": { "type": "string", "default": "partner", "enum": ["partner", "system", "value"] }

// ✅ block.json — after (no enum, default from the manifest)
"icon": { "type": "string", "default": "partner" }
```

```jsx
// ❌ edit.js — before: SelectControl + inline SVG from icons.js
<SelectControl label={ __('Icon','integroflow') } value={ icon }
  options={[ {label:'Partner',value:'partner'}, {label:'System',value:'system'}, {label:'Value',value:'value'} ]}
  onChange={ (v) => setAttributes({ icon: v }) } />
// ...
<span className="block-why-point__icon"><WhyIcon icon={ icon } /></span>

// ✅ edit.js — after: grid from the manifest + SpriteIcon
import SpriteIcon from '../../common/icon/sprite-icon';
import iconManifest from '../../_generated/icons.manifest.json';
// ...
<BaseControl id="why-point-icon-picker" label={ __('Icon','integroflow') }>
  <div className="block-why-point__icon-picker" role="listbox">
    { iconManifest.map( ( name ) => (
      <button key={ name } type="button" role="option" aria-selected={ name === icon }
        aria-label={ name } title={ name }
        className={ 'block-why-point__icon-option' + ( name === icon ? ' is-selected' : '' ) }
        onClick={ () => setAttributes({ icon: name }) }>
        <SpriteIcon name={ name } />
      </button>
    ) ) }
  </div>
</BaseControl>
// ...
<span className="block-why-point__icon"><SpriteIcon name={ icon } /></span>
```

The `icons.js` file with inline SVG is deleted. Icon size/color goes in `style.scss` via `currentColor` + `.wp-icon`. `inline_icon_svg` (mapping a specific inline SVG to an id) is report-only and is done deliberately against the manifest. Full recipe: [agents/fixer.md → Recipe: icon_attribute_enum + hardcoded_icon_select](../agents/fixer.md), contract: [icon-system.md](icon-system.md).

---

## 4d-quater. panel_color_settings - panel composites instead of `ColorPalette`/`GradientPicker`

A regular color → `ColorPalette`; a background fill → `TabPanel`+`ColorPalette`+`GradientPicker`. `PanelColorSettings`, `PanelColorGradientSettings` (broken) and custom wrappers are forbidden (§8.2).

**Case A — fill (example `cta-pill`), a color/gradient choice is needed:**

```jsx
// ❌ Before — PanelColorSettings + color only
import { useBlockProps, InnerBlocks, InspectorControls, PanelColorSettings } from '@wordpress/block-editor';
const { backgroundColor } = attributes;
// ...
<PanelColorSettings title={__('Colors','integroflow')}
  colorSettings={[{ value: backgroundColor,
    onChange: (v)=>setAttributes({backgroundColor:v}), label: __('Pill background','integroflow') }]} />

// ✅ After — TabPanel (Color/Gradient) + ColorPalette + GradientPicker
import { useBlockProps, InnerBlocks, InspectorControls, ColorPalette, useSettings } from '@wordpress/block-editor';
import { PanelBody, TabPanel, GradientPicker } from '@wordpress/components';
const { backgroundColor, backgroundGradient } = attributes;
const [themeColors] = useSettings('color.palette');
const [themeGradients] = useSettings('color.gradients');
const background = backgroundGradient || backgroundColor;
const blockProps = useBlockProps({ className: 'block-cta-pill',
  style: background ? { '--integroflow-bg-color': background } : undefined });
// ...
<PanelBody title={__('Background','integroflow')}>
  <TabPanel
    tabs={[{ name:'color', title:__('Color','integroflow') }, { name:'gradient', title:__('Gradient','integroflow') }]}
    initialTabName={backgroundGradient ? 'gradient' : 'color'}>
    {(tab) => tab.name === 'gradient' ? (
      <GradientPicker value={backgroundGradient || undefined} gradients={themeGradients || []}
        onChange={(v)=>setAttributes({ backgroundGradient: v, backgroundColor: undefined })} />
    ) : (
      <ColorPalette value={backgroundColor} colors={themeColors || []}
        onChange={(v)=>setAttributes({ backgroundColor: v, backgroundGradient: undefined })} />
    )}
  </TabPanel>
</PanelBody>
```

`block.json`: `+ "backgroundGradient": { "type": "string" }`. In `save.js` — the same line `const background = backgroundGradient || backgroundColor;`. SCSS does not change. (`'integroflow'` here is an example textdomain; substitute `config.textdomain`.)

**Case B — regular color (not a fill):** `PanelColorSettings` → `<PanelBody><ColorPalette colors={colorPalette} .../></PanelBody>` (see the recipe). Full recipe: [agents/fixer.md → Recipe: panel_color_settings](../agents/fixer.md).

---

## 4e. grouped_media_query (NOT auto-fixable) - grouped `@media`

```scss
// ❌ Before — all media rules are collected into one @media at the end
.block-foo {
  padding: 80px 0;
  &__title { font-size: 2rem; }

  @media (max-width: $md3) {
    padding: 24px 0;
    &__title { font-size: 1.5rem; }
  }
}

// ✅ Should be — each selector has its own @media inside
.block-foo {
  @media (min-width: $md3) { padding: 80px 0; }
  @media (max-width: $md3) { padding: 24px 0; }

  &__title {
    @media (min-width: $md3) { font-size: 2rem; }
    @media (max-width: $md3) { font-size: 1.5rem; }
  }
}
```

Auto-fix is not possible — the rules must be distributed between the selectors manually. The validator must **report to the user** with this example and not try to fix it automatically.

---

## 4f. media_value_leak (NOT auto-fixable) - base value is overridden in `@media`

A property whose value changes across breakpoints must not sit in the base and be overridden in `@media`. Each responsive value goes entirely in its own `@media`; the base holds only universal values.

```scss
// ❌ Before — grid-template-columns and gap are set in the base and overridden in @media
&__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;

  @media (max-width: $md3) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

// ✅ Should be — the base holds only universal values; each responsive value in its own @media
&__grid {
  display: grid;
  align-items: start;

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

Recipe: for each property declared both in the base and in `@media` of the same selector — remove it from the base and move the base value into `@media (min-width: $mdX)` (for larger screens) or `@media (max-width: $mdX)` (for smaller ones), depending on which range it corresponded to. Auto-fix is risky (the choice of branch is ambiguous) — **report with this example**. Boundary convention and the rule — [validation-core-rules.md → scss-breakpoint-isolation](validation-core-rules.md#scss-breakpoint-isolation).

---

## 5. missing_container - Missing \_\_container

**Rule:** `__container` is required **EVERYWHERE** (edit.js, save.js, render.php).

**Error (in any file):**

```jsx
<section {...blockProps}>
	<div className='block-hero__body'>{/* content */}</div>
</section>
```

**Fix:**

```jsx
<section {...blockProps}>
	<div className='block-hero__container'>
		<div className='block-hero__body'>{/* content */}</div>
	</div>
</section>
```

---

## 7. wrong_bem_class - Incorrect BEM notation

**Error:**

```html
<div className="hero">
	<!-- No block- prefix -->
	<div className="block-hero_title">
		<!-- _ instead of __ -->
		<div className="block-hero__title-large"><!-- - instead of -- --></div>
	</div>
</div>
```

**Fix:**

```html
<div className="block-hero">
	<div className="block-hero__title">
		<div className="block-hero__title block-hero__title--large"></div>
	</div>
</div>
```

**Rules:**

- Prefix: `block-`
- Elements: `__`
- Modifiers: `--` (a separate class!)

---

## 8. wrong_richtext - RichText vs RichText.Content

**Error in save.js:**

```jsx
<RichText tagName='h1' value={title} onChange={(value) => setAttributes({ title: value })} />
// onChange is not needed in save.js!
```

**Fix:**

```jsx
<RichText.Content tagName='h1' value={title} />
```

**Error in edit.js:**

```jsx
<RichText.Content tagName='h1' value={title} />
// .Content is only for save.js!
```

**Fix:**

```jsx
<RichText tagName='h1' value={title} onChange={(value) => setAttributes({ title: value })} />
```

---

## 9. missing_abspath - No ABSPATH check

**Error in render.php:**

```php
<?php
// No ABSPATH check
$title = $attributes['title'] ?? '';
```

**Fix:**

```php
<?php
/**
 * Render template for Block Name
 *
 * @package Theme_Name
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$title = $attributes['title'] ?? '';
```

---

## 10. wrong_php_tags - Short PHP tags

**Error:**

```php
<? echo $var; ?>
<?= $var ?>
```

**Fix:**

```php
<?php echo esc_html( $var ); ?>
<?php echo esc_html( $var ); ?>
```

---

## 11. missing_phpdoc - No PHPDoc comment

**Error:**

```php
<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
// No PHPDoc
```

**Fix:**

```php
<?php
/**
 * Render template for {{blockTitle}}
 *
 * @package {{packageName}}
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
```

---

## 12. wrong_default_values - No default values

**Error:**

```php
$title = $attributes['title']; // No default!
$items = $attributes['items']; // Triggers a Notice if missing!
```

**Fix:**

```php
$title = $attributes['title'] ?? '';
$items = $attributes['items'] ?? array();
```

---

## 13. wrong_alternative_syntax - Alternative syntax is not used

**Error in render.php:**

```php
<?php if ( ! empty( $title ) ) { ?>
    <h2><?php echo esc_html( $title ); ?></h2>
<?php } ?>

<?php foreach ( $items as $item ) { ?>
    <div><?php echo esc_html( $item ); ?></div>
<?php } ?>
```

**Fix:**

```php
<?php if ( ! empty( $title ) ) : ?>
    <h2><?php echo esc_html( $title ); ?></h2>
<?php endif; ?>

<?php foreach ( $items as $item ) : ?>
    <div><?php echo esc_html( $item ); ?></div>
<?php endforeach; ?>
```

---

## 14. russian_chars - Russian characters in UI strings

**CRITICAL:** WordPress users MUST NOT see Russian characters!

**Error in edit.js:**

```jsx
placeholder={__('Заголовок', 'textdomain')}
label={__('Настройки', 'textdomain')}
title="Введите текст"
```

**Error in block.json:**

```json
{
	"title": "Блок героя",
	"description": "Красивый блок с заголовком",
	"keywords": ["герой", "баннер"],
	"attributes": {
		"title": {
			"type": "string",
			"default": "Заголовок"
		}
	}
}
```

**Fix in edit.js:**

```jsx
placeholder={__('Heading', 'textdomain')}
label={__('Settings', 'textdomain')}
title="Enter text"
```

**Fix in block.json:**

```json
{
	"title": "Hero Block",
	"description": "Beautiful block with heading",
	"keywords": ["hero", "banner"],
	"attributes": {
		"title": {
			"type": "string",
			"default": "Heading"
		}
	}
}
```

**Common translations:**
| Russian | English |
|---------|---------|
| Заголовок | Heading / Title |
| Подзаголовок | Subtitle |
| Текст | Text |
| Контент | Content |
| Кнопка | Button |
| Ссылка | Link |
| Изображение | Image |
| Иконка | Icon |
| Цвет | Color |
| Фон | Background |
| Настройки | Settings |
| Размер | Size |
| Стиль | Style |
| Выравнивание | Alignment |
| Отступ | Spacing / Padding |
| Граница | Border |
| Тень | Shadow |
| Показать | Show |
| Скрыть | Hide |
| Включить | Enable |
| Отключить | Disable |
| Элемент | Item / Element |
| Список | List |
| Карточка | Card |
| Секция | Section |
| Блок | Block |

**Fix algorithm:**

1. Find all strings with Russian characters: regex `[А-Яа-яЁё]`
2. Check the files: block.json, edit.js, save.js, render.php
3. Replace them with the English equivalents from the table above
4. If unsure - use generic terms: "Item", "Title", "Content"
5. Make sure there are no Russian characters anywhere in user-facing strings

**Files to check:**

- `block.json`: title, description, keywords, attribute defaults
- `edit.js`: all strings in `__()`, placeholder, label, title attributes
- `save.js`: all strings (if any)
- `render.php`: all strings (if any)
- `style.scss`: comments may be in Russian (not critical)

---

<a id="missing_section_supports"></a>
## 15. missing_section_supports - Incomplete section baseline supports

A section block (`block.json` has NO `parent` and NO `ancestor`) must declare at minimum these `supports`: `html:false`, `anchor:true`, `align:["wide","full"]`, `spacing:{margin:true,padding:true}`. Typical symptom — the converter/generator copied a "bare" template (`{ "html": false }` or `{ "html": false, "anchor": true }`) and lost `spacing`/`align`. See [validation-core-rules.md#supports-section-baseline](validation-core-rules.md#supports-section-baseline).

**Error in block.json:**

```json
{
	"name": "integroflow/before-after",
	"supports": {
		"html": false,
		"anchor": true
	}
}
```

**Fix in block.json:**

```json
{
	"name": "integroflow/before-after",
	"supports": {
		"html": false,
		"anchor": true,
		"align": ["wide", "full"],
		"spacing": {
			"margin": true,
			"padding": true
		}
	}
}
```

**Fix algorithm:**

1. Read `block.json`. If `parent` OR `ancestor` is present — it is a child block, **skip it** (the rule does not apply).
2. Otherwise (a section) — add the missing keys to `supports`:
   - no `anchor` → add `"anchor": true`;
   - `align` does not contain `"wide"`/`"full"` → add `"align": ["wide", "full"]`;
   - no `spacing.margin`/`spacing.padding` → add `"spacing": { "margin": true, "padding": true }`.
3. **Do not touch existing keys and their values**, keep the order of the other fields. Do not add `color`/`typography` (they are optional).
4. **If you added `spacing`** — a paired check of the [supports↔wrapper invariant](validation-core-rules.md#supports-invariant) is required: the root tag in `edit.js`/`save.js` must spread `{...blockProps}` (`render.php` — `$wrapper_attributes`). No spread → first fix the invariant (`wrong_use_block_props`), then add `spacing`, otherwise the supports styles will be silently lost.

**Files to check:**

- `block.json`: presence of `parent`/`ancestor` (classification) + completeness of `supports`
- `edit.js` / `save.js` / `render.php`: blockProps spread on the root (when adding `spacing`)
