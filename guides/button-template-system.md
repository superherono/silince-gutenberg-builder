# Button Template System Guide

**🔴 CRITICAL:** If the block is a BUTTON, use the ready-made template instead of generating from scratch!

---

## 🔴 MANDATORY REQUIREMENTS - PROHIBITIONS

### ❌ STRICTLY FORBIDDEN:

1. **FORBIDDEN to generate code "from scratch"**
2. **FORBIDDEN to read any templates outside `templates/button/`** (read ONLY `templates/button/*`)
3. **FORBIDDEN to add editorScript/editorStyle/viewScript to block.json**
4. **FORBIDDEN to modify JavaScript logic**
5. **FORBIDDEN to change the JSX structure**
6. **FORBIDDEN to add/remove React components**

### ✅ ALLOWED:

1. Replacing the 5 placeholders ({{NAMESPACE}}, {{TEXTDOMAIN}}, {{BLOCK_NAME}}, {{BLOCK_TITLE}}, {{BLOCK_DESCRIPTION}})
2. Changing CSS Custom Properties values
3. Changing SCSS styles (style.scss, editor.scss)
4. **Generating button variants/sizes** — rebuilding the contents of `$button-variants` / `$button-sizes` in `style.scss` + syncing `enum` in `block.json` and the `SelectControl` options in `edit.js`. This is the **only** sanctioned change to `block.json`/JS logic — strictly per the contract in [button-variant-generation.md](button-variant-generation.md) (do not touch the `@each` loop and the base defaults `--button-*`).

## 0. 🔴 STRICT COPYING RULE

**Template = REFERENCE IMPLEMENTATION, proven in production!**

### FORBIDDEN (JS/structure):

- ❌ Generating JavaScript code "from scratch"
- ❌ Adding/removing React components or InspectorControls panels
- ❌ Changing the JSX structure (order of elements in the DOM)
- ❌ Changing attributes in block.json (names, types)
- ❌ Removing comments from the template (@package, JSDoc)
- ❌ Renaming variables, functions, CSS classes
- ❌ Modifying JavaScript logic (useState hooks, event handlers)
- ❌ Changing the order of imports

### ALLOWED:

- ✅ Replacing placeholders: {{NAMESPACE}}, {{BLOCK_NAME}}, {{TEXTDOMAIN}}, {{BLOCK_TITLE}}, {{BLOCK_DESCRIPTION}}
- ✅ Changing CSS Custom Properties (colors, sizes, spacing)
- ✅ Changing SCSS styles in style.scss and editor.scss
- ✅ Updating the visuals to match the Figma design (rem units, breakpoints)
- ✅ Changing hover/focus effects
- ✅ Adapting responsive breakpoints ($md2, $md3)

**Principle:** The template already contains working code, verified in example-results/default-button/. Your task is ONLY to replace the placeholders with the user's values.

## 1. Detecting the block type - BUTTON

A block is considered a BUTTON if **ANY** of these conditions is met:

**A. By structure:**

- Contains a `<button>` or `<a>` element with href
- Has text AND an icon
- Has a clickable interactive element

**B. By keywords (in the name, description, keywords):**

- "button", "btn", "cta", "call to action"
- "action button", "link button", "icon button"
- "more about", "learn more", "read more"

**C. By functionality:**

- Leads to another page (link)
- Triggers an action (submit, action)
- Has states (hover, active, disabled)

## 2. Template System usage workflow

### Step 2.2: Processing template files (Read → Replace → Write)

**🔴 CRITICAL for saving tokens:** Process each file in ONE pass!

**❌ WRONG (cost: ~14,000 tokens):**

```
1. Copy the file
2. Read the copied file  ← a REPEATED read!
3. Replace the tokens
4. Save
```

**✅ CORRECT (cost: ~7,000 tokens, 50% savings):**

**🔴 REQUIRED list - 7 files:**

```javascript
const templateFiles = ['block.json', 'index.js', 'edit.js', 'save.js', 'style.scss', 'editor.scss', 'view.js'];

for (const filename of templateFiles) {
	// 1. 🔴 Read the template IN FULL via the read_file tool — WITHOUT startLine/endLine.
	// Hardcoding ranges is forbidden: file lengths change, and a fixed endLine truncates the content.

	const templateContent = read_file({
		filePath: `${CLAUDE_PLUGIN_ROOT}/templates/button/${filename}`,
	});

	// 2. Replace ONLY the placeholders IN MEMORY (DO NOT modify the logic!)
	let finalContent = templateContent
		.replaceAll('{{NAMESPACE}}', namespace) // acme
		.replaceAll('{{TEXTDOMAIN}}', textdomain) // acme
		.replaceAll('{{BLOCK_NAME}}', blockName) // my-button
		.replaceAll('{{BLOCK_TITLE}}', blockTitle) // My Button
		.replaceAll('{{BLOCK_DESCRIPTION}}', description); // Button with icon

	// 3. Save the final result ONCE, WITHOUT changes
	create_file({
		filePath: `{{blocksDir}}/{{blockName}}/${filename}`,
		content: finalContent,
	});
}
```

**🔴 EXAMPLES OF EXACT PATHS:**

```
Read EACH file IN FULL (without startLine/endLine):

read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/block.json")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/index.js")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/edit.js")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/save.js")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/style.scss")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/editor.scss")
read_file(filePath: "${CLAUDE_PLUGIN_ROOT}/templates/button/view.js")
```

**Examples of replacements in file contents:**

- Class: `{{NAMESPACE}}-{{BLOCK_NAME}}__link` → `acme-my-button__link`
- Block: `{{NAMESPACE}}/{{BLOCK_NAME}}` → `acme/my-button`
- i18n: `__('Text', '{{TEXTDOMAIN}}')` → `__('Text', 'acme')`
- Comment: `{{BLOCK_TITLE}} Block` → `My Button Block`

⚠️ **DO NOT (JS/structure):**

- ❌ Copy files, THEN read and replace (doubles the tokens!)
- ❌ Generate JavaScript code from scratch
- ❌ Modify the JSX structure (order of elements, DOM tree)
- ❌ "Improve" components (add/remove InspectorControls panels)
- ❌ Change JavaScript logic (useState, event handlers)
- ❌ Change attributes or BEM classes

✅ **YOU CAN (CSS/visuals):**

- ✅ Change CSS Custom Properties to match the design
- ✅ Update SCSS (breakpoints, rem units, colors)
- ✅ Adapt the visuals to the Figma specification

### Step 2.3: REQUIRED updates after copying

**After the template has been copied with the placeholders replaced, you MUST update:**

1. **CSS Custom Properties in style.scss** - with values from the Figma specification:

   - Colors (--ns-button-bg, --ns-button-text, --ns-icon-bg)
   - Sizes (--ns-button-padding, --ns-button-gap, --ns-icon-size)
   - Typography (--ns-button-font-size, --ns-button-font-weight)
   - Border (--ns-button-radius, --ns-icon-radius)

2. **colorPalette in edit.js** — from the theme settings via `useSettings('color.palette')` (NOT from the tokens file)

3. **Additional elements** - if the design has a badge, counter or other elements (see details in the full guide)

### Step 2.4: COMPLETION

Tell the user:

- ✅ Button block created from the template
- 📁 Path: {{blocksDir}}/{{blockName}}/
- 📋 Files: block.json, index.js, edit.js, save.js, style.scss, editor.scss, view.js
- ⚠️ Changes: Placeholder replacement + CSS update to match Figma, structure NOT changed
- `icon`: icon wrapper size, wrapper padding, size of the icon itself
- `effects`: transition, hover effects, shadow, transform

#### Step 2.4.2: Base values of CSS variables in style.scss

**The only source of the structure is `templates/button/style.scss`** (you have already read it in full). At the block root, `.{namespace}-{blockName} { --button-*: …; }` are the **base defaults** (on theme aliases). You may adjust them to match Figma; DO NOT reproduce the list from memory and DO NOT rely on line numbers — take the set from the file.

Set values that match `theme.json` tokens as an alias (`var(--primary)`, `var(--radius-md)`, `var(--space-sm)`…), not hardcoded — the defaults in the source file already use aliases.

#### Step 2.4.3: Variants and sizes are GENERATED (not written by hand)

Color variants (`primary`/`secondary`/… — the set comes from the design file) and the size axis (`small`/`medium`/`large`) are defined by the SCSS maps `$button-variants` / `$button-sizes` at the top of `style.scss` and are expanded by a generic `@each` loop into the selectors `&--{name}` / `&--size-{name}`. **Do not write them by hand** — the generation ([button-variant-generation.md](button-variant-generation.md), the `/generate-button-variants` command) rebuilds them from the project's design system, in sync with `block.json` (`enum`) and `edit.js` (`SelectControl`).

**⚠️ The `@each` loop and the base defaults `--button-*` are generic, DO NOT touch them.** Only the contents of the two maps change (via generation). Size selectors are `&--size-small/medium/large` (class `--size-{size}`), not `&--{size}`.

**🎨 Theme tokens:** all values in the map are `var(--alias)` from theme.json, not hardcoded. "No pill" design: button radius = `var(--radius-md)`. Contract — [css-custom-properties.md](../guides/css-custom-properties.md).

### Step 2.4: Palette and font sizes in edit.js — from the theme settings

**The palette and font sizes always come from the theme settings** (`useSettings`), NEVER hardcode them:

```javascript
const [themeColors] = useSettings('color.palette');
const [themeFontSizes] = useSettings('typography.fontSizes');

const colorPalette = [...(themeColors || [])];
// Font Size dropdown — from the design system (theme.json → typography.fontSizes), value = var(--text-{slug}).
// Narrowed to button roles (slug button-*); if there are none → fall back to all except display-*.
const allFontSizes = themeFontSizes || [];
const buttonFontSizes = allFontSizes.filter((f) => /^button(-|$)/.test(f.slug));
const fontSizeSource = buttonFontSizes.length ? buttonFontSizes : allFontSizes.filter((f) => !/^display-/.test(f.slug));
const fontSizeOptions = [
	{ label: __('Default (variant)', '{{TEXTDOMAIN}}'), value: '' },
	...fontSizeSource.map((f) => ({ label: f.name, value: `var(--text-${f.slug})` })),
];
```

The "Font Size" options are **dynamic** — they are pulled live from `theme.json` (like the color palette), so they are **not generated** by the command and are not hardcoded in px. The list is **narrowed to button typography** (`button-md`/`button-sm`); if the theme has no `button-*` presets — fall back to all sizes except `display-*`. `''` ("Default (variant)") = no override → the size is set by the variant/size class.

### Step 2.5: Handling additional elements

If the Figma design contains **additional elements** beyond the basic ones (text + icon):

**Examples:** Badge, Counter, Status indicator, Dropdown arrow

**What to do:**

1. **Add new attributes to block.json**
2. **Add controls to edit.js InspectorControls**
3. **Add rendering to edit.js and save.js**
4. **Add styles to style.scss**
5. **Add CSS Custom Properties for the new element**

**⚠️ IMPORTANT:** Additional elements are added ON TOP OF the template and do NOT replace its base structure!

### Step 2.6: Saving the files

Save all processed files to `{blocksDir}/{blockName}/`:

- block.json
- index.js
- edit.js
- save.js
- style.scss
- editor.scss
- view.js

**If this is NOT a button:** Skip this step and use the standard logic.
