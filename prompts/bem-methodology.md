# BEM Methodology - Detailed Rules

System prompt for agents on applying the BEM methodology.

---

## 🎯 Core BEM Principles

BEM (Block, Element, Modifier) - a CSS class naming methodology for building independent, reusable components.

---

## 📦 Block

**Definition:** An independent page component that can be reused.

### Block naming rules:

- **Prefix:** always `block-`
- **Format:** `block-{name}`
- **Lowercase:** lowercase letters only
- **Separator:** a hyphen `-` for compound names

### Block examples:

✅ **Correct:**
```html
<section class="block-hero">
<div class="block-card">
<nav class="block-main-menu">
<form class="block-contact-form">
```

❌ **Incorrect:**
```html
<section class="hero">              <!-- No block- prefix -->
<div class="Block-Card">            <!-- Uppercase letters -->
<nav class="block_main_menu">       <!-- Wrong separator -->
<form class="blockContactForm">     <!-- camelCase -->
```

---

## 🧩 Element

**Definition:** A part of a block that has no meaning outside the block.

### Element naming rules:

- **Format:** `{block}__element`
- **Separator:** two underscores `__`
- **Nesting:** not reflected in the class name

### Element examples:

✅ **Correct:**
```html
<section class="block-hero">
    <div class="block-hero__container">
        <div class="block-hero__body">
            <h1 class="block-hero__title">
            <p class="block-hero__subtitle">
        </div>
    </div>
</section>
```

❌ **Incorrect:**
```html
<!-- Nesting reflected in the class -->
<div class="block-hero__body__content__title">

<!-- Element of an element -->
<div class="block-hero__actions__button__text">
```

### Nesting depth limit:

**Maximum 3 levels** of element nesting.

---

## 🎨 Modifier

**Definition:** A property of a block or element that defines its appearance, state, or behavior.

### Modifier naming rules:

- **Format:** `{block}--modifier` or `{block}__element--modifier`
- **Separator:** two hyphens `--`
- **Usage:** as a separate class, separated by a space

### Modifier examples:

✅ **Correct:**
```html
<!-- Block modifier -->
<section class="block-hero block-hero--dark">

<!-- Element modifier -->
<h1 class="block-hero__title block-hero__title--white">

<!-- Multiple modifiers -->
<p class="block-hero__text block-hero__text--large block-hero__text--bold">
```

❌ **Incorrect:**
```html
<!-- Modifier without the base class -->
<h1 class="block-hero__title--white">

<!-- Wrong syntax -->
<h1 class="block-hero__title_white">
```

---

## 🏗️ HTML Structure with BEM

### Base structure for Gutenberg blocks:

```html
<!-- One structure for ALL files (edit.js, save.js, render.php) -->
<section class="block-{name}">
    <div class="block-{name}__container">
        <!-- Content -->
    </div>
</section>
```

**Rule:** The structure is **identical** in all files.

---

## ✅ BEM Checklist

- [ ] The block has the `block-` prefix
- [ ] Elements use `__` (two underscores)
- [ ] Modifiers use `--` (two hyphens)
- [ ] Modifiers are added as a separate class
- [ ] Maximum 3 levels of element nesting
- [ ] All versions (edit.js, save.js, render.php) have `__container`
- [ ] The structure is identical in all files
