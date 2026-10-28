# WordPress Gutenberg Block JavaScript Structure Guide

## Core Principles

When creating WordPress Gutenberg blocks, follow this architectural approach for maintainable and flexible block development:

---

## 1. Use InnerBlocks Instead of RichText or Custom State

**DO:**

- Use `InnerBlocks` component for ALL editable text content
- Leverage WordPress Core blocks (`core/heading`, `core/paragraph`, etc.)
- Let WordPress manage the content state automatically

**DON'T:**

- Use `RichText` components directly
- Store text content in block attributes
- Create custom state management for text

### Example:

```javascript
// ✅ CORRECT - Use InnerBlocks with core blocks
const TEMPLATE = [
    ['core/heading', {
        level: 2,
        placeholder: 'Enter title...',
        content: 'Default Title'
    }],
    ['core/paragraph', {
        placeholder: 'Enter description...',
        content: 'Default description text'
    }],
];

<InnerBlocks
    template={TEMPLATE}
    allowedBlocks={['core/heading', 'core/paragraph']}
    templateLock={false}
/>

// ❌ WRONG - Don't use RichText
<RichText
    value={title}
    onChange={(value) => setAttributes({ title: value })}
/>
```

---

## 2. Structure Complex Blocks with Nested Blocks

For blocks with repeatable components (like cards, features, items):

**ARCHITECTURE:**

1. Create a **parent container block** that manages layout
2. Create **separate child blocks** for repeatable items
3. Use `InnerBlocks` in parent to contain child blocks
4. Use `parent` property in child block.json to restrict usage

### Parent Block Pattern:

```javascript
// parent-block/edit.js
const TEMPLATE = [
	[
		'core/group',
		{ className: 'parent__content' },
		[
			['core/heading', { level: 1, content: 'Main Title' }],
			['core/paragraph', { content: 'Description' }],
		],
	],
	[
		'core/group',
		{ className: 'parent__items' },
		[
			[
				'namespace/child-item',
				{
					/* item props */
				},
			],
			[
				'namespace/child-item',
				{
					/* item props */
				},
			],
			[
				'namespace/child-item',
				{
					/* item props */
				},
			],
		],
	],
];

<InnerBlocks template={TEMPLATE} allowedBlocks={['core/group']} templateLock={false} />;
```

### Child Block Pattern:

```javascript
// child-item/block.json
{
    // Default: "ancestor" — the child sits inside a nested core/group (a typical grid).
    // "parent" — only for a direct child of the parent block without a core/group wrapper
    // OR if the count is fixed by the brief. Details:
    // guides/innerblocks-composition.md → "🔓 Nested grid wrappers: 3-part unlock pattern"
    "ancestor": ["namespace/parent-block"],
    "usesContext": ["namespace/someSharedValue"]
}

// child-item/edit.js
<div {...useBlockProps()}>
    <div className="item__icon">{icon}</div>
    <div className="item__content">
        <InnerBlocks
            template={ITEM_TEMPLATE}
            allowedBlocks={['core/heading', 'core/paragraph']}
        />
    </div>
</div>
```

⚠️ **If the parent uses `templateLock="all"` + seeds 2+ child blocks in a nested `core/group`** — that group's attributes MUST include `templateLock: false` + `allowedBlocks: ['{ns}/{child}']` (3-part unlock; otherwise the inserter is blocked).

---

## 3. Template Structure with InnerBlocks Content

When defining templates, you can pass content THREE ways:

### Method 1: Attributes Only (for parent blocks)

```javascript
[
	'namespace/child-block',
	{ icon: '✓', color: '#fff' }, // Second parameter: attributes
];
```

### Method 2: With Inner Content (for nested InnerBlocks)

```javascript
[
	'namespace/child-block',
	{ icon: '✓', color: '#fff' }, // Second: attributes
	[
		['core/heading', { content: 'Title' }],
		['core/paragraph', { content: 'Text' }],
	], // Third parameter: inner blocks
];
```

### Method 3: Deep Nesting with Groups

```javascript
const TEMPLATE = [
	[
		'core/group',
		{ className: 'section__cards' },
		[
			[
				'namespace/card',
				{ icon: '🛡️', iconColor: '#1862FF' },
				[
					['core/heading', { level: 3, content: 'Card Title' }],
					['core/paragraph', { content: 'Card description' }],
				],
			],
			[
				'namespace/card',
				{ icon: '⭐', iconColor: '#FFD700' },
				[
					['core/heading', { level: 3, content: 'Another Card' }],
					['core/paragraph', { content: 'Different content' }],
				],
			],
		],
	],
];
```

---

## 4. Context API for Parent-Child Communication

Use WordPress Block Context API instead of props drilling:

### Parent Block (provides context):

```javascript
// parent/block.json
{
    "providesContext": {
        "namespace/backgroundColor": "backgroundColor",
        "namespace/textColor": "textColor"
    }
}
```

### Child Block (uses context):

```javascript
// child/block.json
{
    "usesContext": ["namespace/backgroundColor", "namespace/textColor"]
}

// child/edit.js
export default function Edit({ attributes, setAttributes, context }) {
    const bgColor = context['namespace/backgroundColor'] || '#fff';
    const textColor = context['namespace/textColor'] || '#000';

    // Use context values
}
```

## 6. Edit Component Pattern

```javascript
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ColorPalette, TextControl } from '@wordpress/components';

/**
 * Block Edit Component
 */
export default function Edit({ attributes, setAttributes, context }) {
	const { customAttr } = attributes;
	const contextValue = context['namespace/contextKey'] || 'default';

	const blockProps = useBlockProps({
		className: 'block-name',
		style: {
			// Dynamic styles based on attributes
		},
	});

	// Define template
	const TEMPLATE = [
		['core/heading', { level: 2, content: 'Title' }],
		['core/paragraph', { content: 'Description' }],
	];

	return (
		<>
			{/* Settings Panel */}
			<InspectorControls>
				<PanelBody title={__('Settings', 'textdomain')}>
					<TextControl label={__('Custom Attribute', 'textdomain')} value={customAttr} onChange={(value) => setAttributes({ customAttr: value })} />
				</PanelBody>
			</InspectorControls>

			{/* Block Content */}
			<div {...blockProps}>
				<div className='block-name__container'>
					<InnerBlocks template={TEMPLATE} allowedBlocks={['core/heading', 'core/paragraph']} templateLock={false} />
				</div>
			</div>
		</>
	);
}
```

---

## 7. Save Component Pattern

```javascript
/**
 * WordPress dependencies
 */
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Block Save Component
 */
export default function save({ attributes }) {
	const { customAttr } = attributes;

	const blockProps = useBlockProps.save({
		className: 'block-name',
		style: {
			// Same dynamic styles as edit
		},
	});

	return (
		<div {...blockProps}>
			<div className='block-name__container'>
				<InnerBlocks.Content />
			</div>
		</div>
	);
}
```

---

## 8. Block.json Configuration

```json
{
	"$schema": "https://schemas.wp.org/trunk/block.json",
	"apiVersion": 3,
	"name": "namespace/block-name",
	"title": "Block Title",
	"category": "custom-category",
	"icon": "block-default",
	"ancestor": ["namespace/parent-block"], // For child blocks (default — works inside nested core/group)
	// "parent": ["namespace/parent-block"], // ← only if child is DIRECT child (no core/group wrapper) or count is fixed by brief
	"attributes": {
		"customAttr": {
			"type": "string",
			"default": "value"
		}
	},
	"providesContext": {
		// For parent blocks
		"namespace/sharedValue": "attributeName"
	},
	"usesContext": ["namespace/sharedValue"], // For child blocks
	"supports": {
		"html": false,
		"anchor": true,               // section blocks (mandatory baseline)
		"align": ["wide", "full"],    // section blocks (mandatory baseline)
		"spacing": {                  // section blocks (mandatory baseline)
			"margin": true,
			"padding": true
		}
		// child blocks instead: "reusable": false  (spacing OPTIONAL, only if root spreads {...blockProps})
	}
}
```

**🧱 Required minimum of `supports` — invariant:**

- **Section blocks** (no `ancestor`/`parent` in block.json) MUST declare at least:

  ```json
  "supports": {
  	"html": false,
  	"anchor": true,
  	"align": ["wide", "full"],
  	"spacing": { "margin": true, "padding": true }
  }
  ```

  Omitting `anchor` / `align` / `spacing` is **forbidden** — this is the fixed design system baseline (checked by the validator: [validation-core-rules.md#supports-section-baseline](guides/validation-core-rules.md#supports-section-baseline)).
- **Child blocks** (have `ancestor`/`parent`): `{ "html": false, "reusable": false }`. `spacing` is optional and **only** if the root tag spreads `{...blockProps}`.
- `color` / `typography` — optional for any block (add as needed, do not force).
- ⚠️ As soon as `spacing` (or any of `border|color|typography|shadow|dimensions`) is declared, the [supports↔wrapper invariant](guides/validation-core-rules.md#supports-invariant) kicks in: the root of edit.js/save.js MUST spread `{...blockProps}`, and render.php — `$wrapper_attributes`.

**🏷️ Naming (`name` / `title`) — required for all blocks:**

- `name`: `{namespace}/{kebab-section-name}` — the bare section name in kebab-case, **WITHOUT a page/category prefix**. `integroflow/industries`, NOT `integroflow/home-industries`.
- `title`: a human-readable **bare section name** in Title Case, **WITHOUT a category/page prefix**. **`Industries`**, NOT `Home — Industries`, NOT `Home Industries`.
- **The category groups the block in the inserter — DO NOT duplicate it in `title`/`name`.** The category is set by the `category` field (from the config's `blockCategory`).
- SHOULD: avoid a redundant "Block"/"Section" suffix if it is not in the real section name (`Hero`, not `Hero Block`). If the word is part of the name (`final-cta` → `Final CTA`), keep it.

**🔁 Reusing common components (required):** before generating, read `{blocksDir}/common/.registry.json`. The role is already in the registry (button / h2 / icon-tile / badge / card…) → **reuse** the common block as an inner block (automatically, without asking). The role is not there → **propose promotion** (create it in `common/` + write it to the registry). One common block per role, variants through attributes. Full mechanism — [guides/innerblocks-composition.md → Common components](guides/innerblocks-composition.md#-common-components-registry-promotion-auto-reuse). Button variants (`default-button`: `buttonVariant` primary/secondary/… + sizes) are generated from the design system — [guides/button-variant-generation.md](guides/button-variant-generation.md), command `/generate-button-variants`. A post card listing (role `post-cards`) → reuse the server-side `{namespace}/post-card` through Query Loop; not in the project → scaffold from `templates/post-card/` + the generator fills in the markup/styles (+ a per-type `post-card-{type}.php`; the CPT MUST be registered) — [guides/post-cards-reuse.md](guides/post-cards-reuse.md).

**⚠️ Block.json does NOT contain:**

- `editorScript`, `editorStyle`, `style`, `viewScript` — styles and scripts are included through `index.js` (see section 8.1)
- The Webpack manifest handles the build and enqueuing itself — `block.json` stays metadata and attributes

---

## 8.1 Index.js — the single registration point

ALL block styles and scripts are imported through `index.js`. This is the only required file template:

```javascript
/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';
import metadata from './block.json';

/**
 * Block styles
 */
import './style.scss';
import './editor.scss';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
	save,
});
```

**Rules:**

1. **Both `style.scss` and `editor.scss` are imported here** — even if editor.scss is minimal
2. **Never specify these styles in `block.json`** (`editorStyle`/`style` are absent)
3. Import order: WordPress dependencies → Internal dependencies → Block styles → registerBlockType
4. Front-end interactivity (slider, accordion, tabs) — **per the project's `frontendJs` convention** (see §8.1-bis below), NOT automatically through a per-block `view.js`. ⚠️ The claim "wp-scripts builds `view.js` on its own" is true only if the project's build actually adds block-level entries; in many themes (e.g. `entry` spreads `...defaultConfig.entry` into nothing, only `render.php` is copied) a per-block `view.js` **is not compiled** — front-end JS lives in the shared bundle. Check the config, do not assume.

---

## 8.1-bis Frontend JS: the `frontendJs` convention (shared bundle vs per-block view)

Where a block's front-end JavaScript lives (slider init, accordion, tabs) is **a property of the project, not of the block**. It is defined by the `frontendJs` key in `src/.claude/config.json` (or detected from the build):

```jsonc
"frontendJs": {
  "strategy": "shared-bundle" | "per-block-view",
  "entry": "src/custom-frontend.js",   // shared-bundle: the project's single front-end bundle
  "modulesDir": "src/js"               // shared-bundle: where to put a rare block-specific module
}
```

**Detection if the key is missing** (best-effort, in order of reliability):
- `webpack.config.js`: there is an explicit frontend entry (e.g. `custom-frontend`/`frontend`) and `entry` does NOT build per-block `view.js` (`...defaultConfig.entry` spreads into nothing, only `render.php` is copied) → **`shared-bundle`**.
- Otherwise, if `viewScript`/`view.js` are actually picked up by the build → `per-block-view`.
- Ambiguous → ask the user (`AskUserQuestion`), do not assume.

**Rules by strategy:**

| | `shared-bundle` (e.g. a single `custom-frontend.js`) | `per-block-view` |
|---|---|---|
| `viewScript` in `block.json` | **DO NOT emit** | allowed (`file:./view.js`) — if that is the project's practice |
| per-block `view.js` | **DO NOT create** (it will not compile) | create it next to `index.js` |
| Where the block's unique JS goes | a rare module → `modulesDir`, included from `entry` | per-block `view.js` |
| Structure from the agent | save.js + hook classes (`__track`/`slider-button--prev`…); the user writes the init | the same + optionally `view.js` itself |

**Preference: a block RARELY needs its own JS.** First look for a shared module/initializer in `entry`/`modulesDir` and reuse it through hook classes. A dedicated JS module only if the behavior is truly unique; then (shared-bundle) put it in `modulesDir` and include it in the shared `entry`, and do **not** create per-block `view.js` files.

> This is a shared layer: listing sliders (§3-bis of post-cards-reuse) and any interactive sections follow this convention. The modes (`create-block`, `convert-react-page`, `convert-html`) only reference this section.

---

## 8.2 Color and gradient — through theme settings (`useSettings`)

Colors and gradients in `<InspectorControls>` come from the theme settings (theme.json), **not** from a block-specific palette or `design-tokens.json`. The choice of control depends on the role of the value:

**🔴 FORBIDDEN:** `PanelColorSettings`, `PanelColorGradientSettings`, `__experimentalPanelColorGradientSettings`, `ColorGradientSettingsDropdown`, any homemade color control abstractions/wrappers, a hardcoded array `colors={[{name,color}]}`, the deprecated `useSetting` (singular). Only the patterns below (regular color → `ColorPalette`; fill → `TabPanel`+`ColorPalette`+`GradientPicker`).

### Regular color (text, border, icon color, etc.) → `ColorPalette`

```javascript
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import { PanelBody, ColorPalette } from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
	const { textColor } = attributes;

	// Color palette from theme settings
	const [themeColors] = useSettings('color.palette');
	const colorPalette = [...(themeColors || [])];

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Colors', 'textdomain')}>
					<ColorPalette
						colors={colorPalette}
						value={textColor}
						onChange={(value) => setAttributes({ textColor: value || '#000000' })}
					/>
				</PanelBody>
			</InspectorControls>
			{/* ... */}
		</>
	);
}
```

### Background fill (background) → `TabPanel` + `ColorPalette` + `GradientPicker` (color OR gradient)

If a block element has an editable **background fill**, DO NOT offer only a color — offer a color/gradient choice, so that both the colors and the gradients of the theme's design system are available. Implement it with **explicit primitives**: `TabPanel` ("Color"/"Gradient" tabs) + `ColorPalette` + `GradientPicker`. The fill is stored in a single CSS variable as `gradient || color` (the gradient wins).

**⚠️ DO NOT use `PanelColorGradientSettings`** — this composite component turned out to be unreliable in practice (the theme palette/gradients were not picked up/not rendered correctly). The working pattern is the primitives below.

```javascript
import { useBlockProps, InspectorControls, ColorPalette, useSettings } from '@wordpress/block-editor';
import { PanelBody, TabPanel, GradientPicker } from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
	const { backgroundColor, backgroundGradient } = attributes;

	const [themeColors] = useSettings('color.palette');
	const [themeGradients] = useSettings('color.gradients');

	// A single background value: the gradient takes priority over the color
	const background = backgroundGradient || backgroundColor;

	const blockProps = useBlockProps({
		className: 'block-name',
		style: background ? { '--ns-bg-color': background } : undefined,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Background', 'textdomain')}>
					<TabPanel
						tabs={[
							{ name: 'color', title: __('Color', 'textdomain') },
							{ name: 'gradient', title: __('Gradient', 'textdomain') },
						]}
						initialTabName={backgroundGradient ? 'gradient' : 'color'}
					>
						{(tab) =>
							tab.name === 'gradient' ? (
								<GradientPicker
									value={backgroundGradient || undefined}
									gradients={themeGradients || []}
									onChange={(value) => setAttributes({ backgroundGradient: value, backgroundColor: undefined })}
								/>
							) : (
								<ColorPalette
									value={backgroundColor}
									colors={themeColors || []}
									onChange={(value) => setAttributes({ backgroundColor: value, backgroundGradient: undefined })}
								/>
							)
						}
					</TabPanel>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>{/* ... */}</div>
		</>
	);
}
```

**Key points of the gradient fill:**

- Imports: `ColorPalette` + `useSettings` from `@wordpress/block-editor`; `PanelBody` + `TabPanel` + `GradientPicker` from `@wordpress/components`.
- `TabPanel` — a render function `{(tab) => …}`; `initialTabName` = `backgroundGradient ? 'gradient' : 'color'` (open the active tab). `GradientPicker` gets `gradients={themeGradients || []}`, `ColorPalette` — `colors={themeColors || []}` (directly from `useSettings`, without an intermediate spread).
- Two attributes in `block.json`: `backgroundColor` + `backgroundGradient` (both `{ "type": "string" }`). Each `onChange` writes its own value and **clears the other one** (`undefined`), so `gradient || color` is unambiguous.
- SCSS does not change: `background: var(--ns-bg-color)` renders both a color and a gradient. The variable's default fallback is a theme alias.
- The same value `background = backgroundGradient || backgroundColor` is duplicated in `save.js`.
- The gradient control is ALWAYS present for fills — the list comes from `useSettings('color.gradients')` (the theme's design system). Nothing needs to be "specified at generation time".
- *(Option for a fill on the block ROOT)*: instead of a custom control you can declare the native `supports.color: { gradients: true }` — WP renders the control on the root wrapper itself. NOT suitable if the fill is on a nested element (then use the pattern above).

**Why (for both patterns):**

- Colors/gradients are synced with the WordPress theme (theme.json) — the user changes the palette in one place
- CSS Custom Properties in SCSS take design values from **the theme's `theme.json` through short aliases** (`var(--primary)`, `var(--ink)`, `var(--space-lg)`, `var(--radius-md)`…), and NOT from `design-tokens.json` (it is retired) and NOT from raw `--wp--preset--*`
- We do not hardcode an array of colors/gradients into the block's JS code — that causes drift from the theme
- A single pattern in all blocks → predictability for the validator/fixer

> 📝 **`textdomain` in the examples is a PLACEHOLDER.** Strings like `'textdomain'` or `'integroflow'` in code examples stand for the specific project's `config.textdomain` value. DO NOT copy the literal from the example — always substitute the real `textdomain` from `src/.claude/config.json`.

> 🎨 **Token contract (required for all blocks):** the value exists in `theme.json` → `var(--{alias})`, otherwise hardcode. No raw `--wp--preset--*` and no custom `--color-*`/`--radius-pill`. The full alias catalog, name derivation rules and the legacy denylist are in [guides/css-custom-properties.md](guides/css-custom-properties.md).

---

## 8.3 Checking APIs through context7 (required when unsure)

context7 (MCP) is connected always-on. **Whenever you are unsure about a library API — especially the `@wordpress/*` data layer (`@wordpress/data`, `@wordpress/core-data`) and third-party packages — check it through context7 BEFORE writing code**, do not write from memory. Imports, store export names, selector/action signatures and component options change between versions. (The API key lives in `.mcp.json` — do not duplicate it anywhere.)

**Short list of common WP gotchas** (the build does NOT catch them — they are runtime undefined values, the editor crashes):

- `@wordpress/core-data` exports the store as **`store`**, not `coreStore`. The import MUST be:
  ```javascript
  import { store as coreStore } from '@wordpress/core-data';   // ✅
  // import { coreStore } from '@wordpress/core-data';          // ❌ undefined at runtime
  ```
  Alternative without an import — a string id: `useSelect( ( select ) => select( 'core' ).getEntityRecords(...) )`.
- `useSelect`/`useDispatch` — from `@wordpress/data` (not from `@wordpress/core-data`).
- `useSettings` (plural) — the current replacement for the deprecated `useSetting`; returns an array (`const [v] = useSettings('color.palette')`).

If you have doubts about any of this or about an unfamiliar API — **ask context7**, then write.

---

---

## 9. Common Patterns

### Pattern: Section with Content + Grid of Items

```javascript
const TEMPLATE = [
	// Content area
	[
		'core/group',
		{ className: 'section__content' },
		[
			['core/heading', { level: 1, content: 'Section Title' }],
			['core/paragraph', { content: 'Section description' }],
			['namespace/button', { text: 'CTA Button' }],
		],
	],
	// Items grid
	[
		'core/group',
		{ className: 'section__grid' },
		[
			[
				'namespace/item',
				{
					/* props */
				},
			],
			[
				'namespace/item',
				{
					/* props */
				},
			],
			[
				'namespace/item',
				{
					/* props */
				},
			],
		],
	],
];
```

### Pattern: Repeatable Item with Icon + Content

```javascript
// Item block edit.js
<div {...blockProps}>
	<div className='item__icon' style={{ color: iconColor }}>
		{icon}
	</div>
	<div className='item__content'>
		<InnerBlocks
			template={[
				['core/heading', { level: 3, placeholder: 'Title' }],
				['core/paragraph', { placeholder: 'Description' }],
			]}
			allowedBlocks={['core/heading', 'core/paragraph']}
			templateLock={false}
		/>
	</div>
</div>
```

---

## 10. Key Rules Summary

1. ✅ **Always use InnerBlocks** for text content, never RichText
2. ✅ **Use core blocks** (core/heading, core/paragraph) in templates
3. ✅ **Separate complex blocks** into parent + child blocks
4. ✅ **Use Context API** for parent-child communication
5. ✅ **Use core/group** to organize template structure
6. ✅ **Set parent property** in child block.json
7. ✅ **Pass inner content** as third parameter in templates
8. ✅ **Keep edit and save** markup identical for InnerBlocks
9. ✅ **Use useBlockProps** for proper block wrapper
10. ✅ **Set templateLock={false}** to allow content editing
11. ✅ **Import styles in index.js** (`./style.scss`, `./editor.scss`) — never via `editorStyle`/`style` in block.json
12. ✅ **ColorPalette colors from `useSettings('color.palette')`** — synchronized with theme.json, not hardcoded

---

## When to Use This Approach

✅ Use for:

- Blocks with editable text content
- Complex layouts with repeatable components
- Sections with cards/features/items
- Blocks that need flexible content management

❌ Don't use for:

- Simple static blocks with no content
- Blocks with only media/images
- Pure layout/wrapper blocks

---

## Complete Example Reference

See these files for complete working example:

- Parent: `src/blocks/about-section/edit.js`
- Child: `src/blocks/feature-card/edit.js`
- Structure: Nested InnerBlocks with core blocks
- Communication: Context API for shared values

This approach ensures maximum flexibility, WordPress native editing experience, and maintainable code structure.
