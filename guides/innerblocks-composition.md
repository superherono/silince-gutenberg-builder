# InnerBlocks Composition Pattern

**Version: 1.0.0** | Last updated: 2026-01-11

A guide to using InnerBlocks to build composite and reusable blocks.

---

## 🎯 When to use InnerBlocks vs Array Attributes

### ✅ Use InnerBlocks if:

- **Repeating elements** (features, testimonials, team members, cards)
- **Independent settings are needed** for each element
- **Drag & Drop** for reordering elements
- **Dynamic adding/removing** of elements by the user
- **Reuse** of blocks in different contexts
- **Complex structure** of each element (several fields, nesting)

**Example use cases:**

- Features list (about-us block with 4+ features)
- Testimonials carousel
- Team members grid
- FAQ accordion
- Pricing tables
- Gallery items

### ❌ Use Array Attributes if:

- **Fixed number** of elements (not changed by the user)
- **Simple structure** (1-2 string fields)
- **No independent settings needed** for each element
- **No need for reuse**
- **Control through InspectorControls** is enough

**Example use cases:**

- Social links (3-4 fixed links) — a fixed STRUCTURE through array attributes is OK; but render the icon itself through the sprite (`SpriteIcon` from the manifest), and DO NOT hardcode SVG/enum. See [icon-system.md](icon-system.md)
- Stats counters (3 fixed values)
- Simple tags/badges (short text labels)

---

## 🔁 Common components: registry, promotion, auto-reuse

A cross-cutting generation principle (applies in ALL modes — `create-block`, `convert-html`, `convert-react-page`): **reusable primitives and molecules live in `common/` once and are reused**, instead of being duplicated per page.

### Two operations — DO NOT confuse them

| Operation | Who initiates | Ask the user? |
|---|---|---|
| **Promotion** — first extraction of an element/section into `common/` + a registry entry | the agent detects the role and **proposes**, the user decides | yes |
| **Reuse** — the role is already in the registry → insert as an inner block | the agent, **automatically** | no |

The registry is **filled manually** (lazily, as elements appear) and **used automatically**. No pre-scan of the whole page — it works for a single block too.

### Registry `{blocksDir}/common/.registry.json`

A persistent manifest of common blocks. It lives in the project (not in the plugin), is shared by all commands, and persists across sessions and chats.

```jsonc
{
  "blocks": {
    "default-button": { "kind": "primitive", "roles": ["button", "link-cta"], "dir": "common/default-button" },
    "custom-heading": { "kind": "primitive", "roles": ["h2"], "dir": "common/custom-heading" },
    "icon-tile":      { "kind": "primitive", "roles": ["icon-tile"], "dir": "common/icon-tile" },
    "badge":          { "kind": "primitive", "roles": ["badge", "tag", "eyebrow"], "dir": "common/badge" },
    "card":           { "kind": "primitive", "roles": ["card"], "dir": "common/card" },
    "process-step":   { "kind": "molecule",  "roles": ["step"], "dir": "common/process-step" },
    "post-card":      { "kind": "dynamic",   "roles": ["post-cards", "post-list"], "dir": "post-card" },
    "faq":            { "kind": "section", "component": "FAQ", "variants": ["stack", "split"], "variantMechanism": "attribute", "dir": "common/faq" }
  }
}
```

- WP block name for `allowedBlocks` = `{namespace}/{key}` (the object key).
- `dir` — path relative to `blocksDir` (default `common/{key}`); used to check that the block exists on disk.
- `kind`: `primitive` (atom) | `molecule` (composite) | `section` (a whole section) | `dynamic` (server-side listing through Query Loop, e.g. `post-card`).
- `roles`: semantic roles the agent uses to match a source element to this common block.
- `component` (opt., for `kind: section`): the name from the design source's `data-component` (checked against the input registry COMPONENTS.md).
- `variants` (opt.): which component variants are **implemented** on disk (extended by retrofit when a new `data-component-variant` is encountered).
- `variantMechanism` (opt.): `attribute` | `block-style` | `variations` — how the variant is emitted in the block. Contract: [component-registry.md](component-registry.md).

### Catalog of primitive roles

`button` · `h2` (→ ALWAYS `custom-heading`) · `icon-tile` · `badge`/`tag`/`eyebrow` · `card`. Molecules (`process-step`, `trust-strip`, `routing-card`) — "ask with a default".

**Dynamic role `post-cards`** (a listing of posts, NOT a static `card`): a section with post cards → reuse the server-side block `{namespace}/post-card` through the native Query Loop (+ generate a per-type template if needed). Separate contract — [post-cards-reuse.md](post-cards-reuse.md). Distinguish it from a static feature grid (role `card`).

**One common block per ROLE. Variants — through attributes/blockStyles, NOT new blocks.** `<button>`/`PrimaryBtn`/`GhostBtn` → one `default-button` with the attribute `variant: primary|ghost`, not three blocks.

### Lifecycle during block generation

1. Read the registry (no file → treat it as empty).
2. Detect source elements by role (button, h2, icon-tile, badge, card…).
3. For each one:
   - **the role IS in the registry** → check that the folder (`dir`) exists on disk (**the registry is a hint, the disk is the truth**). It exists → **reuse silently** through an inner block. It does not → warn, and offer to recreate it or remove the entry.
   - **the role is NOT in the registry** → **propose promotion** (see below). If the user did not select it, keep the element inline / as a core block.
4. In the summary, list what was reused and what was promoted.

### Promotion (extraction) — the heaviest operation

Promotion = moving an element out into a standalone common block:
1. Create `{blocksDir}/common/{name}/` with the full set (block.json + index.js + edit.js + save.js + style.scss + editor.scss). The primitive's content also goes through InnerBlocks (same rules); media and non-editable meta (icon name, toggle) go into attributes.
2. `block.json`: `ancestor: [...]` (NOT `parent` — it usually sits inside a nested `core/group`), `usesContext` if needed.
3. Replace the markup in the source block with a reference through InnerBlocks (`allowedBlocks: ['{ns}/{name}']` + a seed in the template).
4. Write to `{blocksDir}/common/.registry.json`: key `name`, `kind`, `roles`, `dir`.

For the button, promotion is already automated (`templates/button/` + Button Template System) — use it, do not recreate it by hand.

### Reuse-by-role ≠ blind reuse (variant vs new)

If a detected element differs in fields/structure from the common block of the same role (for example a `card` with a different set of fields), it is a **variant**, NOT a silent reuse. Ask: add a variant attribute / blockStyle to the existing common block · create a new common block · keep it inline.

### Common sections (whole sections)

For a SECTION block (not a primitive), ask for the group: `common / {page} / new`. `common` → put it in `{blocksDir}/common/{name}/` and write it to the registry (`kind: section`).

Section reuse has **different** semantics: through the inserter/category, not an inner block — the page author inserts the section on a new page themselves. The agent's job is **not to create a duplicate**: if the registry already has `common/{name}`, when a similar section is requested say "it already exists, use it" instead of generating a second one. (If you need "one edit → changes everywhere", that is a WP synced pattern, a different mechanism.)

### Common sections from COMPONENTS.md (identity + variants)

When there is an input registry `COMPONENTS.md` (the design source marks sections with `data-component`), the "page / common" decision and the component's identity **are taken from it**, not guessed. Full contract — [component-registry.md](component-registry.md). Key points for composition:

- **One `data-component` = one common block**, even if the instances on pages look different — the differences are expressed as **variants** (`data-component-variant`), not separate blocks. This is the same "one block per role, variants through attributes" principle as for primitives (the button), raised to the section level.
- **A variant-capable block is required for a shared component.** The mechanism depends on the nature of the variant (hybrid): visual/layout → the `variant` attribute (+ `ToggleGroupControl`) or `block-style`; structural (a different inner skeleton) → `variations` in block.json (chosen on insert).
- **Incremental retrofit:** conversion goes one page at a time → the first time a component is encountered, only the variant seen is implemented (the block is made variant-capable); the next time the same `data-component` is encountered with a new `data-component-variant`, **the variant is added to the existing block**, no duplicate is created. The registry's `variants[]` is extended.
- **Shared CSS classes** from the COMPONENTS.md entry (`.who-grid`, `.who-card`…) are the block's canonical class names (parity across pages); the block owns them (styles in `style.scss`), this is NOT the "universal class → empty BEM selector" case.

### AskUserQuestion wording

- **Primitive promotion** (role not in the registry), multiSelect: "Reusable elements found: [button] [icon-tile]. Move them to `common/` (create + reuse)?" — the selected ones are promoted, the rest stay inline/core.
- **Variant** (fields differ), single: "Element {role} differs from `common/{name}`: add a variant attribute / new block / keep inline?"
- **Section group**, single: "Group for section {name}: common / {page} / new?"

---

## 🔄 Composition patterns

### Pattern 1: Parent-Child blocks (Recommended)

**When to use:** Repeating elements with independent editing

---

## 🔴 CRITICAL LIMITATION: ONE InnerBlocks PER BLOCK

**WordPress Gutenberg allows ONLY ONE `<InnerBlocks>` component per block.**

This is a hard technical limitation. If you need several content areas:
1. **Use `core/group` in the template** — group sections inside ONE InnerBlocks
2. **Create child blocks** — each child can have its own InnerBlocks

---

#### Structure:

```
blocks/
├── about-us/                    # Parent block
│   ├── block.json
│   ├── edit.js                  # ONE InnerBlocks with a template
│   ├── save.js                  # ONE InnerBlocks.Content
│   └── style.scss
└── feature-card/                # Child block (its own InnerBlocks)
    ├── block.json
    ├── edit.js
    ├── save.js
    └── style.scss
```

#### Parent block (about-us/edit.js):

```javascript
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

// ✅ CORRECT: One InnerBlocks with core/group for sections
const TEMPLATE = [
	['core/heading', { level: 2, content: 'Our Features' }],
	['core/group', { className: 'block-about-us__features', layout: { type: 'flex' } }, [
		['namespace/feature-card', { icon: 'shield-tick' }],
		['namespace/feature-card', { icon: 'check' }],
		['namespace/feature-card', { icon: 'star' }],
	]],
	['core/group', { className: 'block-about-us__actions' }, [
		['core/button', { text: 'Learn More' }],
	]],
];

export default function Edit({ attributes }) {
	const blockProps = useBlockProps({ className: 'block-about-us' });

	return (
		<section {...blockProps}>
			<div className='block-about-us__container'>
				{/* ✅ ONE InnerBlocks — structure through the template, WITHOUT templateLock/allowedBlocks by default */}
				<InnerBlocks template={TEMPLATE} />
			</div>
		</section>
	);
}
```

#### Parent block (about-us/save.js):

```javascript
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const blockProps = useBlockProps.save({ className: 'block-about-us' });

	return (
		<section {...blockProps}>
			<div className='block-about-us__container'>
				{/* ✅ ONE InnerBlocks.Content */}
				<InnerBlocks.Content />
			</div>
		</section>
	);
}
```

---

### ❌ ANTI-PATTERN: Multiple InnerBlocks

```javascript
// ❌ WRONG — will cause a WordPress error!
<div className='section-1'><InnerBlocks template={TEMPLATE_1} /></div>
<div className='section-2'><InnerBlocks template={TEMPLATE_2} /></div>

// ❌ WRONG in save.js!
<InnerBlocks.Content />  {/* first */}
<InnerBlocks.Content />  {/* second — DOES NOT WORK */}
```

---

## 🔓 Nested grid wrappers: 3-part unlock pattern

> ⚠️ **Applicability guard.** This pattern is needed ONLY when the root `<InnerBlocks>` has an explicit `templateLock="all"`. By default the plugin does not set `templateLock`/`allowedBlocks` on the root — there is nothing to lock and nothing to inherit, so **the 3-part unlock is not needed**. See [validation-core-rules.md#innerblocks-defaults](validation-core-rules.md#innerblocks-defaults).
>
> Apply the pattern only if `userChoices` / the brand brief explicitly require locking the parent's structure (label / title / grid / footer must stay unchanged).

**Context:** The parent block uses `templateLock="all"` on the outer `<InnerBlocks>` (to lock the structural sections — label / title / grid / footer) and seeds child blocks inside a **nested `core/group`** (a typical grid wrapper). The user sees the seeded children but **cannot add a new child in the editor**, even if the design leaves the count open (industries, cases, testimonials, faq, etc.).

**Symptom from the user's side:** the seeded children are displayed, but the inserter inside the nested grid does not show your child block — you have hit this trio.

### Three causes of the bug (all three must be fixed together)

1. **`templateLock` propagates down** through React context from the outer `<InnerBlocks templateLock="all">` to **all** nested InnerBlocks (including the implicit InnerBlocks inside `core/group`). The nested grid inherits the lock until `templateLock: false` is explicitly set on the `core/group` itself.

2. **No `allowedBlocks` on the nested `core/group`.** Without an explicit allowlist on the nested group, the inserter inside the group does not know which blocks are valid — it falls back to broad defaults or to an empty list.

3. **`parent` is too strict.** `parent: ["namespace/about-X"]` in the child block.json is a **strict** check of the immediate parent. When the child is nested inside `core/group`, its immediate parent is `core/group`, **NOT** `about-X`. So `parent` blocks insertion. Fix: `ancestor: ["namespace/about-X"]` — allows the child anywhere inside the about-X tree.

### ✅ Canonical fix (apply all three parts at the same time)

**Parent edit.js:**

```javascript
const TEMPLATE = [
    ['core/heading', { level: 6, /* label */ }],
    ['integroflow/custom-heading', { level: 2, /* H2 title */ }],
    ['core/group',
        {
            className: 'block-X__grid',
            templateLock: false,                          // (1) override of the inherited 'all'
            allowedBlocks: ['integroflow/about-X-tile'],  // (2) whitelist for the inserter
        },
        TILE_SEEDS.map(seed => ['integroflow/about-X-tile', seed]),
    ],
    ['core/group', { className: 'block-X__footer' }, [/* paragraph + CTA */]],
];

return (
    <section {...blockProps}>
        <div className="block-X__container">
            <InnerBlocks template={TEMPLATE} templateLock="all" />
        </div>
    </section>
);
```

**Child block.json:**

```json
{
    "name": "integroflow/about-X-tile",
    "ancestor": ["integroflow/about-X"],   // (3) — NOT "parent"
    "attributes": { /* ... */ }
}
```

### ⚠️ Exception: fixed count (DO NOT apply the unlock)

If the brief **explicitly fixes** the number of children (for example `what-we-do = exactly 2 cards: web + automation`, or `cards: { count: 2, fixed: true }` in `userChoices` / `brandBrief.variantDecisions`), the lock is intentional. In this case:

- **DO NOT** override `templateLock` on the nested group (inherit `'all'` from the parent)
- **Keep** `parent: [...]` (strict — that is exactly what is needed)
- **Omit** `allowedBlocks` on the group

The signal "the brief declares exactly N children" is an instruction **NOT** to apply the unlock pattern.

### 📌 When to use `parent` vs `ancestor`

| Scenario | block.json |
|---|---|
| Child is a **direct** child of the parent block (no nested `core/group` wrapper) | `"parent": ["ns/parent"]` |
| Child is nested inside `core/group` or another wrapper inside the parent | `"ancestor": ["ns/parent"]` |
| The brief fixes the count → the lock is intentional | `"parent": ["ns/parent"]` (even if there is a group wrapper — the lock is the goal) |

---

#### Child block (feature-card/block.json):

> 🎯 **Icons:** when `iconSystem` (sprite) is active, the `icon` attribute has NO `enum` (`default` = an id from the manifest), and edit.js/save.js render `<SpriteIcon name={icon}/>` with a grid picker built from `icons.manifest.json`. The `SelectControl` + `{icon === 'shield-tick' && <svg>…}` example below is **legacy for themes WITHOUT a sprite**; when `iconSystem` is active it is forbidden. Full contract — [icon-system.md](icon-system.md).

> **ℹ️ Context:** this example shows the pattern with `parent: [...]` — it is **correct** for the case in Pattern 1 (about-us/edit.js above): there the child blocks sit DIRECTLY inside `core/group` without an outer `templateLock="all"` (the parent template uses `templateLock={false}`). When the outer lock is `"all"`, use `ancestor` (see the section [🔓 Nested grid wrappers: 3-part unlock pattern](#-nested-grid-wrappers-3-part-unlock-pattern)).

```json
{
	"$schema": "https://schemas.wp.org/trunk/block.json",
	"apiVersion": 3,
	"name": "namespace/feature-card",
	"title": "Feature Card",
	"category": "content",
	"parent": ["namespace/about-us"],
	"attributes": {
		"icon": {
			"type": "string",
			"default": "shield-tick"
		},
		"title": {
			"type": "string",
			"default": ""
		},
		"description": {
			"type": "string",
			"default": ""
		}
	},
	"supports": {
		"html": false
	}
}
```

#### Child block (feature-card/edit.js):

```javascript
import { __ } from '@wordpress/i18n';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
	const { icon, title, description } = attributes;

	const blockProps = useBlockProps({
		className: 'wp-block-namespace-feature-card',
	});

	const iconOptions = [
		{ label: 'Shield Tick', value: 'shield-tick' },
		{ label: 'Check', value: 'check' },
		{ label: 'Star', value: 'star' },
		{ label: 'Lock', value: 'lock' },
	];

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Icon Settings', 'textdomain')}>
					<SelectControl label={__('Icon', 'textdomain')} value={icon} options={iconOptions} onChange={(value) => setAttributes({ icon: value })} />
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<div className='block-feature-card__icon'>
					{/* SVG icon based on icon */}
					{icon === 'shield-tick' && <svg>...</svg>}
					{icon === 'check' && <svg>...</svg>}
				</div>

				<div className='block-feature-card__content'>
					<RichText tagName='h3' className='block-feature-card__title' value={title} onChange={(value) => setAttributes({ title: value })} placeholder={__('Feature title...', 'textdomain')} />

					<RichText tagName='p' className='block-feature-card__description' value={description} onChange={(value) => setAttributes({ description: value })} placeholder={__('Feature description...', 'textdomain')} />
				</div>
			</div>
		</>
	);
}
```

**Benefits:**

- ✅ Each feature is edited independently
- ✅ Drag & Drop for reordering
- ✅ Adding/removing through the UI
- ✅ Reuse of feature-card in other blocks
- ✅ Clean separation of concerns

**Token savings:**

- The parent block does not hold a features array in attributes
- The parent block does not hold logic for managing features
- InnerBlocks manages the state automatically

---

### Pattern 2: Array Attributes (Simple approach)

**When to use:** Simple fixed lists

#### Structure:

```
blocks/
└── stats-counter/
    ├── block.json          # Contains features: array
    ├── edit.js             # Editing through InspectorControls
    ├── save.js
    └── style.scss
```

#### block.json:

```json
{
	"attributes": {
		"stats": {
			"type": "array",
			"default": [
				{ "number": "100+", "label": "Clients" },
				{ "number": "50+", "label": "Projects" },
				{ "number": "10", "label": "Years" }
			]
		}
	}
}
```

#### edit.js:

```javascript
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit({ attributes, setAttributes }) {
	const { stats } = attributes;

	const updateStat = (index, field, value) => {
		const newStats = [...stats];
		newStats[index][field] = value;
		setAttributes({ stats: newStats });
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Stats', 'textdomain')}>
					{stats.map((stat, index) => (
						<div key={index}>
							<TextControl label={__(`Stat ${index + 1} Number`, 'textdomain')} value={stat.number} onChange={(value) => updateStat(index, 'number', value)} />
							<TextControl label={__(`Stat ${index + 1} Label`, 'textdomain')} value={stat.label} onChange={(value) => updateStat(index, 'label', value)} />
						</div>
					))}
				</PanelBody>
			</InspectorControls>

			<div className='block-stats-counter'>
				{stats.map((stat, index) => (
					<div key={index} className='block-stats-counter__item'>
						<span className='block-stats-counter__number'>{stat.number}</span>
						<span className='block-stats-counter__label'>{stat.label}</span>
					</div>
				))}
			</div>
		</>
	);
}
```

**Drawbacks:**

- ❌ Editing only through the sidebar
- ❌ No drag & drop
- ❌ Fixed number of elements
- ❌ Cannot be reused in other blocks

---

## 🔘 Special case: Buttons

### ⚠️ CRITICAL: Buttons ALWAYS go through InnerBlocks!

**NEVER create custom `<a>` elements for buttons!**

#### ❌ WRONG:

```javascript
// DO NOT GENERATE code like this!
<a className='block-about-us__button' href={buttonUrl} onClick={(e) => e.preventDefault()}>
	<RichText tagName='span' value={buttonText} onChange={(value) => setAttributes({ buttonText: value })} />
</a>
```

**Problems:**

- Code duplication (each block implements the button again)
- Inconsistent UI/UX
- Hard to maintain (changes have to be made in every block)
- Token cost (~8,000 tokens per button)

#### ✅ CORRECT: Check and use InnerBlocks

```javascript
// 1. Check the registry common/.registry.json (role 'button') + verify that dir exists on disk
const hasCustomButton = /* registry has role 'button' && its dir exists on disk */;

// 2. Use the matching allowedBlocks
<div className="block-about-us__actions">
    <InnerBlocks
        allowedBlocks={[
            hasCustomButton ? 'namespace/default-button' : 'core/button'
        ]}
        template={[
            [hasCustomButton ? 'namespace/default-button' : 'core/button', {
                buttonText: 'Learn More',
                buttonUrl: '#'
            }]
        ]}
    />
</div>
```

**Benefits:**

- ✅ Reuse of a ready-made block
- ✅ A single style for all buttons
- ✅ Easy maintenance (changes in one place)
- ✅ Saves ~8,000 tokens

---

## 📋 Generator checklist

### Before generating a block:

- [ ] **Identify repeating elements** (features, cards, items)
- [ ] **Ask the user:** InnerBlocks or Array?
- [ ] **Check for button/link** elements
- [ ] **Read `{blocksDir}/common/.registry.json`** — which roles are already available for auto-reuse (see "Common components")

### When generating a Parent block:

- [ ] **Use InnerBlocks** — `<InnerBlocks template={TEMPLATE} />` without `allowedBlocks` and `templateLock` on the root by default (see [#innerblocks-defaults](validation-core-rules.md#innerblocks-defaults))
- [ ] **Define a template** for the initial structure
- [ ] **DO NOT add an array** to attributes (for the InnerBlocks pattern)
- [ ] **Use orientation** (horizontal/vertical) if needed

### When generating a Child block:

- [ ] **Create a separate folder** blocks/child-block/
- [ ] **Add parent** to block.json (optional)
- [ ] **Isolated attributes** for the child block
- [ ] **RichText for direct editing** of text in the block

### For buttons:

- [ ] **ALWAYS check the registry** `common/.registry.json` (role `button` → `default-button`); reuse only if `dir` exists on disk
- [ ] **USE InnerBlocks** with allowedBlocks
- [ ] **DO NOT create custom `<a>`** elements
- [ ] **DO NOT add buttonText/buttonUrl** to the parent block's attributes

---

## 🎯 Block examples

### Example 1: Testimonials with InnerBlocks

```
blocks/
├── testimonials/              # Parent
│   └── edit.js: <InnerBlocks allowedBlocks={['namespace/testimonial-item']} />
└── testimonial-item/          # Child
    ├── attributes: { author, quote, avatar }
    └── edit.js: RichText for quote, MediaUpload for avatar
```

### Example 2: Team Grid with InnerBlocks

```
blocks/
├── team-grid/                 # Parent
│   └── edit.js: <InnerBlocks allowedBlocks={['namespace/team-member']} />
└── team-member/               # Child
    ├── attributes: { name, role, bio, photo }
    └── edit.js: RichText for texts, MediaUpload for the photo
```

### Example 3: FAQ with InnerBlocks

```
blocks/
├── faq/                       # Parent
│   └── edit.js: <InnerBlocks allowedBlocks={['namespace/faq-item']} />
└── faq-item/                  # Child
    ├── attributes: { question, answer, isOpen }
    └── edit.js: RichText for question/answer, ToggleControl for isOpen
```

---

## 💡 Best practices

### 1. Naming Convention

- Parent block: `{feature-name}` (about-us, testimonials, team-grid)
- Child block: `{feature-name}-item` or `{feature-name}-card` (testimonial-item, feature-card)

### 2. Parent vs Ancestor in block.json

Binding a child to a parent — two scenarios (details in [🔓 Nested grid wrappers: 3-part unlock pattern](#-nested-grid-wrappers-3-part-unlock-pattern)):

**Scenario A — the child is a direct child of the parent (no nested group):**

```json
{
	"name": "namespace/feature-card",
	"parent": ["namespace/about-us"]
}
```

**Scenario B — the child is inside a nested `core/group` (most grid cases):**

```json
{
	"name": "namespace/feature-card",
	"ancestor": ["namespace/about-us"]
}
```

⚠️ If you use `parent` for case B, the child will NOT be insertable in the editor (the immediate parent is `core/group`, not `about-us`). Use `ancestor` for a transitive check. Exception: the brief explicitly fixes the count → `parent` is intentionally strict.

### 3. Template for the initial structure

Decide how many elements to create by default:

```javascript
template={[
    ['namespace/feature-card'],
    ['namespace/feature-card'],
    ['namespace/feature-card']
]}
```

### 4. Orientation for layout

```javascript
// Horizontal layout (flex-row)
orientation = 'horizontal';

// Vertical layout (flex-column)
orientation = 'vertical';
```

### 5. Template lock

```javascript
// Prevent adding/removing blocks
templateLock = 'all';

// Allow only reordering
templateLock = 'insert';
```

---

## 🚀 Token savings

### InnerBlocks approach:

- Parent block: ~300 lines
- Child block: ~150 lines
- **Total:** ~450 lines (reusable child)

### Array attributes approach:

- Monolithic block: ~500 lines
- **Total:** ~500 lines (NOT reusable)

### Benefit:

- When the child block is used in **2+ parent blocks**: ~50% savings
- Button through InnerBlocks: saves ~8,000 tokens per block
- Logic updates: **1 place** instead of N blocks

---

## ✅ Summary

**Use InnerBlocks when:**

- Flexibility is needed (adding/removing/reordering)
- Complex element structure
- Reuse in different contexts
- **ALWAYS for buttons!**

**Use Array when:**

- Fixed number of elements
- Simple structure (1-2 fields)
- No independent settings needed

**NEVER create custom buttons - only InnerBlocks!**
