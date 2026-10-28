# Coding Rules for Gutenberg Blocks

A quick reference of coding rules based on the project's examples.

---

## 📋 HTML Markup

### Key rules

**All files (edit.js, save.js, render.php):**
- ✅ **With** the `__container` element
- One structure: `<section {...blockProps}>` → `<div class="block-{name}__container">` → content
- The structure is **identical** in all files

**Details and examples:** See `guides/button-template-system.md`

---

## 🎨 BEM Methodology

**Rules:**
- Block: `block-{name}` (always with the `block-` prefix)
- Element: `block-{name}__element` (two underscores)
- Modifier: `block-{name}__element--modifier` (two hyphens, a separate class)

**Constraints:**
- Maximum 3 levels of nesting
- DO NOT use cascading for elements
- Modifiers are added with a space

**Detailed rules and examples:** See `prompts/bem-methodology.md`

---

## 🎨 SCSS Styles

### Breakpoints (ALWAYS the same)

```scss
$md1: em(1199.98); // Desktops, laptops
$md2: em(991.98);  // Tablets
$md3: em(767.98);  // Phones L
$md4: em(479.98);  // Phones S
$md5: em(549.98);  // Additional
```

### Key rules

**Sizes:**
- All sizes in **REM**
- A **px** comment is required
- Example: `font-size: 1.875rem; // 30px`

**Media queries:**
- Isolated (each property only once)
- Shared styles → outside media queries
- Desktop → `@media (min-width: $md3) {}`
- Mobile → `@media (max-width: $md3) {}`

**Forbidden:**
- ❌ Duplicating properties across different media queries
- ❌ Unnecessary styles
- ❌ Reset styles (`null.scss` is used)
- ❌ Cascading selectors for BEM elements

**Detailed examples and patterns:**
- `guides/css-custom-properties.md` - isolated media queries
- `samples/scss/blocks/hero-block.scss` - reference example

---

## ⚛️ Gutenberg Blocks

### File structure

```
blocks/{block-name}/
├── block.json       # Manifest
├── index.js         # Registration
├── edit.js          # Backend (editor) - WITH container
├── save.js          # Frontend static - WITH container
├── render.php       # Frontend dynamic - WITH container
├── style.scss       # Frontend styles
└── editor.scss      # Backend styles
```

### Key rules by file

**edit.js:**
- `useBlockProps()` for the root element
- `RichText` for editable text
- `InspectorControls` for sidebar settings
- i18n via `__()`
- ✅ **With** `__container`

**save.js:**
- `useBlockProps.save()` for the root element
- `RichText.Content` for text output
- ✅ **With** `__container`

**render.php:**
- `get_block_wrapper_attributes()` for the wrapper
- `wp_kses_post()` / `esc_html()` for safe output
- ✅ **With** `__container`

**Code templates:** block file structure — in `GUTENBERG_BLOCK_STRUCTURE_PROMPT.md` (§6–§8); ready-to-copy templates — only `templates/button/` and `templates/post-card/`  
**Detailed rules:** See `prompts/gutenberg-best-practices.md`

---

## 🎯 Interactive Selection of Editable Properties

**CRITICAL:** Before generating a block, the agent MUST ask the user about editable properties.

### Questions for the user:

**1. Which elements are editable?**
- Text (headings, paragraphs, lists)
- Images (upload, alt text)
- Buttons (text, URL, target)
- Icons
- Other

**2. Which styles are configurable?**
- Text color
- Background color
- Font size
- Spacing (padding, margin)
- Alignment
- Other

**3. Which additional options?**
- Toggle switches (show/hide an element)
- Variant selection (select dropdown)
- Value range (range slider)
- Other

### Example dialog

```
Agent: "For the Hero block, which properties should be editable from the admin panel?"
User: "Heading, subheading, button (text + URL), image, block background color"
Agent: "Do you need any additional settings? For example, a toggle for the image border?"
User: "Yes, add a toggle for the border"
```

### Using the answers

This data defines:
- **Attributes** in `block.json`
- **Controls** in `InspectorControls` (edit.js)
- **Conditional logic** for rendering in edit.js and save.js/render.php

---

## 🔧 CSS Variables

**Available theme variables:** See `samples/scss/variables.scss`

**Main ones:**
```scss
// Colors
var(--black)
var(--pure-white)
var(--white)
var(--gray-dark)
var(--yellow)

// Sizes
var(--main-offsize)   // Base font size
var(--title-offsize)  // Heading size
```

---

## ✅ Pre-Generation Checklist

### Preparation
- [ ] Ask the user which props are editable
- [ ] Ask which styles are configurable
- [ ] Ask about additional options

### HTML
- [ ] All files: `__container` is present
- [ ] The structure is identical in edit.js, save.js, render.php
- [ ] BEM notation is correct
- [ ] `block-` prefix on the section class
- [ ] Modifiers via `--` as separate classes

### SCSS
- [ ] All sizes in REM with px comments
- [ ] Isolated media queries
- [ ] Correct breakpoints ($md1-$md5)
- [ ] No unnecessary styles
- [ ] No reset styles
- [ ] Modifiers are nested correctly

### Gutenberg
- [ ] `block.json` is correct, with the needed attributes
- [ ] `edit.js` with `__container`
- [ ] `save.js` or `render.php` with `__container`
- [ ] The structure is identical in all files
- [ ] i18n is used everywhere
- [ ] `RichText` for editable text
- [ ] `InspectorControls` with the needed controls

---

## 📚 Detailed Documentation

**Methodologies:**
- BEM: `prompts/bem-methodology.md`
- Gutenberg: `prompts/gutenberg-best-practices.md`
- WordPress: `prompts/wordpress-coding-standards.md`

**Guides:**
- CSS media queries: `guides/css-custom-properties.md`
- Block structure: `guides/button-template-system.md`
- Fix examples: `guides/auto-fix-examples.md`

**Templates and examples:**
- File templates: `templates/`
- HTML examples: `samples/html/`
- SCSS examples: `samples/scss/blocks/`
- Gutenberg examples: `samples/gutenbrg/blocks/`
- Variables: `samples/scss/variables.scss`
- Mixins: `samples/scss/mixins.scss`
