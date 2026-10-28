# CSS Custom Properties — Best Practice

**CRITICAL:** All editable block properties MUST be controlled through CSS Custom Properties (CSS variables) on the ROOT element, and NOT through inline styles on nested elements.

The second point, just as important: **all design values come from the theme's `theme.json` through short aliases.** The source of truth for the design system is `theme.json`, not the plugin files.

---

## 🎨 Token source — the theme's `theme.json` (NOT `design-tokens.json`)

> **Contract change.** The plugin NO longer creates or reads `design-tokens.json` (the `create-design-tokens` command is deprecated). The only source of design tokens is the theme's `theme.json`. The bridge `src/scss/variables.scss` re-exports WP presets under short aliases that resolve BOTH on the front end AND in the editor.

### Substitution rule (the only one)

```
Value exists in theme.json  → write var(--{alias})
Value not in theme.json     → hardcode the value directly
```

**Hard prohibitions:**

- ❌ NEVER write raw `var(--wp--preset--color--...)` / `--wp--preset--spacing--...` / `--wp--custom--...` directly in block code. Only short aliases.
- ❌ NEVER invent your own `--color-*`, `--radius-pill`, `--spacing-*`, `--font-size-*` (this is the old, retired scheme).
- ❌ DO NOT use legacy aliases (`--accent`, `--paper`, `--soft`, `--muted`, `--white`, `--black`, `--cta-bg`, `--color-ink`, `--second-font-family-display`, `--font-family-display`, `--gray-ui` …) in NEW blocks — they exist only so that old blocks render without changes, and they will die off as blocks are regenerated. The list is at the end of the file.

### How the plugin learns the aliases

The plugin runs in Claude Code, not in the WP runtime, so it **reads the theme files statically**. Paths come from `src/.claude/config.json` and resolve **relative to the theme root** (the same way as `blocksDir`):

1. `themeJsonPath` (default `theme.json`) — provides **values** and **slugs** by category.
2. `themeAliasesPath` (default `src/scss/variables.scss`) — the **authoritative whitelist** of alias names and of the preset each one points to.
3. `designSystemPath` (default — none; set by the project) — the design system markdown with a `components.*` section (component recipes: which token goes into which slot). Used by button variant generation — see [button-variant-generation.md](button-variant-generation.md). No key/file → generation falls back.

If the keys are not in the config, use these defaults. The whitelist is read "live", so the plugin picks up any alias added to or removed from `variables.scss` without changes.

**SCSS generation algorithm:**

1. For each design value from the source (Figma/HTML/JSX inline), find the matching slug in `theme.json` (by hex/size).
2. If `variables.scss` has an alias for that slug → write `var(--{alias})`.
3. If the value exists in theme.json but `variables.scss` has NO short alias for it → **hardcode the value** from theme.json, DO NOT write the raw preset. (Currently `--text-*` is a full mirror of `fontSizes`, and `--space-*` covers all spacing; the contract has no gaps, but the rule stays for the future.)
4. If the value is not in theme.json at all → hardcode it as is.

<a id="spacing-and-font-size--alias-required-not-raw-rem"></a>
#### Spacing and font-size — alias required, not raw rem

`spacing.spacingSizes` and `typography.fontSizes` in theme.json are **closed scales** (generated from the project's design system). For **padding / margin / gap** and **font-size** the default is an **alias**, not a raw value. The decision is **deterministic**, based on a map built from the project's theme.json (no numbers in the plugin).

##### Procedure for resolving a value → alias (shared by the converter / validator / fixer)

1. **Build a map from the project's theme.json** (`themeJsonPath`, which is read anyway). For each preset in `spacing.spacingSizes[]` and `typography.fontSizes[]`, normalize `size` to px (`rem × 16`) and split by form:
   - **fixed** — a literal size (`"1.5rem"`, `"24px"`): one reference px.
   - **fluid** — `clamp(min, …, max)`: two reference px (min and max).
2. **Match the value from the source** (only the `padding/margin/gap` and `font-size` properties):
   - matches a **fixed** preset (tolerance **±1px**, only for rem rounding error) → emit the alias `var(--space-{slug})` / `var(--text-{slug})`. This also applies to "accidental" matches (12/16/24/32 …) — alias them **too**, **never** `1.5rem // 24px`.
   - matches a **fluid** preset — see §"Fluid tokens" below.
   - matches nothing → **off-scale**, §2-bis.
3. **The tolerance is narrow (~±1px)** — it catches only rem rounding (`0.9999rem` → `var(--space-md)`), and NOT "rounding" 28→24. Choosing 28 vs 24 is the designer's decision, not the tool's.

> The map is built from the theme.json of **the project** where the conversion runs. Another project (`xl=20px`) → 20px gets aliased to `var(--space-xl)`, and 24px becomes off-scale. No absolute numbers are hardcoded in the plugin — same as with colors/radii.

##### Fluid tokens (`clamp`) — be careful

In theme.json the upper spacing steps (`4xl/5xl/6xl`) and display fonts are often **fluid** (`clamp(min,…,max)`). The source usually expresses them as a **manual `@media` pair** (e.g. `padding-top: 64px` desktop / `40px` mobile = exactly the `max`/`min` of the `4xl` clamp).

- **Fluid values are NOT auto-aliased by default** (that touches the `@media` structure — it collapses two branches into a single `var(--space-4xl)`; the risk is the same as with `media_value_leak`).
- Instead — a **warning** with a recipe: `manual breakpoint pair 64/40px = fluid token 4xl → replace both branches with padding-top: var(--space-4xl)`.
- A single value equal to the `max` of a fluid token is also **only a warning** (the alias would make it fluid — this changes behavior, a human decides).

##### §2-bis. Off-scale value

The source is off the scale (`28 / 40 / 56 / 96px`, `19 / 17 / 13.5px`; the nearest preset is beyond the tolerance) → an **upstream defect** (the designer agent did not snap it). DO NOT snap silently — it would shift the layout. Keep the value, but **add a warning to the report**: `off-scale spacing 28px on .block__body — nearest token xl(24)/2xl(32); snap it in the source design`. It is fixed in the source (snap), after which the next conversion aliases it.

> Backstop: whatever the converter missed is caught by the validator (`raw_token_value`, [validation-core-rules.md](validation-core-rules.md#scss-token-aliasing)) and auto-fixed by the fixer — for **fixed** tokens. Regression of 23-06/24-06: blocks emitted all spacing as raw rem, although half of it sat on the fixed scale — this is exactly what we are fixing.

### Alias name derivation rules (for understanding; the whitelist is still `variables.scss`)

| `theme.json` category | Alias rule | Example |
| --- | --- | --- |
| `color.palette[].slug` | `--{slug}` (no prefix) | `primary` → `var(--primary)` |
| `color.gradients[].slug` | `--gradient-{slug}` | `accent` → `var(--gradient-accent)` |
| `custom.color.{key}` | `--{kebab-key}` | `lineOnDark` → `var(--line-on-dark)` |
| `spacing.spacingSizes[].slug` | `--space-{slug}` (clean slug!) | `2xl` → `var(--space-2xl)` |
| `typography.fontSizes[].slug` | `--text-{slug}` | `display-xl` → `var(--text-display-xl)` |
| `typography.fontFamilies[].slug` | `--font-{slug}` | `display` → `var(--font-display)` |
| `custom.radius.{slug}` | `--radius-{slug}` | `md` → `var(--radius-md)` |
| `custom.tracking.{key}` | `--tracking-{kebab-key}` | `displayMid` → `var(--tracking-display-mid)` |
| `custom.lineHeight.{key}` | `--leading-{key}` | `snug` → `var(--leading-snug)` |
| `custom.motion.duration*` | `--motion-{fast\|base\|slow}` | `durationFast` → `var(--motion-fast)` |
| `custom.motion.ease*` | `--ease-{standard\|out}` | `easeStandard` → `var(--ease-standard)` |
| `custom.z.{key}` | `--z-{key}` | `panel` → `var(--z-panel)` |

> ⚠️ **WP kebab-case trap.** WP kebab-cases a slug at a digit→letter boundary: the slug `2xl` is emitted as `--wp--preset--spacing--2-xl`. The bridge absorbs this — the alias stays the **clean** `--space-2xl`. Always use the clean alias `var(--space-2xl)`, and DO NOT reference `--wp--preset--spacing--2xl`/`--2-xl`.
>
> ⚠️ **camelCase in `settings.custom`** gets kebab-cased: `durationFast` → `--wp--custom--motion--duration-fast`. This is already hidden behind the `--motion-fast` alias — use it.

### Theme alias catalog (snapshot; the authority is the project's `variables.scss`)

**Colors (roles):** `--primary` `--primary-deep` `--on-primary` · `--ink` `--ink-soft` `--ink-mid` `--body` `--body-mid` `--mute` `--on-dark-mute` · `--canvas` `--canvas-soft` `--canvas-sunk` · `--line` `--line-soft` `--line-strong` `--line-on-dark`
**Gradient (emphasis):** `--gradient-accent` (navy)
**Spacing (4px):** `--space-xxs` `--space-xs` `--space-sm` `--space-md` `--space-lg` `--space-xl` `--space-2xl` `--space-3xl` `--space-4xl` `--space-5xl` `--space-6xl`
**Typography:** `--text-display-xl` `--text-display-lg` `--text-display-md` `--text-display-sm` `--text-eyebrow` `--text-body-lg` `--text-body-md` `--text-body-sm` `--text-caption` `--text-label-caps` `--text-button-md` `--text-button-sm` — a full mirror of the theme's `fontSizes`
**Fonts:** `--font-display` (GeneralSans) · `--font-body` (Inter)
**Radii:** `--radius-sm` `--radius-md` `--radius-lg` `--radius-xl` `--radius-pill` — **canonical control = `--radius-md` (12px)**, cards = `--radius-lg` (16px). The design has "no pill buttons": use `--radius-md` for buttons, and `--radius-pill` only deliberately.
**Tracking/leading/motion/z:** `--tracking-*` `--leading-*` `--motion-fast|base|slow` `--ease-standard|out` `--z-header|panel|modal`

> Any NEW token added to `theme.json` (palette/spacing/fontSize/gradient/custom) automatically reaches both the front end and the editor — there is no separate generator to update. If the snapshot above differs from the project, `variables.scss` is the authority.

---

## Why CSS Custom Properties (and not inline styles)

### ❌ The problem with inline styles

```javascript
// OLD APPROACH — DO NOT USE!
const buttonStyle = { backgroundColor, color: textColor };
<button style={buttonStyle}>...</button>;
```

Duplicated styles, hard to override, no cascade.

### ✅ Solution — CSS variables on the root

```javascript
const blockProps = useBlockProps({
	style: {
		'--ns-bg-color': backgroundColor,
		'--ns-text-color': textColor,
		'--ns-icon-color': iconColor,
	},
});

<section {...blockProps}>
	<div className='block__inner'>
		<span className='block__text'>Text</span>
	</div>
</section>;
```

Centralized control, clean HTML on nested elements, easy overriding, cascade.

---

## Two types of CSS variables

### 1. Theme aliases (from `theme.json` through `variables.scss`)

For design values from the system. Names follow the catalog above (`--primary`, `--ink`, `--body`, `--space-lg`, `--radius-md`, `--text-display-md`, `--font-display`…). They do NOT need to be declared in the block — they are global.

### 2. Runtime variables (in `blockProps.style`)

For values the user picks in the editor. Naming: `--{namespace}-{propertyName}` (WITHOUT the block name).

| Attribute | CSS variable | Value from |
| --- | --- | --- |
| backgroundColor | `--ns-bg-color` | attributes (default references a theme alias) |
| textColor | `--ns-text-color` | attributes (default — a theme alias) |
| style.border.radius | `--ns-border-radius` | WordPress style API |
| style.typography.fontSize | `--ns-font-size` | WordPress style API |
| style.spacing.padding | `--ns-padding` | WordPress style API |

**How the two types connect:** in SCSS the runtime variable gets a fallback to a theme alias:

```scss
.block {
	--ns-bg-color: var(--primary);            // fallback to a theme token
	--ns-text-color: var(--on-primary);
	--ns-border-radius: var(--radius-md);     // canonical control
}
```

---

## Handling the WordPress `style` attribute

### border.radius — string or object

```javascript
const getBorderRadius = () => {
	const radius = style?.border?.radius;
	if (!radius) return 'var(--radius-md)'; // default — a theme alias
	if (typeof radius === 'string') return radius;
	if (typeof radius === 'object') return radius.topLeft || Object.values(radius)[0] || 'var(--radius-md)';
	return 'var(--radius-md)';
};
```

### typography.fontSize

```javascript
const fontSize = style?.typography?.fontSize || 'var(--text-body-md)';
```

### spacing.padding — string or object

```javascript
const getPadding = () => {
	const padding = style?.spacing?.padding;
	if (!padding) return 'var(--space-lg)';
	if (typeof padding === 'string') return padding;
	if (typeof padding === 'object') {
		const { top, right, bottom, left } = padding;
		return `${top || '0'} ${right || '0'} ${bottom || '0'} ${left || '0'}`;
	}
	return 'var(--space-lg)';
};
```

---

## Code structure

### edit.js / save.js

```javascript
export default function Edit({ attributes, setAttributes }) {
	const { backgroundColor, textColor, iconColor, style } = attributes;

	const getBorderRadius = () => { /* ... */ };
	const fontSize = style?.typography?.fontSize || 'var(--text-body-md)';

	// ✅ ALL editable properties — through CSS variables on the ROOT
	const blockProps = useBlockProps({
		className: 'block',
		style: {
			'--ns-bg-color': backgroundColor,
			'--ns-text-color': textColor,
			'--ns-icon-color': iconColor,
			'--ns-border-radius': getBorderRadius(),
			'--ns-font-size': fontSize,
		},
	});

	return (
		<section {...blockProps}>
			{/* NO style attributes on nested elements! */}
			<div className='block__inner'>
				<span className='block__text'>Text</span>
			</div>
		</section>
	);
}
```

### style.scss

```scss
.block {
	// Runtime variables with a fallback to THEME ALIASES (not to hardcoded values/custom tokens)
	--ns-bg-color: var(--primary);
	--ns-text-color: var(--on-primary);
	--ns-icon-color: var(--ink-mid);
	--ns-border-radius: var(--radius-md);
	--ns-font-size: var(--text-body-md);

	&__inner {
		background-color: var(--ns-bg-color);
		color: var(--ns-text-color);
		border-radius: var(--ns-border-radius);
		font-size: var(--ns-font-size);
	}

	&__icon { color: var(--ns-icon-color); }

	// Static values — directly from theme aliases
	&__badge {
		padding: var(--space-sm);   // exists in theme.json → alias
		margin: 13px;               // not in theme.json → hardcode
	}
}
```

**Substitution logic:** the value exists in theme.json → `var(--alias)`; it does not → hardcode.

**Elements with a universal class — no styles.** If an element in the markup carries a universal (global) class — any class other than the block's own BEM class (`block-{name}*`) and WP core classes (`wp-block-*`/`has-*`/`is-*`/`align*`), e.g. `if-eyebrow`, `integroflow-heading` — its visual styles are already set globally. Do not write typography, color or spacing for its BEM selector (not even with aliases): leave the selector empty with a comment. The BEM class stays in the markup. Full rule: [validation-core-rules.md#scss-universal-class-no-duplicate](validation-core-rules.md#scss-universal-class-no-duplicate).

---

## ❌ What NOT to do

### 1. DO NOT create separate style objects

```javascript
// ❌
const buttonStyle = { backgroundColor };
const textStyle = { color: textColor };
```

### 2. DO NOT add inline styles to nested elements

```javascript
// ❌
<div className='block__inner' style={{ backgroundColor }}>
	<span style={{ color: textColor }}>Text</span>
</div>
```

### 3. DO NOT use block-specific variable names

```scss
// ❌ Block name in the variable
.block-hero { --hero-bg-color: #3f4e73; }

// ✅ Theme alias or namespace-only runtime variable
.block-hero { --ns-bg-color: var(--primary); }
```

### 4. DO NOT write raw presets and DO NOT invent your own tokens

```scss
// ❌ raw WP preset
.block__inner { color: var(--wp--preset--color--primary); }

// ❌ custom retired scheme
.block__inner { color: var(--color-primary); border-radius: var(--radius-pill); }

// ✅ theme alias
.block__inner { color: var(--primary); border-radius: var(--radius-md); }
```

### 5. DO NOT hardcode when a theme alias exists

```scss
// ❌ the token --canvas: #ffffff exists
.block__inner { background: #ffffff; }

// ✅
.block__inner { background: var(--canvas); }

// ✅ no token for this value — hardcoding is OK
.block__badge { margin: 13px; }
```

---

## Legacy aliases — DO NOT use in new blocks

These aliases exist in `variables.scss` only for compatibility with old blocks and will die off as blocks are regenerated. Know their mapping when reading old code; in NEW code use the right-hand column.

| Legacy (do not write) | Correct token |
| --- | --- |
| `--accent`, `--accent-color` | `--primary` |
| `--accent-ink`, `--color-inverted-text` | `--on-primary` |
| `--color-ink` | `--ink` |
| `--ink-3`, `--color-ink-3`, `--line-dark` | `--ink-mid` |
| `--main-color` | `--body` |
| `--muted`, `--color-muted`, `--gray-text` | `--body-mid` |
| `--paper`, `--color-paper`, `--white` | `--canvas` |
| `--soft`, `--color-soft` | `--canvas-soft` |
| `--color-line`, `--gray-ui` | `--line` |
| `--cta-bg`, `--color-cta-bg` | `--primary-deep` |
| `--black` | `--ink` |
| `--brand-blue` | `--primary` |
| `--font-family-display`, `--font-family-body` | `--font-body` (Inter) |
| `--second-font-family-display` | `--font-display` (GeneralSans) |
| `--font-family-mono`, `--font-mono` | `--font-body` (mono retired) |

---

## Final HTML structure

```html
<!-- ✅ CORRECT: inline variables only on the root -->
<section class="block" style="--ns-bg-color: var(--primary); --ns-font-size: var(--text-body-md);">
	<div class="block__inner">
		<span class="block__text">Text</span>
	</div>
</section>
```

- ✅ All inline styles — ONLY on the root element
- ✅ Nested elements are clean (classes only)
- ✅ Runtime variable defaults reference theme aliases, not hardcoded values
