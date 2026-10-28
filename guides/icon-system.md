# Icon System — sprite icons in generated blocks

Icon generation rules for when the theme uses a **shared SVG sprite** (design-system line icons are rendered through `<use href="…/sprite.svg#icon-<name>">`, not inline in the block markup).

**When it applies (gate):** `src/.claude/config.json` has an `iconSystem` section with `type: "sprite"` (or the manifest is found on disk at the `iconSystem.manifest` path). No `iconSystem` → these rules do NOT apply (icons are handled as regular media, but the old "enum + inline SVG" anti-pattern is still forbidden — see [innerblocks-composition.md](innerblocks-composition.md)).

**Sprite artifacts are owned by the THEME; the plugin does NOT create them.** The `sprite-icon.js` component, the `icons.manifest.json` manifest, the PHP filter and `sprite.svg` itself live in the theme. The generator only **imports** the component and **reads** the manifest. The canonical reference for the project is in the theme (by default `tools/icon-sprite/README.md`).

---

## Config

```jsonc
"iconSystem": {
  "type": "sprite",
  "component": "common/icon/sprite-icon",         // path to the component relative to blocksDir
  "manifest": "_generated/icons.manifest.json",   // path to the manifest relative to blocksDir
  "iconClass": "wp-icon",                          // class on <svg>, used to style the size
  "symbolIdPrefix": "icon-",                       // symbol id in the sprite = {prefix}{name}
  "sourceDir": "src/icons",                        // where a human adds new glyphs
  "rebuildCmd": "npm run icons"                    // command that rebuilds the sprite + manifest
}
```

Defaults if a field is omitted: `component` → `common/icon/sprite-icon`, `manifest` → `_generated/icons.manifest.json`, `iconClass` → `wp-icon`, `symbolIdPrefix` → `icon-`, `sourceDir` → `src/icons`, `rebuildCmd` → `npm run icons`.

---

## Hard rules

1. **NEVER output an inline `<svg>` with paths/geometry** for a design-system glyph in `edit.js` / `save.js` / `render.php`. Reference the sprite.
2. **Render the icon with the shared component** `iconSystem.component`:
   ```jsx
   import SpriteIcon from '<relative>/common/icon/sprite-icon';
   // ...
   <SpriteIcon name={ icon } />
   ```
   It emits `<svg class="{iconClass}"><use href="…/sprite.svg#{symbolIdPrefix}{name}"></svg>`. **DO NOT add** a version/`?v=` — the theme's PHP filter stamps `?v=<filemtime>` at render time. **Never build the sprite URL yourself.**
3. **Only ids from the manifest** `iconSystem.manifest` (a flat array of ids, e.g. `["partner","system","value", …]`). Symbol id = `{symbolIdPrefix}{name}`; pass only `{name}` to `SpriteIcon`. **Read the manifest** before generating — to validate ids and choose the `default`.
4. **The required icon is not in the manifest → DO NOT invent an inline SVG and DO NOT pick a similar one.**
   - Interactive mode: **stop and ask the human** to add `{sourceDir}/<name>.svg` (canonical format below) and run `{rebuildCmd}`.
   - Autonomous mode (`--no-comments`): DO NOT invent. Take a valid `default` from the manifest, and **list the missing ids prominently** in the report ("need to add to `{sourceDir}/`: […] + `{rebuildCmd}`").
5. **Size and color come from CSS via `currentColor`.** `<svg class="{iconClass}">` carries no inline width/height/color. Set them in `style.scss` on the icon container:
   ```scss
   .block-x__icon { color: var(--primary); }                 // stroke = currentColor
   .block-x__icon .wp-icon { width: 1.375rem; height: 1.375rem; } // 22px
   ```

---

## Import by block depth

Import paths are **relative to the block folder**. Depth = the number of segments from `blocksDir` to the block folder.

- **Grouped block** `{blocksDir}/<group>/<block>/` (a common case, e.g. `why-us/why-point`):
  - component → `../../common/icon/sprite-icon`
  - manifest → `../../_generated/icons.manifest.json`
- **Top-level block** `{blocksDir}/<block>/`:
  - component → `../common/icon/sprite-icon`
  - manifest → `../_generated/icons.manifest.json`

General formula: prefix = `../` × (block depth under `blocksDir`), then `iconSystem.component` / `iconSystem.manifest`.

---

## block.json — the `icon` attribute

**DO NOT hardcode an `enum` of icon ids** (the set is dynamic, from the manifest):

```json
"attributes": {
  "icon": { "type": "string", "default": "partner" }
}
```

`default` must be an id present in the manifest.

---

## edit.js — picker (grid from the manifest)

Build the selector **from the manifest**, not from a hardcoded `SelectControl` list:

```jsx
import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, BaseControl } from '@wordpress/components';
import SpriteIcon from '../../common/icon/sprite-icon';
import iconManifest from '../../_generated/icons.manifest.json';

export default function Edit( { attributes, setAttributes } ) {
  const { icon } = attributes;
  const blockProps = useBlockProps( { className: 'block-why-point' } );

  return (
    <>
      <InspectorControls>
        <PanelBody title={ __( 'Point Settings', 'textdomain' ) }>
          <BaseControl id="why-point-icon-picker" label={ __( 'Icon', 'textdomain' ) }>
            <div className="block-why-point__icon-picker" role="listbox">
              { iconManifest.map( ( name ) => {
                const isSelected = name === icon;
                return (
                  <button
                    key={ name }
                    type="button"
                    role="option"
                    aria-selected={ isSelected }
                    aria-label={ name }
                    title={ name }
                    className={ 'block-why-point__icon-option' + ( isSelected ? ' is-selected' : '' ) }
                    onClick={ () => setAttributes( { icon: name } ) }
                  >
                    <SpriteIcon name={ name } />
                  </button>
                );
              } ) }
            </div>
          </BaseControl>
        </PanelBody>
      </InspectorControls>

      <div { ...blockProps }>
        <span className="block-why-point__icon">
          <SpriteIcon name={ icon } />
        </span>
        <div className="block-why-point__text">
          <InnerBlocks template={ TEMPLATE } />
        </div>
      </div>
    </>
  );
}
```

---

## save.js

```jsx
import SpriteIcon from '../../common/icon/sprite-icon';
// ...
<span className="block-why-point__icon">
  <SpriteIcon name={ icon } />
</span>
```

---

## When NOT to use the sprite

The sprite is for **static line glyphs** that need only an inherited color (`currentColor`). If a block needs an **animated or multi-part illustration** whose inner elements are styled/animated through CSS (classes on sub-elements, transitions, `stroke-dasharray`, etc.) — **DO NOT put it in the sprite**: elements referenced through `<use>` cannot be styled from the page. Keep such illustrations as a bespoke inline SVG component (like the existing `do-card`).

---

## Canonical format of a new icon file (when a human adds one)

`{sourceDir}/<kebab-name>.svg`, file name = id:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <!-- outline paths only, Lucide canon -->
</svg>
```

No `width`/`height`, no fixed colors, outline (not filled). `{rebuildCmd}` rebuilds the sprite and the manifest.

---

## Backstop — validator/fixer

Anchor rule [scss/structure: icon-sprite](validation-core-rules.md#icon-sprite). Error codes:

- `icon_attribute_enum` — `icon` in `block.json` has an `enum` → auto-fix (remove the `enum`).
- `hardcoded_icon_select` — a `SelectControl` / hardcoded list of ids instead of a grid from the manifest → rebuild the picker (partial fix).
- `inline_icon_svg` — an inline `<svg>` of a design glyph in `edit.js`/`save.js`/`render.php` instead of `SpriteIcon` → report-only (mapping to a manifest id is semantic; a human/agent does it deliberately).
- `icon_not_in_manifest` — the `default`/seed id is not in the manifest → report (a human adds the glyph + `{rebuildCmd}`).

All codes are active only when `iconSystem` is enabled.
