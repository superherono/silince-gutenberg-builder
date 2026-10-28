# Post Card — portable template (structure + server logic)

Reusable, post-type-agnostic card module for the block builder. The plugin
**scaffolds** this folder when a project has no `{{NAMESPACE}}/post-card` yet;
the **generator then fills the markup and styles** of the card(s) from the
design. At ship time this is only a scaffold — NOT a specific design.

## What's scaffolded vs generated

| File | Role | Source |
|---|---|---|
| `block.json` | block def (`{{NAMESPACE}}/post-card`, `render: file:./render.php`, `save:null`) | scaffold |
| `render.php` | **router/controller** — resolves post, prepares `$data`, picks view, adds `post-card--{type}` modifier | scaffold |
| `init.php` | module bootstrap — config, helpers, Query Loop variations, patterns | scaffold |
| `variation.js` | one `core/query` variation per config entry | scaffold |
| `index.js` / `edit.js` / `save.js` | editor registration + SSR preview + `save:null` | scaffold |
| `editor.scss` | editor preview styles | scaffold |
| `post-card.php` | **default view** — NEUTRAL skeleton | scaffold → **generator rewrites from design** |
| `post-card-{type}.php` | per-CPT view | **generator creates from design** |
| `style.scss` | **NEUTRAL base** (layout only) | scaffold → **generator fills design on theme aliases** |

## `$data` contract (router → view)

Every view template (`post-card.php`, `post-card-{type}.php`) receives `$data`:

`post_id`, `post_type`, `tag`, `is_editor_preview`, `url`, `wrapper_attributes`,
`thumbnail`, `pill_text`, `title`, `excerpt`, `stats[]`
(`stat_number`/`stat_label`/`stat_label_short`), `taxonomy`, `attributes`.

The view does **presentation + escaping only** (`esc_html` / `esc_url` /
`wp_kses_post`). Data prep stays in `render.php`. Per-type views are picked by
filename — **no router edits** needed to add a card.

## Wiring (after scaffold)

1. Editor import — add to the theme's `src/index.js`:
   ```js
   import './blocks/post-card';
   ```
2. Bootstrap — include once from `functions.php`:
   ```php
   include get_template_directory() . '/src/blocks/post-card/init.php';
   ```
3. Build editor assets: `npm run build` (`variation.js` is plain JS, no build).

## CPT support

CPTs are added via the `{{NAMESPACE}}_post_card_configs` filter (a Query Loop
variation + pattern + default pill taxonomy) and KPI metrics via
`{{NAMESPACE}}_post_card_stats`. **The CPT itself must already be registered**
(the module does not register post types). A CPT card with its own look gets a
generated `post-card-{type}.php` + `.post-card--{type}` styles.

## Plugin (instead of theme)

In a plugin, swap the enqueue URL in `{{NAMESPACE}}_post_card_enqueue_variation()`
to `plugins_url('variation.js', __FILE__)` and register the block from the
plugin (`register_block_type(__DIR__)`).
