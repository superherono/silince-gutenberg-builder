# Post-Cards Reuse — contract

**The single source of truth** for handling post listing sections. When a design brings a block with post cards, the plugin **reuses the ready-made `{namespace}/post-card` component** through the native Query Loop and, if needed, **creates a new per-type card template** by copying the structure from the theme. All 3 modes (`create-block`, `convert-react-page`, `convert-html`) reference this file — the logic is not duplicated.

> Related: [innerblocks-composition.md → Common components](innerblocks-composition.md#-common-components-registry-promotion-auto-reuse) (the shared reuse layer), [css-custom-properties.md](css-custom-properties.md) (tokens/aliases for the new card's styles).

---

## When it triggers (detection)

> 🥇 **First-class gate — runs FIRST, before the content model is chosen.** This detection runs **before** any questions about the rendering model (Static/Dynamic `render.php`, Interactivity `none/view-script`). If the section is recognized as a post listing, **DO NOT ask about Static/Dynamic and DO NOT ask about interactivity**: a listing is always served through the native Query Loop + `{namespace}/post-card` (and a slider through a static wrapper, see §3-bis); front-end interactivity is the responsibility of the user/the shared bundle (see [css-custom-properties.md](css-custom-properties.md) and the `frontendJs` convention). All three modes and `generator` MUST run this gate before their content-model branch. (Regression of 22-06: the converter went down the "dynamic/static" branch, bypassing this contract, and built a bespoke `render.php` with a duplicate card.)

A section counts as a **post listing** (role `post-cards`), and NOT a static card grid (role `card`), if there are several signals:

- a grid of **same-type** cards whose content is posts (not arbitrary features);
- post attributes: date, category/tag, author, "Read more / Read", cover thumbnail;
- section/brief labels: `blog`, `news`, `articles`, `posts`, `latest`, `insights`, `case studies`, `portfolio`, `projects`, a CPT name;
- in React/JSX — `.map()` over an array of posts/articles, links to `/blog/...`, `<article>`.

A static grid of features/services (fixed content, not posts) → this is the `card` role, leave it as is.

**Trigger:** auto-detection + a proposal to the user (default "yes"), like the rest of common reuse. Recognized a listing → ask "This is a post listing — use `post-card` (Query Loop)?". Not selected → keep it as a regular section.

---

## 1. Find the component (discovery) — portable

The component is addressed **by the block name `{namespace}/post-card`** (namespace from `src/.claude/config.json`), NOT by path. The reference path (`src/blocks/post-card`, the theme, etc.) must **never be hardcoded** — it can change.

Order:
1. The `post-cards` role in the registry `{blocksDir}/common/.registry.json` → its `dir` exists on disk → found.
2. Otherwise scan under `{blocksDir}` for a `block.json` with `"name": "{namespace}/post-card"`.
3. Not found → **propose a scaffold** from the plugin template `templates/post-card/` (`AskUserQuestion`: "The project has no post card — scaffold it from the template, or cancel?"). Scaffold → §5.1; declined → stop, no changes. **Do not invent a card from scratch** bypassing the template.

Remember the module folder you found (`{module}`) — `render.php`, `post-card.php`, `style.scss` are read from it, and new per-type templates are written into it.

---

## 2. Determine the post type (postType) + check CPT registration

- **Default — `post`** (a regular blog listing).
- **CPT** — by the section/brief label: "Case Studies" → `case-studies`, "Portfolio" → `portfolio`, "Projects" → `projects`, etc. Ambiguous → **ask** the user for the slug (`AskUserQuestion`).

**🛑 The CPT MUST be registered.** Before generating/inserting for a CPT (any type except `post`/`page`), check that it is registered: grep the theme (and mu-plugins) for `register_post_type( '{type}'` / `"{type}"`. **Not found → throw an exception and stop work:**

> ❌ CPT `{type}` is not registered in the project. Register the CPT and its taxonomy yourself (for example in `inc/custom-post-types.php`), then retry. The plugin does NOT register CPTs itself and does not build a listing for an unregistered type.

Do not auto-register, do not continue silently. (The check is best-effort — if the slug is found in the code, treat it as registered.)

---

## 3. Reuse (composition) — inserting the Query Loop

Listing section → instead of static cards, insert a native Query Loop targeting `postType`. The section "wrapping" (eyebrow, heading, intro, "view all" button) stays as regular markup/`core/group` around it:

```html
<!-- wp:query {"query":{"perPage":{N},"postType":"{type}","order":"desc","orderBy":"date","inherit":false}} -->
<div class="wp-block-query">
  <!-- wp:post-template {"layout":{"type":"grid","columnCount":{COLS}}} -->
    <!-- wp:{namespace}/post-card {"postType":"{type}","taxonomy":"{tax}"} /-->
  <!-- /wp:post-template -->
  <!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"center"}} -->
    <!-- wp:query-pagination-previous /--> <!-- wp:query-pagination-numbers /--> <!-- wp:query-pagination-next /-->
  <!-- /wp:query-pagination -->
  <!-- wp:query-no-results -->
    <!-- wp:paragraph {"align":"center"} --><p class="has-text-align-center">{noResults}</p><!-- /wp:paragraph -->
  <!-- /wp:query-no-results -->
</div>
<!-- /wp:query -->
```

- `{COLS}` / `{N}` — from the design (number of columns/cards). `{tax}` — the category pill, if visible in the design; otherwise omit it.
- **The card is inserted ONLY as `{namespace}/post-card`** — not as a static block, not as a scatter of `core/post-*` blocks.
- The theme already registers variations/patterns per type; but the converter emits explicit Query Loop markup (more reliable than a reference to a runtime pattern).

---

## 3-bis. Listing — slider / carousel (wrapper)

Does the design give a **slider** of post cards (arrows, dots, track, scroll-snap) instead of a static grid? That is **not** a reason to switch to a bespoke block with `render.php`. The pattern is a **static wrapper block on top of the same Query Loop**: the agent outputs **ONLY the structure + hook classes**, and the user writes the slider initialization (swiper / native scroll-snap) in the shared front-end bundle (see the `frontendJs` convention in [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md](../GUTENBERG_BLOCK_STRUCTURE_PROMPT.md#81-indexjs--the-single-registration-point)).

**What the agent generates:**

1. **`block.json` — static, WITHOUT `viewScript` and WITHOUT `render`.** Regular `supports` (align wide/full, spacing) + selection attributes (auto/manual, number of posts, manual list) if needed.
2. **`save.js`** — `useBlockProps.save` on the root + `<InnerBlocks.Content />` + **control markup** (controls container, dots track, prev/next buttons) with **hook classes** the user's JS uses to find the elements:

   ```jsx
   import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

   export default function save() {
     const blockProps = useBlockProps.save({ className: 'block-{name}' });
     return (
       <section {...blockProps}>
         <div className="block-{name}__container">
           <InnerBlocks.Content />
           <div className="block-{name}__controls" role="group" aria-label="...">
             <div className="block-{name}__dots" role="tablist" aria-label="..." />
             <div className="block-{name}__arrows">
               <button type="button" className="block-{name}__arrow slider-button slider-button--prev" aria-label="..." disabled>
                 <span aria-hidden="true">←</span>
               </button>
               <button type="button" className="block-{name}__arrow slider-button slider-button--next" aria-label="...">
                 <span aria-hidden="true">→</span>
               </button>
             </div>
           </div>
         </div>
       </section>
     );
   }
   ```

3. **`edit.js`** — `<InnerBlocks template={...} />`, where template = the Query Loop from §3 (`core/query` → `core/post-template` → `{namespace}/post-card`) + the section wrapping (label/H2/CTA). On the track (`core/post-template`) — the track hook class (`block-{name}__track`/`__swiper`). Post selection control (auto/manual) — through InspectorControls, syncing the inner `core/query`.

**🚫 The agent does NOT write:** `viewScript` in `block.json`, a `view.js` file, swiper init, click handlers for arrows/dots, `requestAnimationFrame` logic. This is the user's responsibility (the shared bundle).

**Class names come from the design/theme, not hardcoded.** `block-{name}`, `slider-button--prev/--next`, `__track`/`__dots`/`__arrows` are **examples of hook classes**; take the real names from the project's design system/theme conventions. Do not hardcode anything integroflow-specific into the shared layer.

> Reference structure (for understanding, not for copying names) — `example-results/22-06-26/cases/` (`save.js` + `edit.js`): a static wrapper, `block.json` without `viewScript`/`render`, cards through InnerBlocks(Query Loop).

---

## 4. "Does such a card already exist?" → default / new

The key is the **post type**: does `{module}` have a `post-card-{type}.php` file?

- **It exists** (or type = `post` → default `post-card.php`) → **reuse silently**: Query Loop per §3, the theme's router picks the right template itself.
- **It does not** → ask (`AskUserQuestion`): **"Card for `{type}`: use the default one or create a new one for the design?"**
  - **Default** → Query Loop per §3 with no new files (the router falls back to `post-card.php`). Note in the summary: "{type} is rendered with the default template; for custom markup choose 'new'".
  - **New** → §5 (generate a per-type template), then Query Loop per §3.

---

## 5. Scaffold and/or a new per-type card (Phase 2)

The router picks up a per-type template **by file name** and itself adds the `post-card--{type}` modifier on the root — NO changes to `render.php` are needed.

### 5.1 Scaffold a missing post card (from `templates/post-card/`)

When the component is missing (§1.3) and the user agreed:

1. Copy `templates/post-card/*` to `{blocksDir}/post-card/` (or `common/post-card/` per the project's convention), replacing the placeholders: `{{NAMESPACE}}`, `{{TEXTDOMAIN}}`, `{{BLOCK_TITLE}}` (Post Card), `{{BLOCK_DESCRIPTION}}`, `{{BLOCK_CATEGORY}}` (from `config.blockCategory`, default `common`). The PHP prefix `{{NAMESPACE}}_post_card_*` is filled with the same `{{NAMESPACE}}`. `post-card.php` and `style.scss` arrive as **neutral skeletons**.
2. **Wiring:** add `import './blocks/post-card';` to `src/index.js`; `include … /post-card/init.php` to `functions.php` (for a plugin — the enqueue variant from the template's README).
3. Write the role to the registry: `post-cards` → `{ kind: dynamic, dir }`.
4. Fill the **default** card from the design (see 5.2 — `post-card.php` + the base `.post-card` in `style.scss`).
5. `npm run build`.

### 5.2 Generate markup + styles from the design (generator)

1. **Read the module structure** `{module}` (scaffolded or already existing — DO NOT hardcode):
   - `render.php` → the `$data` contract (`title`, `url`, `excerpt`, `thumbnail`, `pill_text`, `stats`, `tag`, `is_editor_preview`, `wrapper_attributes`, `post_id`, `post_type`, `taxonomy`, `attributes`).
   - `post-card.php` / `style.scss` → BEM classes, escaping, base layout.
2. **Markup (PHP view) — the generator's job** (its existing Dynamic/`render.php` path):
   - default card design → **overwrite** `{module}/post-card.php` (replacing the neutral skeleton);
   - a CPT with its own look → **create** `{module}/post-card-{type}.php`;
   - the same `$data` contract + escaping (`esc_html`/`esc_url`/`wp_kses_post`) + BEM `.post-card__*`.
3. **Styles — also the generator** (its `style.scss` skill): `.post-card` / `.post-card--{type}` on **design system aliases** (`var(--primary)`, `var(--space-*)`, `var(--radius-*)`, `var(--text-*)` — contract [css-custom-properties.md](css-custom-properties.md)). `npm run build`.
4. **No wiring required** — the router finds `post-card-{type}.php` itself. The CPT must be registered (§2).

**Portability:** structure/contract/classes are taken from the module's real files (scaffold or project); integroflow-specific details and absolute paths are NOT hardcoded into the plugin.

---

## 6. Idempotency / repeat runs

- The type already has `post-card-{type}.php` → §4 "it exists" → silent reuse (do not overwrite without an explicit request to "update for the new design").
- Repeated detection of the same listing → the same Query Loop markup.

---

## Audit (applies to all modes)

| Mode | Where it is called |
|---|---|
| `create-block` | `generator.md` — when a post listing is detected |
| `convert-react-page` | `react-section-converter.md` (+ `jsx-to-gutenberg-rules.md`) — listing section |
| `convert-html` | `prompts/html-to-gutenberg.md` — listing section |

All three reference this guide; the detection/reuse/generation rules are here, the modes only point to them.
