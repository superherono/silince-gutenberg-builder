# Template Processor Helper

## Description

This helper provides utilities and patterns for processing template files when generating Gutenberg blocks.

---

## 1. Token Replacement Utilities

### 1.1 List of all tokens

```
{{NAMESPACE}} - Project namespace (for example: acme)
{{TEXTDOMAIN}} - Text domain for translations (for example: acme)
{{BLOCK_NAME}} - Block name in camelCase (for example: testButton2)
{{BLOCK_TITLE}} - Block title (for example: "Test Button 2")
{{BLOCK_DESCRIPTION}} - Block description (for example: "A custom button block")
```

### 1.2 Replacement patterns in different files

**block.json:**

```json
{
	"name": "{{NAMESPACE}}/{{BLOCK_NAME}}",
	"title": "{{BLOCK_TITLE}}",
	"description": "{{BLOCK_DESCRIPTION}}"
}
```

**edit.js and save.js (JavaScript):**

```javascript
// Imports with translations
import { __ } from '@wordpress/i18n';

// Using translations
__('Button text...', '{{TEXTDOMAIN}}');
__('Primary Blue', '{{TEXTDOMAIN}}');

// BEM classes
className = '{{NAMESPACE}}-{{BLOCK_NAME}}';
className = '{{NAMESPACE}}-{{BLOCK_NAME}}__inner';
className = '{{NAMESPACE}}-{{BLOCK_NAME}}__wrapper';
```

**style.scss and editor.scss (SCSS):**

```scss
// BEM selectors
.{{NAMESPACE}}-{{BLOCK_NAME}} {
  &__inner { }
  &__wrapper { }
  &__text { }
  &__icon { }

  &--small { }
  &--medium { }
  &--large { }
}
```

### 1.3 Regex patterns for search and replace

```javascript
// JavaScript/JSON files
"acme" → "{{NAMESPACE}}"
'acme' → '{{TEXTDOMAIN}}'
acme/test-button-2 → {{NAMESPACE}}/{{BLOCK_NAME}}
acme-test-button-2 → {{NAMESPACE}}-{{BLOCK_NAME}}

// SCSS files
.acme-test-button-2 → .{{NAMESPACE}}-{{BLOCK_NAME}}
&.acme-test-button-2 → &.{{NAMESPACE}}-{{BLOCK_NAME}}
```

---

## 2. CSS Custom Properties Processor

### 2.1 Extracting values from the Figma specification

**Analyzer specification structure:**

```json
{
	"colors": {
		"background": "#1862FF",
		"text": "#FFFFFF",
		"icon": "#212121",
		"iconBackground": "#FFFFFF"
	},
	"typography": {
		"fontSize": "16px",
		"fontFamily": "Mulish",
		"fontWeight": 400,
		"lineHeight": 1,
		"textTransform": "uppercase"
	},
	"spacing": {
		"padding": "8px",
		"gap": "16px",
		"minHeight": "56px",
		"minWidth": "229px"
	},
	"border": {
		"radius": "400px"
	},
	"icon": {
		"size": "24px",
		"wrapperSize": "40px",
		"wrapperPadding": "8px"
	}
}
```

**Mapping Figma → CSS Custom Properties:**

```scss
// Colors
--button-bg-color: spec.colors.background
--button-text-color: spec.colors.text
--button-icon-color: spec.colors.icon
--button-icon-bg-color: spec.colors.iconBackground
--button-focus-color: spec.colors.background (same as bg)
--button-hover-overlay: rgba(spec.colors.background, 0.1) (10% opacity)

// Typography
--button-font-size: spec.typography.fontSize
--button-font-family: spec.typography.fontFamily + ', sans-serif'
--button-font-weight: spec.typography.fontWeight
--button-line-height: spec.typography.lineHeight
--button-text-transform: spec.typography.textTransform

// Spacing
--button-padding: spec.spacing.padding
--button-gap: spec.spacing.gap
--button-min-height: spec.spacing.minHeight
--button-min-width: spec.spacing.minWidth

// Border
--button-border-radius: spec.border.radius
--icon-border-radius: spec.border.iconRadius || '500px' (default)

// Icon
--icon-size: spec.icon.size
--icon-wrapper-size: spec.icon.wrapperSize
--icon-wrapper-padding: spec.icon.wrapperPadding
```

### 2.2 Size Modifier Calculator

**Calculation formulas:**

```javascript
function calculateSizeModifier(baseValue, multiplier) {
	// baseValue: a number or a string with units ("16px", "1.5em")
	// multiplier: 0.8 for small, 1.0 for medium, 1.2 for large

	// Extract the number
	const numericValue = parseFloat(baseValue);

	// Extract the unit
	const unit = baseValue.replace(/[0-9.]/g, '') || 'px';

	// Calculate the new value
	const newValue = Math.round(numericValue * multiplier);

	// Return with the unit
	return `${newValue}${unit}`;
}

// Usage examples:
calculateSizeModifier('16px', 0.8); // → "13px"
calculateSizeModifier('16px', 1.2); // → "19px"
calculateSizeModifier('1.5em', 0.8); // → "1em"
```

**Automatic calculation of all small/large values:**

```javascript
const baseValues = {
	gap: '16px',
	padding: '8px',
	minHeight: '56px',
	fontSize: '16px',
	iconWrapperSize: '40px',
	iconSize: '24px',
};

const smallValues = {
	gap: calculateSizeModifier(baseValues.gap, 0.8), // "13px"
	padding: calculateSizeModifier(baseValues.padding, 0.8), // "6px"
	minHeight: calculateSizeModifier(baseValues.minHeight, 0.8), // "45px"
	fontSize: calculateSizeModifier(baseValues.fontSize, 0.8), // "13px"
	iconWrapperSize: calculateSizeModifier(baseValues.iconWrapperSize, 0.8), // "32px"
	iconSize: calculateSizeModifier(baseValues.iconSize, 0.8), // "19px"
};

const largeValues = {
	gap: calculateSizeModifier(baseValues.gap, 1.2), // "19px"
	padding: calculateSizeModifier(baseValues.padding, 1.2), // "10px"
	minHeight: calculateSizeModifier(baseValues.minHeight, 1.2), // "67px"
	fontSize: calculateSizeModifier(baseValues.fontSize, 1.2), // "19px"
	iconWrapperSize: calculateSizeModifier(baseValues.iconWrapperSize, 1.2), // "48px"
	iconSize: calculateSizeModifier(baseValues.iconSize, 1.2), // "29px"
};
```

### 2.3 CSS Variable Replacement Pattern

**Algorithm:**

1. Find the block with CSS Custom Properties in style.scss (usually lines 16-58)
2. For each CSS variable:
   - Extract the current value
   - Find the matching value in the Figma specification
   - If the value differs → replace it
   - If the value matches → leave it as is
3. For size modifiers (`&--small`, `&--large`):
   - Calculate all values dynamically using the multiplier
   - Replace ALL values (not only the ones that differ)

**Example replacement code:**

```javascript
// Pseudocode
function replaceCSSVariables(scssContent, figmaSpec) {
	const lines = scssContent.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Find the line with a CSS variable
		if (line.includes('--button-')) {
			const varName = extractVariableName(line); // "--button-bg-color"
			const currentValue = extractValue(line); // "#1862ff"
			const figmaValue = getFigmaValue(figmaSpec, varName); // "#FF0000"

			if (figmaValue && currentValue !== figmaValue) {
				lines[i] = line.replace(currentValue, figmaValue);
			}
		}
	}

	return lines.join('\n');
}
```

---

## 3. Design Tokens Integration

### 3.1 Reading theme tokens (`theme.json`)

**Source:** the theme's `theme.json` — paths `themeJsonPath` + `themeAliasesPath` from `src/.claude/config.json` (defaults `theme.json` and `src/scss/variables.scss`, relative to the theme root). `design-tokens.json` is NOT used (retired).

Contract and the full alias catalog — [css-custom-properties.md](../guides/css-custom-properties.md). In short: the value exists in theme.json → `var(--alias)` (whitelist = `variables.scss`, read live), otherwise hardcode it; raw `--wp--preset--*` and your own `--color-*` are forbidden.

**theme.json categories → alias prefix:** color.palette → `--{slug}` · gradients → `--gradient-{slug}` · spacing → `--space-{slug}` · fontSizes → `--text-{slug}` · fontFamilies → `--font-{slug}` · custom.radius → `--radius-{slug}` · custom.{tracking, lineHeight→leading, motion, z} → `--{group}-{slug}`.

A snapshot of the alias catalog and an example of value mapping — in [css-custom-properties.md](../guides/css-custom-properties.md); the authority on alias names — the project's `variables.scss` (read live).

### 3.2 ColorPalette for edit.js

The palette comes from the theme settings (theme.json), **not** from the block's `design-tokens.json`. See `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` §8.2 — this is the required pattern for all plugin blocks.

**Template in edit.js:**

```javascript
import { useSettings } from '@wordpress/block-editor';

const [themeColors] = useSettings('color.palette');
const colorPalette = [...(themeColors || [])];
```

**Theme tokens are used only for CSS Custom Properties in SCSS** (see section 3.3 below), not for generating the palette array in JS.

**Do not generate** an `[{name, color}, ...]` array from `design-tokens.json` in the block's JS code — this puts it out of sync with the WordPress theme. If there is no theme palette, `useSettings` returns an empty array, and the user sees the WP default.

### 3.3 Finding a token for a CSS value

**var() substitution algorithm:**

```javascript
function findAlias(value, themeJson, aliasesScss) {
	// 1) Find the slug in the relevant theme.json category (by hex / size):
	//    color.palette / color.gradients / spacing.spacingSizes /
	//    typography.fontSizes / typography.fontFamilies / custom.radius / custom.color
	// 2) Alias name by category prefix:
	const prefix = {
		palette: '', // color → --{slug}
		gradients: 'gradient', // --gradient-{slug}
		spacing: 'space', // --space-{slug}
		fontSizes: 'text', // --text-{slug}
		fontFamilies: 'font', // --font-{slug}
		radius: 'radius', // --radius-{slug}
	};
	// 3) The alias is valid ONLY if it is present in aliasesScss (variables.scss).
	//    slug exists but the alias does not → null → hardcode the value; DO NOT write raw `--wp--preset--*`.
	return null; // not found → hardcode
}

// Usage:
const bg = findAlias('#3f4e73', themeJson, aliasesScss);
// Result: 'var(--primary)' or null (then hardcode the value)
```

---

## 4. Additional Elements Handler

### 4.1 Identifying additional elements

**How to tell that an element is additional:**

An element counts as additional if it:

- Is NOT a base element (text, icon)
- Has a separate purpose (badge, counter, indicator)
- Can be turned on/off independently

**Examples of base vs additional elements:**

```
BASE (always present in the template):
- buttonText (button text)
- showIcon (show/hide the icon)
- customIcon (icon SVG)

ADDITIONAL (added based on Figma):
- badge (notification counter)
- counter (numeric indicator)
- statusDot (colored status dot)
- dropdownArrow (menu arrow)
- tooltip (hint on hover)
```

### 4.2 Template for adding an element

**1. Attributes in block.json:**

```json
{
	"attributes": {
		// ... base attributes ...

		// New element: Badge
		"showBadge": {
			"type": "boolean",
			"default": false
		},
		"badgeText": {
			"type": "string",
			"default": ""
		},
		"badgeColor": {
			"type": "string",
			"default": "#FF0000"
		},
		"badgePosition": {
			"type": "string",
			"enum": ["top-right", "top-left", "bottom-right", "bottom-left"],
			"default": "top-right"
		}
	}
}
```

**2. Controls in edit.js:**

```javascript
// Add a new PanelBody to InspectorControls
<PanelBody title={__('Badge Settings', '{textdomain}')} initialOpen={false}>
	<ToggleControl label={__('Show Badge', '{textdomain}')} checked={showBadge} onChange={(value) => setAttributes({ showBadge: value })} help={__('Display a badge on the button', '{textdomain}')} />

	{showBadge && (
		<>
			<TextControl label={__('Badge Text', '{textdomain}')} value={badgeText} onChange={(value) => setAttributes({ badgeText: value })} help={__('Text to display in the badge', '{textdomain}')} />

			<div className='components-base-control'>
				<label className='components-base-control__label'>{__('Badge Color', '{textdomain}')}</label>
				<ColorPalette colors={colorPalette} value={badgeColor} onChange={(color) => setAttributes({ badgeColor: color || '#FF0000' })} disableCustomColors={false} />
			</div>

			<SelectControl
				label={__('Badge Position', '{textdomain}')}
				value={badgePosition}
				options={[
					{ label: __('Top Right', '{textdomain}'), value: 'top-right' },
					{ label: __('Top Left', '{textdomain}'), value: 'top-left' },
					{ label: __('Bottom Right', '{textdomain}'), value: 'bottom-right' },
					{ label: __('Bottom Left', '{textdomain}'), value: 'bottom-left' },
				]}
				onChange={(value) => setAttributes({ badgePosition: value })}
			/>
		</>
	)}
</PanelBody>
```

**3. Rendering in edit.js:**

```jsx
// Add a CSS variable to blockProps
const blockProps = useBlockProps({
  className: `{namespace}-{blockName} {namespace}-{blockName}--${buttonSize} {namespace}-{blockName}--${buttonVariant}`,
  style: {
    '--button-bg-color': backgroundColor,
    '--button-text-color': textColor,
    // ... other variables ...
    '--badge-color': badgeColor  // ← New variable
  }
});

// Add badge rendering inside the button
<button className="{namespace}-{blockName}__inner" type="button">
  <div className="{namespace}-{blockName}__wrapper">
    <RichText ... />
    {showIcon && <div className="__icon-wrapper">...</div>}
  </div>

  {/* New element: Badge */}
  {showBadge && badgeText && (
    <span
      className={`{namespace}-{blockName}__badge {namespace}-{blockName}__badge--${badgePosition}`}
    >
      {badgeText}
    </span>
  )}
</button>
```

**4. Rendering in save.js:**

```jsx
// Add a CSS variable to blockProps
const blockProps = useBlockProps.save({
  className: `{namespace}-{blockName} {namespace}-{blockName}--${buttonSize} {namespace}-{blockName}--${buttonVariant}`,
  style: {
    '--button-bg-color': backgroundColor,
    '--button-text-color': textColor,
    // ... other variables ...
    '--badge-color': badgeColor  // ← New variable
  }
});

// Add badge rendering
<a href={buttonUrl} className="{namespace}-{blockName}__inner" ...>
  <div className="{namespace}-{blockName}__wrapper">
    <RichText.Content ... />
    {showIcon && customIcon && <div className="__icon-wrapper">...</div>}
  </div>

  {/* New element: Badge */}
  {showBadge && badgeText && (
    <span
      className={`{namespace}-{blockName}__badge {namespace}-{blockName}__badge--${badgePosition}`}
    >
      {badgeText}
    </span>
  )}
</a>
```

**5. Styles in style.scss:**

```scss
.{namespace}-{blockName} {
  // ... existing CSS variables ...

  // New CSS variables for the badge
  --badge-color: #FF0000;
  --badge-size: 20px;
  --badge-font-size: 12px;
  --badge-padding: 4px 8px;
  --badge-border-radius: 10px;

  // ... existing styles ...

  // New element: Badge
  &__badge {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: var(--badge-size);
    min-height: var(--badge-size);
    padding: var(--badge-padding);
    background-color: var(--badge-color);
    color: #ffffff;
    font-size: var(--badge-font-size);
    font-weight: 600;
    border-radius: var(--badge-border-radius);
    z-index: 10;

    // Position modifiers
    &--top-right {
      top: -8px;
      right: -8px;
    }

    &--top-left {
      top: -8px;
      left: -8px;
    }

    &--bottom-right {
      bottom: -8px;
      right: -8px;
    }

    &--bottom-left {
      bottom: -8px;
      left: -8px;
    }
  }

  // Responsive for the badge
  &--small {
    --badge-size: 16px;
    --badge-font-size: 10px;
    --badge-padding: 2px 6px;
  }

  &--large {
    --badge-size: 24px;
    --badge-font-size: 14px;
    --badge-padding: 6px 10px;
  }
}
```

---

## 5. Validation Checklist

### 5.1 Token Replacement Validation

**Check that all tokens are replaced:**

```bash
# Search for unreplaced tokens
grep -r "{{NAMESPACE}}" {blocksDir}/{blockName}/
grep -r "{{TEXTDOMAIN}}" {blocksDir}/{blockName}/
grep -r "{{BLOCK_NAME}}" {blocksDir}/{blockName}/
grep -r "acme" {blocksDir}/{blockName}/
grep -r "test-button-2" {blocksDir}/{blockName}/
```

The result must be **empty** (all tokens replaced).

### 5.2 CSS Custom Properties Validation

**Check that all CSS variables are updated:**

1. Compare the values in style.scss with the Figma specification
2. Check that size modifiers are calculated correctly:
   - `small` = `base * 0.8`
   - `large` = `base * 1.2`
3. Make sure the CSS structure is NOT changed (only variable values)

### 5.3 ColorPalette Validation

**ColorPalette ALWAYS takes colors from the theme settings via `useSettings('color.palette')`** — see `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` §8.2.

```javascript
// ✅ CORRECT
import { useSettings } from '@wordpress/block-editor';
const [themeColors] = useSettings('color.palette');
const colorPalette = [...(themeColors || [])];

// ❌ WRONG - hardcoded colors
const colorPalette = [
	{ name: 'Custom Color 1', color: '#123456' },
	{ name: 'Custom Color 2', color: '#789ABC' },
];

// ❌ WRONG - array from design-tokens.json (that is for SCSS, not for the editor)
const colorPalette = Object.entries(globalTokens.colors).map(...);
```

### 5.4 File Structure Validation

**Check that all 7 files are created:**

```
{blocksDir}/{blockName}/
├── block.json          ✓
├── index.js            ✓
├── edit.js             ✓
├── save.js             ✓
├── style.scss          ✓
├── editor.scss         ✓
└── view.js             ✓
```

### 5.5 Additional Elements Validation

**If additional elements were added, check:**

1. ✓ Attributes added to block.json
2. ✓ Controls added to edit.js InspectorControls
3. ✓ Rendering added to edit.js and save.js
4. ✓ Styles added to style.scss
5. ✓ CSS Custom Properties added for the new element
6. ✓ Responsive styles added for size modifiers

---

## 6. Common Patterns

### 6.1 BEM Naming Convention

```scss
.{namespace}-{blockName} {              // Block
  &__inner { }                          // Element: inner
  &__wrapper { }                        // Element: wrapper
  &__text { }                           // Element: text
  &__icon { }                           // Element: icon
  &__icon-wrapper { }                   // Element: icon-wrapper
  &__badge { }                          // Element: badge (additional)

  &--small { }                          // Modifier: size
  &--medium { }                         // Modifier: size
  &--large { }                          // Modifier: size
  &--primary { }                        // Modifier: variant
  &--outline { }                        // Modifier: variant
}
```

### 6.2 Responsive Breakpoints

```scss
// Desktop First approach
$mobile: 768px;
$tablet: 1024px;

// Base styles (desktop)
.{namespace}-{blockName} {
  --button-font-size: 16px;
}

// Tablet
@media (max-width: $tablet) {
  .{namespace}-{blockName} {
    --button-font-size: 15px;
  }
}

// Mobile
@media (max-width: $mobile) {
  .{namespace}-{blockName} {
    --button-font-size: 14px;
  }
}
```

### 6.3 Accessibility Patterns

```scss
.{namespace}-{blockName} {
  &__inner {
    // Reduced motion
    @media (prefers-reduced-motion: reduce) {
      --button-transition: none;
      --button-hover-transform: none;
      --button-active-transform: none;
    }

    // High contrast
    @media (prefers-contrast: high) {
      border: var(--button-border-width) solid currentColor;
    }
  }
}
```

---

## 7. Error Handling

### 7.1 Missing Figma Values

If a value is missing from the Figma specification:

```javascript
// Use fallback values from the template
const backgroundColor = figmaSpec.colors?.background || '#1862FF'; // ← fallback
const fontSize = figmaSpec.typography?.fontSize || '16px'; // ← fallback
```

### 7.2 Invalid CSS Values

Validate CSS values before replacing them:

```javascript
function isValidCSSValue(value) {
	// Check for colors
	if (value.startsWith('#')) {
		return /^#[0-9A-Fa-f]{3,6}$/.test(value);
	}

	// Check for sizes
	if (value.match(/^\d+(\.\d+)?(px|em|rem|%)$/)) {
		return true;
	}

	// Check for other values
	return value.length > 0;
}

// Usage
if (isValidCSSValue(figmaValue)) {
	replaceValue(currentValue, figmaValue);
} else {
	console.warn(`Invalid CSS value: ${figmaValue}, keeping current: ${currentValue}`);
}
```

### 7.3 theme.json is unavailable

If the theme's `theme.json` is not found (non-standard setup):

- **For SCSS values** — keep them hardcoded (values as in the specification). Once the path to `theme.json` appears in config — the SCSS can be updated via find/replace to aliases.
- **For ColorPalette in the editor** — DO NOT generate the array yourself. Use `useSettings('color.palette')` (see §8.2 of the base standard). If the theme has no palette — the user sees the WP default, which is fine.

**DO NOT generate** an `[{name, color}, ...]` array in JS code — not even as a fallback. The palette — the responsibility of the theme (theme.json), not the block.

**Recommendation:** make sure `themeJsonPath` is set in `src/.claude/config.json` (otherwise the plugin uses the default `theme.json`).

---

## 8. Performance Tips

### 8.1 Minimizing rewrites

**DO NOT rewrite whole files** if you can update only parts of them:

```javascript
// ❌ BAD - rewriting the whole file
const newContent = generateFullFile();
Write(filePath, newContent);

// ✅ GOOD - updating only the parts that need it
const content = Read(filePath);
const updatedContent = replaceOnlyTokens(content, tokens);
Write(filePath, updatedContent);
```

### 8.2 Caching theme tokens

**Read the theme's `theme.json` + `variables.scss` once** at the start of processing:

```javascript
// Paths from config, defaults theme.json / src/scss/variables.scss (relative to the theme root)
const themeJson = JSON.parse(Read(config.themeJsonPath || 'theme.json'));
const aliasesScss = Read(config.themeAliasesPath || 'src/scss/variables.scss');

// Build a value→alias map for substituting CSS Custom Properties in SCSS
// (NOT for ColorPalette — that uses useSettings('color.palette'))
const cssVarsForScss = buildAliasMap(themeJson, aliasesScss);
```

---

## 9. Quick Reference

### 9.1 File Processing Order

```
1. Copy template files
2. Replace tokens ({{NAMESPACE}}, {{TEXTDOMAIN}}, etc.)
3. Update CSS Custom Properties in style.scss
4. Update colorPalette in edit.js
5. Add additional elements (if any)
6. Validate all changes
7. Save all files
```

### 9.2 Must-Have Validations

```
✓ All tokens replaced
✓ CSS values use theme aliases (var(--primary), var(--space-lg)) when present in theme.json
✓ CSS values hardcoded when value not found in theme.json
✓ Size modifiers calculated (small = base * 0.8, large = base * 1.2)
✓ colorPalette uses theme palette via useSettings('color.palette')
✓ All 7 files present
✓ BEM naming consistent
✓ No syntax errors
```

### 9.3 Common Mistakes to Avoid

```
❌ Creating/reading design-tokens.json (retired — source is theme.json)
❌ Using block-prefixed or raw-preset CSS variables instead of theme aliases (var(--canvas))
❌ Changing CSS structure instead of just variable values
❌ Forgetting to calculate size modifiers dynamically
❌ Not replacing all token occurrences
❌ Not checking theme.json for matching values
❌ Modifying base template structure when adding additional elements
```
