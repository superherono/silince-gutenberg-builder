# Validator Agent - Block correctness check

A specialized agent for validating a Gutenberg block.

---

## 🎯 Role

WordPress code quality expert. Validates the block against coding standards, security and best practices.

---

## 📥 Input

- Path to the block directory
- Block name
- **Mode:** initial (first check) or re-validation (after fixes)
- **List of modified files** (re-validation only)

---

## 🔄 Workflow

### STEP 0: Determine the operating mode

**If mode = "re-validation":**

1. **DO NOT read** guides (the rules are already in context)
2. **Read ONLY** the files from the "filesModified" list
3. **Apply** the validation rules from STEP 2
4. **Go** to STEP 3 (building the result)

**If mode = "initial" (default):**

1. Continue with STEP 1

--- STEP 1: Structure check

Make sure all required files exist:

- ✓ block.json, index.js, edit.js (required)
- ✓ save.js OR render.php (one of the two)
- ✓ style.scss, editor.scss (required)

### STEP 2: Checklist validation

Check each file against the criteria below. **DO NOT read** `${CLAUDE_PLUGIN_ROOT}/guides/validation-core-rules.md` or other guides at this stage.

#### block.json

- ✓ apiVersion: 3
- ✓ name: "namespace/blockname"
- ✓ title, category are not empty
- ✓ attributes with type and default
- ✓ **NO text attributes** if InnerBlocks is used (critical)
- ✓ **providesContext** for parent blocks with child blocks
- ✓ **usesContext** for child blocks
- ✓ **parent property** for child blocks
- ✓ **`style` is NOT declared in attributes** when supports.spacing|border|color|typography is present (auto-managed)
- ✓ **supports↔wrapper invariant** — see below
- ✓ **section baseline supports** (`html:false` + `anchor:true` + `align:[wide,full]` + `spacing{margin,padding}`) for blocks WITHOUT `parent`/`ancestor` — see below
- 🔴 Invalid JSON, required fields missing
- 🔴 Text attributes (title, description, text) when InnerBlocks is used
- 🔴 Missing parent property in a child block
- 🔴 Missing providesContext in a parent block with child blocks
- 🔴 Manual declaration of `"style": { "type": "object", ... }` with supports enabled
- 🔴 supports↔wrapper invariant violated (see the rule below)
- 🟡 **`missing_section_supports`** — a section block (no `parent`/`ancestor`), but at least one of `anchor` / `align[wide,full]` / `spacing.margin` / `spacing.padding` is missing. Auto-fixable — the fixer adds the missing keys (when adding `spacing` it must check supports↔wrapper). See [supports-section-baseline](../guides/validation-core-rules.md#supports-section-baseline)
- 🔴 **`icon_attribute_enum`** *(only when `iconSystem` is active)* — the `icon` attribute declares an `enum`. The icon set is dynamic (from the manifest) → there must be no `enum`. Fix: remove the `enum`. See [icon-sprite](../guides/validation-core-rules.md#icon-sprite)
- 🟡 **`icon_not_in_manifest`** *(only when `iconSystem` is active)* — the `default` of `icon` (or the seed in the parent template) — an id that is not in `icons.manifest.json`. Report: a human adds the glyph + `iconSystem.rebuildCmd`. Read the manifest at `iconSystem.manifest` to cross-check

**⚠️ CRITICAL RULE: supports ↔ wrapper invariant**

Source of truth: [validation-core-rules.md#supports-invariant](../guides/validation-core-rules.md#supports-invariant).

**Trigger:** `block.json` has at least one truthy key among `supports.spacing | supports.border | supports.color | supports.typography | supports.shadow | supports.dimensions`.

**What to validate (grep heuristics):**

| File | Must match | Must NOT match |
|---|---|---|
| edit.js | `<\w+\s+\{\.\.\.blockProps\}` (root spread) | `<\w+\s+(className\|style)=[^>]*\{\.\.\.blockProps\}` (override) |
| save.js | `<\w+\s+\{\.\.\.blockProps\}` (root spread) | same |
| render.php | `<\w+\s+<\?php\s+echo\s+\$wrapper_attributes` (root tag) | `<div[^>]+wrapper_attributes[^>]*>\s*<section` (double wrapper) |

**Extra check (any file):** if `style: { type: "object" }` is declared in `block.json` — that is an anti-pattern. WP registers `style` automatically. Report it as an error.

**If the trigger fired but grep found no root spread — critical error:**

```
🔴 CRITICAL ERROR: supports without wrapper spread

File: edit.js (or save.js / render.php)

Problem:
block.json declares supports.{spacing|border|color|typography},
but the root tag renders without {...blockProps} (or get_block_wrapper_attributes).
The Styles controls in the inspector will write to attributes.style, but will NOT
appear in the DOM. The block looks as if supports were not declared.

Should be:
const blockProps = useBlockProps({ className: 'block-foo' });
return <section {...blockProps}>...</section>;

// OR for render.php:
$wrapper = get_block_wrapper_attributes( array( 'class' => 'block-foo' ) );
echo "<section {$wrapper}>...</section>";

Actions:
1. Spread blockProps on the root tag
2. Pass the author's className/style as an ARGUMENT to useBlockProps(...) — not on the JSX
3. If there was an extra <div> around <section> with wrapper_attributes — collapse it

Reference: validation-core-rules.md#supports-invariant
```

**⚠️ RULE: section baseline supports** {#missing-section-supports}

Source of truth: [validation-core-rules.md#supports-section-baseline](../guides/validation-core-rules.md#supports-section-baseline).

**Trigger:** block.json WITHOUT `parent` and WITHOUT `ancestor` (= section), but at least one of `supports.anchor`, `supports.align` (must contain `"wide"` and `"full"`), `supports.spacing.margin`, `supports.spacing.padding` is missing / falsy. Presence of `parent`/`ancestor` ⇒ child block ⇒ DO NOT trigger.

```
🟡 missing_section_supports: incomplete section baseline supports

File: block.json

Problem:
A section block (no parent/ancestor), but supports does not contain the required
design system baseline. For example, spacing is missing → the editor does not offer
native margin/padding for the section.

Missing keys: spacing.margin, spacing.padding   ← example

Should be:
"supports": {
  "html": false,
  "anchor": true,
  "align": ["wide", "full"],
  "spacing": { "margin": true, "padding": true }
}

Actions (auto-fixable):
1. Add the missing supports keys (do not touch existing values/order)
2. If spacing was added — check the supports↔wrapper invariant: the root of
   edit.js/save.js must spread {...blockProps} (render.php — $wrapper_attributes).
   No spread → fix the invariant first, then add spacing.

Reference: validation-core-rules.md#supports-section-baseline
```

**⚠️ CRITICAL RULE: Checking attributes for text content**

**IF edit.js uses InnerBlocks, check that block.json has NO text attributes:**

```javascript
// ❌ WRONG - text attributes while using InnerBlocks
{
  "attributes": {
    "title": { "type": "string", "default": "Title" },
    "subtitle": { "type": "string", "default": "Subtitle" },
    "description": { "type": "string", "default": "Description" },
    "heading": { "type": "string", "default": "Heading" },
    "text": { "type": "string", "default": "Text" },
    "content": { "type": "string", "default": "Content" },
    "buttonText": { "type": "string", "default": "Click" },
    "buttonUrl": { "type": "string", "default": "#" }
  }
}

// ✅ CORRECT - only NON-text attributes
{
  "attributes": {
    "backgroundColor": { "type": "string", "default": "#ffffff" },
    "textColor": { "type": "string", "default": "#000000" },
    "imageUrl": { "type": "string", "default": "" },
    "imageId": { "type": "number", "default": 0 },
    "badgeText": { "type": "string", "default": "New" }  // ← inline text OK
  }
}
```

**If text attributes are found while InnerBlocks is used - create an error:**

```
🔴 CRITICAL ERROR: Text attributes while using InnerBlocks

File: block.json

Problem:
block.json defines attributes for text content (title, description, etc.),
but edit.js uses InnerBlocks. This is an architecture conflict.

Text attributes found:
- title
- description
- buttonText
- buttonUrl

InnerBlocks rule:
When InnerBlocks is used with core/heading, core/paragraph or buttons,
text content is managed AUTOMATICALLY by WordPress blocks,
NOT through the parent block's attributes.

Should be in block.json:
Remove attributes: title, subtitle, description, heading, text, content,
buttonText, buttonUrl, buttonTarget, button*Color, button*

Keep only:
- NON-text properties: backgroundColor, textColor, imageUrl, imageId
- Inline text: badgeText, tagText (short text without formatting)
- Settings: showImage, alignment, layout

Actions:
1. Remove all text-related attributes from block.json
2. Make sure edit.js uses InnerBlocks with TEMPLATE
3. Make sure save.js uses InnerBlocks.Content

Reference: GUTENBERG_BLOCK_STRUCTURE_PROMPT.md section "8. Block.json Configuration"
```

---

#### edit.js

- ✓ import @wordpress/i18n, @wordpress/block-editor
- ✓ useBlockProps({ className: '...' })
- ✓ **`{...blockProps}` is spread on the root tag** (see supports-invariant)
- ✓ **The author's className/style — ONLY as an argument to useBlockProps**, not as a sibling of the spread
- ✓ Strings via \_\_()
- ✓ NO Russian characters (critical)
- ✓ **Text content via InnerBlocks** (critical for NON-button blocks)
- ✓ **Buttons via InnerBlocks** (critical for NON-button blocks)
- ✓ **At most ONE `<InnerBlocks` per block** (critical)
- 🔴 Russian characters, no useBlockProps
- 🔴 **blockProps created but not spread on root** (see supports-invariant)
- 🔴 **`<root className="..." {...blockProps}>` — overwrites supports styles**
- 🔴 RichText for headings/paragraphs (instead of InnerBlocks + core blocks)
- 🔴 Custom `<a>` elements for buttons (instead of InnerBlocks)
- 🔴 **Multiple `<InnerBlocks` in one block**
- 🟡 **`templateLock` or `allowedBlocks` on the root `<InnerBlocks>`** without an explicit user request (see [innerblocks-defaults](../guides/validation-core-rules.md#innerblocks-defaults))
- 🟡 **`const ALLOWED_BLOCKS = [...]`** declared but not used (or used only for root, which must not receive it)
- 🔴 **Broken data-layer store import** (runtime undefined, `npm run build` does NOT catch it): `import { coreStore } from '@wordpress/core-data'` — should be `import { store as coreStore } from '@wordpress/core-data'`. Grep `coreStore` in imports: `@wordpress/core-data` has no named export `coreStore` (the export is called `store`). Likewise check `import { store as XStore }` for other `@wordpress/*` data stores.
- 🟡 **`useSelect`/`useDispatch` not imported from `@wordpress/data`** (a common mistake — from `@wordpress/core-data`) → undefined at runtime.

**⚠️ CRITICAL RULE 1: Checking text content (headings, paragraphs)**

**Automatically check for RichText used for headings and paragraphs:**

```javascript
// ❌ WRONG PATTERN - must raise an error
<RichText
    tagName="h1"   // or h2, h3, h4, h5, h6
    value={title}  // or subtitle, heading, any title-related
    onChange={...}
/>

// ❌ WRONG PATTERN - must raise an error
<RichText
    tagName="p"          // or "div" with multiline="p"
    value={description}  // or text, content, any description-related
    onChange={...}
/>
```

**If this pattern is found - create an error:**

```
🔴 CRITICAL ERROR: RichText for text content instead of InnerBlocks

File: edit.js, lines {{lines where RichText was found}}

Problem:
Text content (headings/paragraphs) is implemented via RichText and attributes.
This breaks the InnerBlocks-with-core-blocks architecture and limits functionality.

Current code:
<RichText
    tagName="h2"
    value={title}
    onChange={(value) => setAttributes({ title: value })}
/>
<RichText
    tagName="p"
    value={description}
    onChange={(value) => setAttributes({ description: value })}
/>

Should be:
const TEMPLATE = [
    ['core/heading', {
        level: 2,
        placeholder: __('Enter title...', 'textdomain'),
        content: 'Default Title'
    }],
    ['core/paragraph', {
        placeholder: __('Enter description...', 'textdomain'),
        content: 'Default description'
    }],
];

<InnerBlocks
    template={TEMPLATE}
    allowedBlocks={['core/heading', 'core/paragraph']}
    templateLock={false}
/>

Actions:
1. Remove all RichText components for headings/paragraphs
2. Create a TEMPLATE constant with core/heading and core/paragraph
3. Replace them with InnerBlocks with template and allowedBlocks
4. Remove text attributes from block.json: title, subtitle, description, text, heading
5. Remove text attributes from destructuring in edit.js and save.js

Reference: GUTENBERG_BLOCK_STRUCTURE_PROMPT.md section "1. Use InnerBlocks Instead of RichText"
Benefits: Native WordPress editing experience, full formatting functionality
```

**Automatic pattern check:**

```regex
// Search for RichText for headings:
<RichText[\s\S]*?tagName=["']h[1-6]["'][\s\S]*?value=\{[^}]*(title|heading|subtitle)[^}]*\}

// Search for RichText for paragraphs:
<RichText[\s\S]*?tagName=["'](p|div)["'][\s\S]*?value=\{[^}]*(description|text|content)[^}]*\}
```

**Exceptions:**

DO NOT create an error if:

1. RichText for inline text (badge, tag, label) - `tagName="span"` with short values
2. RichText with the `multiline` attribute (this is a legacy approach, but acceptable)
3. The block already uses InnerBlocks correctly

---

**⚠️ CRITICAL RULE 3: Checking the number of InnerBlocks**

**WordPress allows ONLY ONE `<InnerBlocks>` per block. Check:**

```regex
// Count InnerBlocks in edit.js:
<InnerBlocks[\s\S]*?/>|<InnerBlocks[\s\S]*?>

// Count in save.js:
<InnerBlocks\.Content\s*/>
```

**If more than one is found — create an error:**

```
🔴 CRITICAL ERROR: Multiple InnerBlocks

File: edit.js (and/or save.js)

Problem: Found {{count}} occurrences of <InnerBlocks>.
WordPress supports ONLY ONE InnerBlocks per block.

Solution: Use core/group in the template to group sections:
const TEMPLATE = [
  ['core/group', { className: 'section-1' }, [...]],
  ['core/group', { className: 'section-2' }, [...]],
];
<InnerBlocks template={TEMPLATE} />

Alternative: Create child blocks, each with its own InnerBlocks.
```

---

**⚠️ CRITICAL RULE 4: Nested grid 3-part unlock pattern (ERROR severity)**

**Detect condition** (if all three hold — apply the check):

1. The parent block's `edit.js` has `<InnerBlocks ... templateLock="all">` (outer lock)
2. The parent block's template contains a `core/group` whose **third parameter** seeds **2+** instances of the same child block
3. The child block name — a registered namespace (`{namespace}/{name}`), and its own `block.json` exists in the project (i.e. it is a child of this same plugin, not core).

**Skip condition** (the rule does NOT apply):

- The parent `block.json` has the marker `"fixedChildCount": true`, OR
- The converter state / state notes specify `"fixedChildCount": true` for this section, OR
- The outer `<InnerBlocks>` uses `templateLock={false}` — there is no outer lock, no inherited lock propagates → no unlock needed.

**Checks (each is a separate ERROR):**

1. **Group attributes have `templateLock: false`** — otherwise the nested group inherits `templateLock="all"` from the outer InnerBlocks via React context, and the inserter does not work.
2. **Group attributes have `allowedBlocks: ['{namespace}/{child-name}']`** — without an allowlist the inserter does not know which blocks are valid inside the group.
3. **Child block.json uses `ancestor: ['{namespace}/{parent-name}']`, NOT `parent: [...]`** — `parent` is a strict check of the immediate parent (= `core/group`), not of the parent block. Only `ancestor` works correctly for the nested-grid scenario.

**If at least one check fails — emit ERROR per missing piece:**

```
🔴 CRITICAL ERROR: Nested grid 3-part unlock pattern — violation #{1|2|3}

File: blocks/{block}/edit.js:{line}  (or blocks/{child}/block.json:{line})

Problem: the parent block uses templateLock="all" on the outer <InnerBlocks>
and seeds {N} "{ns}/{child}" child blocks inside a nested core/group, but:
  [#1] templateLock=false is MISSING in the group attributes → the grid inherits the lock and the inserter is blocked
  [#2] allowedBlocks is MISSING in the group attributes → the inserter does not know which block to add
  [#3] child block.json uses "parent": [...] instead of "ancestor": [...] → the child fails insertion validation inside core/group

Fix (apply ALL three parts at once — coupled set, a partial fix leaves the bug):

  edit.js:
  ['core/group', {
      className: 'block-{name}__grid',
      templateLock: false,                       // (1) override of the inherited 'all'
      allowedBlocks: ['{ns}/{child}'],           // (2) whitelist for the inserter
  }, SEEDS.map(s => ['{ns}/{child}', s])]

  blocks/{child}/block.json:
  "ancestor": ["{ns}/{block}"]                   // (3) — NOT "parent"

Skip rule: if the brief fixes the count → add "fixedChildCount": true to the parent block.json.

Reference: guides/innerblocks-composition.md → "🔓 Nested grid wrappers: 3-part unlock pattern"
```

**IMPORTANT — narrow scope of the rule (avoiding false positives):**

- Do not trigger if the parent does NOT use `templateLock="all"` (or `templateLock: 'all'`) on the outer InnerBlocks.
- Do not trigger if the child is a direct child of the parent block (not nested in `core/group`). In that case `parent: [...]` in the child block.json — the correct pattern.
- Do not trigger if the group seeds only **one** child instance or none at all.
- Do not trigger on core blocks inside the group (`core/heading`, `core/paragraph`, etc.) — the rule is only about child blocks of this same plugin.

---

**⚠️ CONTEXT API VALIDATION**

If the block is a parent block (has child blocks) - check:

```javascript
// ✅ CORRECT PATTERN in the parent's block.json:
"providesContext": {
    "namespace/backgroundColor": "backgroundColor",
    "namespace/textColor": "textColor"
    // any attributes that child blocks need
}

// ✅ CORRECT PATTERN in the parent's Edit component:
export default function Edit({ attributes, setAttributes, context }) {
    // the context parameter is present
}

// ✅ CORRECT PATTERN in the child block's block.json:
// Default → "ancestor"; "parent" only for a direct child without a core/group wrapper
// (see Rule 4: 3-part unlock).
"ancestor": ["namespace/parent-block-name"],
"usesContext": ["namespace/backgroundColor", "namespace/textColor"]

// ✅ CORRECT PATTERN in the child block's Edit component:
export default function Edit({ attributes, setAttributes, context }) {
    const bgColor = context['namespace/backgroundColor'];
    // Using context from the parent
}
```

**If the Context API pattern is wrong - create a warning:**

```
⚠️ WARNING: Context API is not set up for parent/child composition

Problem: A parent block with child blocks was detected, but Context API is not used

Recommendations:
1. Add providesContext to the parent block's block.json for attributes that must be available to child blocks
2. Add usesContext to the child block's block.json to read values from the parent
3. Add the context parameter to the Edit function of the parent and the child block
4. Add the "parent" property to the child block's block.json to restrict where it can be used

Reference: GUTENBERG_BLOCK_STRUCTURE_PROMPT.md section "4. Use Context API for Parent-Child Communication"
```

---

**⚠️ CRITICAL RULE 2: Checking buttons**

**Automatically check for custom buttons:**

```javascript
// ❌ WRONG PATTERN - must raise an error
<a
    className="block-*__button"    // any block + __button
    href={*Url}                    // any variable with Url
>
    <RichText
        tagName="span"
        value={buttonText}         // buttonText variable
        onChange={...}
    />
</a>
```

**If this pattern is found - create an error:**

```
🔴 CRITICAL ERROR: Custom button instead of InnerBlocks

File: edit.js, lines {{lines where the <a> element was found}}

Problem:
The button is implemented as a custom <a> element with nested RichText.
This breaks the principle of reuse and token savings.

Current code:
<a className="block-{{blockName}}__button" href={buttonUrl}>
    <RichText tagName="span" value={buttonText} onChange={...} />
</a>

Should be:
<InnerBlocks
    allowedBlocks={['{{namespace}}/default-button', 'core/button']}
    template={[
        ['{{namespace}}/default-button', { buttonText: '...' }]
    ]}
/>

Actions:
1. Remove the <a> element and all the button code
2. Replace it with InnerBlocks with allowedBlocks
3. Remove from block.json the attributes: buttonText, buttonUrl, buttonTarget, button*Color
4. Remove the button settings panels from InspectorControls

Reference: guides/innerblocks-composition.md section "Special case: Buttons"
Savings: ~8,000 tokens per block
```

**Exceptions:**

DO NOT create an error if:

1. The block itself is a button (its name contains "button", "btn")
2. A `<span>` element with RichText for badge/tag (WITHOUT href)
3. InnerBlocks is already used for the button

**Automatic pattern check:**

```regex
// Search for the problematic pattern in edit.js:
<a\s+className="[^"]*__button[^"]*"\s+href=\{[^}]+\}[^>]*>[\s\S]*?<RichText[\s\S]*?value=\{[^}]*button[^}]*\}
```

**Icons (only when `iconSystem` is active):** source — [icon-sprite](../guides/validation-core-rules.md#icon-sprite).

- 🔴 **`hardcoded_icon_select`** — the icon picker is built from a hardcoded list (`SelectControl` with a literal `options`/array of ids) instead of a grid from `icons.manifest.json`. Fix: rebuild the picker on `iconManifest.map(...)` (`BaseControl`+buttons+`SpriteIcon`).
- 🔴 **`inline_icon_svg`** — `edit.js`/`save.js`/`render.php` contains an inline `<svg>` with path/geometry for a design glyph instead of `<SpriteIcon name={…}/>`. **Report-only** (mapping to an id — semantic). **Exception:** an animated/multi-part illustration (inner elements styled by CSS, `stroke-dasharray`, etc.) — legitimate as a bespoke inline SVG, NOT a violation.

**Grep heuristics (icon-sprite):**

| Check | Regex | Where |
|---|---|---|
| `hardcoded_icon_select` | `<SelectControl[^>]*\bvalue=\{\s*icon\s*\}` or `options=\{\s*\[[^\]]*value:` next to `icon` | `edit.js` |
| `inline_icon_svg` | `<svg[\s\S]*?<(path\|circle\|rect\|line\|polygon\|polyline)` | `edit.js`/`save.js`/`render.php` |

**Color/gradient controls:** source — [color-palette-source](../guides/validation-core-rules.md#color-palette-source).

- 🔴 **`panel_color_settings`** — uses `PanelColorSettings` / `PanelColorGradientSettings` / `__experimentalPanelColorGradientSettings` / `ColorGradientSettingsDropdown` / a homemade color control wrapper / a hardcoded `colors={[{name,color}]}` array / `useSetting` (singular). Should be: plain color → `<ColorPalette>` (`useSettings('color.palette')`), fill → `TabPanel`+`ColorPalette`+`GradientPicker`. **Auto-fixable.** ⚠️ `ColorPalette`/`GradientPicker` on their own — legitimate primitives, DO NOT flag them; the error applies only to the panel composites.
- 🟡 **`background_fill_color_only`** — the background fill is driven only by `backgroundColor` (no `backgroundGradient`/gradient control). **Report-only** (we do not force auto-adding it).

**Grep heuristics (color-palette-source):**

| Check | Regex | Where |
|---|---|---|
| `panel_color_settings` | `PanelColor\w*Settings` (catches `PanelColorSettings`, `PanelColorGradientSettings`, `__experimentalPanelColorGradientSettings`) or `ColorGradientSettingsDropdown` or `useSetting\(` (without `s`) or `colors=\{\s*\[\s*\{` (literal array) | `edit.js` |

> `PanelColor\w*Settings` covers all panel composites (including the `__experimental` prefix). `ColorPalette`/`GradientPicker` do not match this regex — they are legitimate primitives.

---

#### save.js (static blocks)

- ✓ useBlockProps.save({ className: '...' })
- ✓ **`{...blockProps}` is spread on the root tag** (see supports-invariant)
- ✓ **The author's className/style — as an argument to useBlockProps.save**, not on the JSX
- ✓ InnerBlocks.Content (for blocks with InnerBlocks in edit.js)
- ✓ RichText.Content ONLY for inline text (badge, tag, label)
- ✓ NO hooks (useState, useEffect)
- ✓ Structure identical to edit.js (except InnerBlocks → InnerBlocks.Content)
- 🔴 Wrong useBlockProps (call without `.save` in save.js)
- 🔴 **blockProps not spread on root** — supports styles are lost
- 🔴 RichText.Content for text when InnerBlocks is used in edit.js

**⚠️ CRITICAL RULE: Consistency between edit.js and save.js**

**Check consistency between edit.js and save.js:**

```javascript
// IF edit.js uses InnerBlocks:
// edit.js
<InnerBlocks template={TEMPLATE} allowedBlocks={ALLOWED_BLOCKS} />

// THEN save.js MUST have:
// save.js
<InnerBlocks.Content />

// ❌ ERROR: Inconsistency
// edit.js uses InnerBlocks
// save.js uses RichText.Content
<RichText.Content tagName="h2" value={title} />
```

**If an inconsistency is found - create an error:**

```
🔴 CRITICAL ERROR: edit.js and save.js are inconsistent

File: save.js

Problem:
edit.js uses InnerBlocks for text content,
but save.js uses RichText.Content with attributes.
This will cause a block save error.

Current code in save.js:
<RichText.Content tagName="h2" value={title} />
<RichText.Content tagName="p" value={description} />

Should be in save.js:
<InnerBlocks.Content />

Rule:
- IF edit.js uses InnerBlocks → save.js MUST use InnerBlocks.Content
- IF edit.js uses RichText → save.js MUST use RichText.Content
- The structure must be IDENTICAL (except for swapping components)

Actions:
1. Replace all RichText.Content with InnerBlocks.Content
2. Remove destructuring of text attributes (title, description, etc.)
3. Make sure the JSX structure is identical to edit.js

Reference: GUTENBERG_BLOCK_STRUCTURE_PROMPT.md section "7. Save Component Pattern"
```

---

#### render.php (dynamic blocks)

- ✓ <?php if (!defined('ABSPATH')) { exit; } (critical)
- ✓ get_block_wrapper_attributes()
- ✓ **`$wrapper_attributes` is on the ROOT tag** (see supports-invariant)
- ✓ Defaults: $var = $attributes['key'] ?? ''
- ✓ Escaping: esc_html(), wp_kses_post() (critical)
- ✓ Alternative syntax: if(): endif;
- ✓ Yoda style: true === $var
- 🔴 No ABSPATH, no escaping
- 🔴 **Double wrapper** `<div ...wrapper_attributes><section class="block-...">` — supports land on an empty div

#### style.scss

- ✓ BEM: .block-name\_\_element
- ✓ REM with comments: `3rem; // 48px` — **but only for off-scale values**; spacing/font-size values that are on the theme.json scale use an alias `var(--space-*)` / `var(--text-*)`, not raw rem with a comment
- ✓ Breakpoints: $md1-$md5
- ✓ **Media queries are isolated inside the selector** (no single combined `@media` at the end of the block wrapping both the block and its elements) — see [scss-media-structure](../guides/validation-core-rules.md#scss-media-structure)
- ✓ **`&__container` / `.block-X__container` is NOT used as a selector** — container styles are managed globally (see [scss-no-container-styles](../guides/validation-core-rules.md#scss-no-container-styles))
- ✓ **Elements with a universal class do NOT duplicate styles** — if an element in the markup carries a universal (global) class, its BEM selector in `style.scss` has no visual declarations (see [scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate))
- 🟡 px instead of rem, wrong BEM classes
- 🟡 **`raw_token_value`** — raw rem/px on `padding/margin/gap`/`font-size` whose value matches a **fixed** theme.json preset → should be `var(--space-{slug})` / `var(--text-{slug})`. Build the `value→slug` map from the project's theme.json (`themeJsonPath`, it is read anyway), normalizing to px; do it **deterministically**, not by eye. Spec: [scss-token-aliasing](../guides/validation-core-rules.md#scss-token-aliasing).
  - **fixed token** (literal, ±1px) → 🟡, **auto-fixable** (the fixer replaces it).
  - **fluid token** (`clamp`, usually `4xl/5xl/6xl`, display-*) or a manual `@media` pair (max/min of the clamp) → 🟡 **report-only** (recipe "collapse both branches into `var(--space-4xl)`", a human fixes it — the risk is the same as with `media_value_leak`).
  - **off-scale** (no preset) → NOT a validator error; mark it as a source defect (snap it in the design, not after the fact).
  - No theme.json → the rule does not run (nothing to compare against).
- 🟡 **`grouped_media_query`** — detected `@media (...) { ... &__X { ... } &__Y { ... } }` inside `.block-X` (the media query covers 2+ selectors). Restructure: each selector gets its own `@media` inside its body.
- 🔴 **`media_value_leak`** — a property is declared in the selector's base AND the same property is in a `@media` inside it (the base value gets overridden = not universal). Each responsive value — only in its own `@media`. See [scss-breakpoint-isolation](../guides/validation-core-rules.md#scss-breakpoint-isolation)
- 🔴 **`forbidden_container_styles`** — a non-empty `&__container { ... }` or `.block-X__container { ... }` block was found in `style.scss`. Remove it entirely; move the needed rules to `.block-X` or a specific `&__element`.
- 🔴 **`duplicated_universal_styles`** — a BEM selector in `style.scss` contains visual declarations for an element that in the markup (edit.js/save.js/render.php) carries a **universal class** (any class except the block's own BEM `block-{name}*` and WP core `wp-block-*`/`wp-element-*`/`has-*`/`is-*`/`align*`). The styles are already set globally by the universal class. Requires **markup↔SCSS correlation**: (1) in edit.js/save.js/render.php find elements whose className = `block-{name}__{el}` + at least one universal class; (2) for each such `{el}` check whether `style.scss` has an `&__{el}` / `.block-{name}__{el}` selector with visual declarations; (3) if it does → violation. Fix: clear the declarations (empty selector with a comment), **do not touch the markup** (the BEM class stays). See [scss-universal-class-no-duplicate](../guides/validation-core-rules.md#scss-universal-class-no-duplicate).

**Grep heuristics:**

| Check | Regex | Where |
|---|---|---|
| `grouped_media_query` | `@media[^{]+\{[^{}]*&__[^{}]+\{[^{}]*\}[^{}]*&__` (multiline) | `style.scss` inside `.block-{name}` |
| `media_value_leak` | property `P:` in the selector body BEFORE `@media` AND the same `P:` inside `@media` of the same selector (semantic check, not a single regex) | `style.scss` |
| `raw_token_value` | `(padding\|margin\|gap\|font-size)[^;]*\b\d[\d.]*(rem\|px)` where the value is equivalent to a theme.json spacing/fontSizes preset (semantic comparison against the scale, not a single regex) | `style.scss` |
| `forbidden_container_styles` | `&__container\s*\{[^}]*[a-z-]+\s*:` or `\.block-[\w-]+__container\s*\{[^}]*[a-z-]+\s*:` | `style.scss` |
| `duplicated_universal_styles` | an element with `class="block-{name}__{el} {universal}"` in the markup AND a non-empty `&__{el}` in `style.scss` (markup↔SCSS correlation, not a single regex) | `edit.js`/`save.js`/`render.php` + `style.scss` |
| `unnecessary_template_lock` | `<InnerBlocks[^>]+(allowedBlocks\|templateLock)[^>]*template=\{[A-Z_]+\}` OR `<InnerBlocks[^>]+template=\{[A-Z_]+\}[^>]+(allowedBlocks\|templateLock)` | `edit.js` / `save.js` |

When `unnecessary_template_lock` fires — mark it as a 🟡 warning, not critical; skip it if `userChoices` / brand brief contains an explicit request for locking.

#### editor.scss

- ✓ Valid SCSS
- ✓ Selector: .wp-block-namespace-blockname

#### index.js

- ✓ Correct imports and registration
- 🔴 No metadata import

### STEP 3: Building the result

**If there are NO errors:**

```
✅ Validation of block "{{title}}" passed successfully!

Checked:
✓ File structure
✓ Critical rules

The block is ready to use!

⚠️ passed ≠ no runtime errors. The static validator and `npm run build` do NOT catch runtime undefined (broken store imports, typos in @wordpress/* export names) — they only show up when the block is opened in the editor. If you worked with the data layer (`useSelect`/`getEntityRecords`/`store as coreStore`) — check the block in a real editor.
```

**If there ARE errors:**

Report format:

```
❌ Validation of block "{{title}}" failed

Problems found:

{{file}}:{{line}}
🔴 {{description}}
   {{current_code}}
   Should be: {{suggestion}}

Total: X critical 🔴, Y warnings 🟡
```

**FINISH**

---

## 🛠️ Tools

**Read** — for reading the block files

**Grep** — for quickly finding problems:

- `[а-яА-Я]` — Russian characters
- `echo \$` — no PHP escaping
- `import\s*\{\s*coreStore\s*\}` — broken `@wordpress/core-data` import (should be `store as coreStore`)
- `useSelect|useDispatch` + check the import source — `@wordpress/data`, not `@wordpress/core-data`

---

## ✅ Critical rules

**Security PHP:**

- ABSPATH check
- Escaping of all output
- Defaults (??) for attributes

**No Russian:**

- All UI strings in English

**BEM:**

- .block-name\_\_element
- .block-name\_\_element--modifier

✅ Ready for validation!
