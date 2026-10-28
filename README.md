# Silince Gutenberg Builder

A Claude Code plugin that turns Figma designs, HTML and SCSS, or React pages into native Gutenberg blocks. Eight agents analyse, generate, validate and fix each block against one written standard: InnerBlocks first, Context API for parent and child blocks, BEM, CSS custom properties from theme.json, escaped render.php. Pages convert section by section with a pause after each, and progress survives a chat restart.

The plugin id is `silince-gutnebrg-builder` (an old typo, kept so existing installs and settings keep working), so commands start with `/silince-gutnebrg-builder:`. Why and how it was built: [docs/case-study.md](docs/case-study.md).

## Why

- Hand-building blocks is slow, and blocks from different projects drift apart: different attribute names, different ways to nest inner blocks, styles that ignore theme.json.
- An agent can write a block in minutes, but left alone it repeats the same mistakes: wrong `supports`, markup that fails block validation after an edit, hard-coded colors.
- This plugin keeps the speed of generation and adds the consistency of a strict standard: every agent reads the same rules, and a validator checks the output against them before a block is accepted.

## Requirements

- [Claude Code](https://code.claude.com/).
- A WordPress block theme built with `@wordpress/scripts`, with design values in `theme.json`.
- For Figma sources: the Figma MCP server (configured in `.mcp.json`, needs a Figma account).
- For `claude.ai/design` URLs: the `claude_design` MCP, authorized with `/design-login`. Local handoff folders and HTML files work without it.
- Context7 MCP for current WordPress documentation (configured in `.mcp.json`). It works without a key at lower rate limits; to use a key, set the `CONTEXT7_API_KEY` environment variable.

## Install

From GitHub, inside Claude Code:

```
/plugin marketplace add superherono/silince-gutenberg-builder
/plugin install silince-gutnebrg-builder@silince-gutenberg-builder
```

Or load a local clone for one session: `claude --plugin-dir ./silince-gutenberg-builder`.

Then add the project settings described in [Configuration](#configuration) and check the setup with `/silince-gutnebrg-builder:test`.

## Quick Start

Three workflows depending on your input:

```bash
# 1. One block from Figma URL or HTML path
/silince-gutnebrg-builder:create-block <figma-url-or-html-path>

# 2. One section from prepared HTML+SCSS
/silince-gutnebrg-builder:convert-html <path-to-html> [<path-to-scss>]

# 3. Whole React page from claude.ai/design — section by section, with persistent state
/silince-gutnebrg-builder:convert-react-page https://claude.ai/design/<hash>
```

For typical projects use **#3** — it queues all sections, pauses for confirmation between each, and survives chat restarts via `--continue`.

## Structure

```
silince-gutenberg-builder/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── .mcp.json                              # Figma and Context7 MCP servers
├── GUTENBERG_BLOCK_STRUCTURE_PROMPT.md   # Central architecture standard (read by all agents)
├── agents/                                # Sub-agent prompts (isolated contexts)
│   ├── analyzer.md                       # Design → JSON spec
│   ├── brand-brief-extractor.md          # claude.ai/design chats → brand-brief.json
│   ├── design-tokens-creator.md          # [RETIRED] tokens now come from theme.json
│   ├── fixer.md                          # Auto-fix validator errors
│   ├── generator.md                      # JSON spec → block files
│   ├── react-section-converter.md        # One React section → block
│   ├── template-processor.md             # Template instantiation
│   └── validator.md                      # Validation against rules
├── commands/                              # Slash commands
│   ├── analyze-design.md
│   ├── convert-html.md
│   ├── convert-react-page.md             # Multi-section workflow with state
│   ├── create-block.md
│   ├── create-design-tokens.md
│   ├── force-fix.md
│   ├── generate-button-variants.md       # Regenerate button variants/sizes from design system
│   ├── show-fix-guide.md
│   ├── test.md                           # Setup check
│   └── validate-block.md
├── prompts/                               # Coding standards (referenced by agents)
│   ├── bem-methodology.md
│   ├── coding-rules.md
│   ├── gutenberg-best-practices.md
│   ├── html-to-gutenberg.md              # /convert-html standard
│   ├── jsx-to-gutenberg-rules.md         # /convert-react-page standard
│   └── wordpress-coding-standards.md
├── guides/                                # Detailed references
│   ├── auto-fix-examples.md
│   ├── button-template-system.md
│   ├── button-variant-generation.md
│   ├── command-orchestration.md
│   ├── component-registry.md             # Consume COMPONENTS.md (data-component) + variant policy
│   ├── css-custom-properties.md
│   ├── innerblocks-composition.md        # InnerBlocks + parent/child + 3-part unlock
│   ├── icon-system.md
│   ├── post-cards-reuse.md               # Reuse {ns}/post-card for post listings (Query Loop)
│   ├── validation-core-rules.md          # supports-invariant, BEM, security
│   └── validator-error-reporting.md
├── templates/                             # Concrete copy-templates (not scaffolds)
│   ├── button/                           # Default-button reference template
│   └── post-card/                        # Post-card module (scaffolded when a project has none)
├── examples/                              # Sample output: a generated before/after section block
├── docs/case-study.md                     # Why and how the plugin was built
└── WORKLOG.md                             # Change history
```

## Architecture

Multi-agent system. The orchestrating command runs in the main context; sub-agents run in isolated contexts and return short summaries. Heavy reads (design files, generated code, validation reports) never leak into the main context.

| Agent                     | Role                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `analyzer`                | Reads Figma/HTML, returns JSON specification                                                        |
| `brand-brief-extractor`   | Reads claude.ai/design chats, extracts brand brief (fonts, palette, sections, caveats)              |
| `design-tokens-creator`   | ⚠️ Retired — design tokens now come from the theme's `theme.json`                                   |
| `react-section-converter` | Reads one React section from Homepage HTML, produces complete block (used by `/convert-react-page`) |
| `generator`               | Reads JSON spec + standards, generates block files                                                  |
| `validator`               | Validates block against rules, returns error report                                                 |
| `fixer`                   | Reads error report, applies auto-fixes (15+ recipes)                                                |
| `template-processor`      | Instantiates code templates with project values                                                     |

**Central reference:** [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md](GUTENBERG_BLOCK_STRUCTURE_PROMPT.md) — every agent reads this. It defines the InnerBlocks-first architecture, parent/child composition with Context API, useBlockProps usage, and the canonical edit.js / save.js / block.json templates.

## Configuration

Create `src/.claude/config.json` in your project:

```json
{
	"pluginSettings": {
		"silince-gutnebrg-builder": {
			"namespace": "yourtheme",
			"textdomain": "yourtheme",
			"blocksDir": "./src/blocks",
			"blockCategory": "yourtheme-blocks",
			"themeJsonPath": "theme.json",
			"themeAliasesPath": "src/scss/variables.scss",
			"designSystemPath": "src/DESIGN.md",
			"frontendJs": {
				"strategy": "shared-bundle",
				"entry": "src/custom-frontend.js",
				"modulesDir": "src/js"
			},
			"autoFix": {
				"enabled": true,
				"maxIterations": 2
			}
		}
	}
}
```

All paths resolve relative to the theme root. Defaults: `blocksDir` → `./blocks`, `themeJsonPath` → `theme.json`, `themeAliasesPath` → `src/scss/variables.scss`.

`frontendJs` declares **where block frontend JavaScript lives** (slider/accordion init, etc.). `shared-bundle` — the theme ships a single frontend bundle (`entry`); blocks emit **no `viewScript`/`view.js`**, and rare unique JS goes into `modulesDir` wired into `entry`. `per-block-view` — each block may ship its own `view.js`. If unset, the tooling detects the strategy from `webpack.config.js`/blocks-init (and asks if ambiguous). The generator/converters emit **structure + hook classes only** under `shared-bundle` — you wire the init. See [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md §8.1-bis](GUTENBERG_BLOCK_STRUCTURE_PROMPT.md). `designSystemPath` has **no default** — point it at your design-system markdown (the file with `components.button-*` recipes) to drive [button variant generation](#generate-button-variants-block-name); if it is unset or the file is missing, generation **asks you what to do** (re-point the path, generate a palette-derived default, or cancel) — it never falls back silently. See [guides/css-custom-properties.md](guides/css-custom-properties.md) and [guides/button-variant-generation.md](guides/button-variant-generation.md).

## Commands

### `/create-block <source>`

Full workflow for a single block from Figma URL or HTML path.

- `--name`, `--title`, `--category` — override metadata
- `--skip-validation` — skip validation step

### `/convert-html <html-path> [<scss-path>]`

Convert one prepared HTML+SCSS section. SCSS is copied as-is. CSS classes from HTML are preserved verbatim. Standard: [prompts/html-to-gutenberg.md](prompts/html-to-gutenberg.md).

### `/convert-react-page <source>`

Multi-section workflow with persistent state in `{blocksDir}/.conversion-state.json`. Source can be a `claude.ai/design` URL, a local handoff folder, or a single HTML file (fallback). Pauses between sections for confirmation; resumes across chat sessions.

- `--continue` — resume from state file (use in a new chat after a break)
- `--status` — show progress without converting
- `--retry <name>` — regenerate a specific section from current source
- `--skip <name>` — mark section as `skipped`
- `--update-source <url> [--regenerate <name>[,<name>...]]` — replace source with a new URL after design changes; reindexes sections, syncs `lines` coordinates, optionally regenerates listed sections (or asks interactively). Use this when the designer iterates on the design.
- `--reset` — delete state file and start over

Accepts both source URL formats: `https://claude.ai/design/p/<hash>?file=Homepage.html` (current) and `https://claude.ai/design/<hash>` (legacy). **URL import goes through the `claude_design` MCP only** (auth via `/design-login`) — WebFetch is not used. If the MCP is unavailable: interactive runs stop immediately with guidance (authorize, or pass a local handoff folder / HTML path); `--no-comments` runs do a bounded smart retry then report and stop. A local handoff folder or HTML path needs no MCP. If the handoff carries a `COMPONENTS.md` (section-component registry), the workflow reads it to pre-fill the component/variant decisions — see [Section-component registry](#section-component-registry-componentsmd).

See [commands/convert-react-page.md](commands/convert-react-page.md) for the full state file schema and per-mode workflows.

### `/analyze-design <source>`

Analysis only — produces JSON specification without generating files.

- `--output <file>` — save specification
- `--name <block-name>` — suggested block name

### `/validate-block <name>`

Validate an existing block against [guides/validation-core-rules.md](guides/validation-core-rules.md).

- `--fix` — auto-fix detected errors via the fixer agent
- `--strict` — include recommendations (warnings)
- `--report <file>` — save validation report

### `/generate-button-variants [block-name]`

Regenerate the button block's color variants (`primary`/`secondary`/… — set comes from the design system) and size axis (`small`/`medium`/`large`), synced across **4 surfaces**: `style.scss` (`$button-variants`/`$button-sizes` maps), `block.json` (`enum`), `edit.js` (`SelectControl`), `save.js`. Values resolve to `var(--alias)` from `theme.json`. Contract: [guides/button-variant-generation.md](guides/button-variant-generation.md).

- block-name optional — defaults to the `button` role in the common registry (usually `default-button`)
- `--dry-run` — show the generated output without writing
- The same generation runs automatically at button creation (`generator.md`, step A.2.4); this command is for re-generating an existing button.

### `/force-fix <name>`

Run the fixer agent without prior validation. Useful when you know what's broken.

- `--max-iterations <num>` — max fix attempts (default: 3)
- `--backup` — create backup before fixing
- `--only <types>` — fix only specific error types (comma-separated)

### `/create-design-tokens <source>` — ⚠️ DEPRECATED

Retired. Design tokens now come from the theme's `theme.json` (bridged to short aliases in `src/scss/variables.scss`). Blocks reference `var(--primary)`, `var(--space-lg)`, `var(--radius-md)`… directly. See [guides/css-custom-properties.md](guides/css-custom-properties.md).

### `/show-fix-guide <block-name>`

Print detailed manual fix instructions for issues the auto-fixer can't handle.

- `--type <error-type>` — show only one error type
- `--save <file>` — save guide to markdown

## Key Rules

The full ruleset lives in [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md](GUTENBERG_BLOCK_STRUCTURE_PROMPT.md) and [guides/validation-core-rules.md](guides/validation-core-rules.md). Critical points:

### InnerBlocks-first

Editable text content (headings, paragraphs, buttons) goes through `InnerBlocks` with core blocks, **not** through `RichText` + block attributes. Parent block attributes hold only display settings (toggles, colors, CSS variables).

```jsx
// ✅ Correct
const TEMPLATE = [
    ['core/heading', { level: 2, content: 'Title' }],
    ['core/paragraph', { content: 'Description' }],
];
<InnerBlocks template={TEMPLATE} />

// ❌ Wrong — text in attributes
<RichText value={title} onChange={(value) => setAttributes({ title: value })} />
```

### InnerBlocks defaults

The root `<InnerBlocks>` is rendered **without** `templateLock` and `allowedBlocks` by default. Add them only if the user explicitly asks to lock the structure. The `const ALLOWED_BLOCKS = [...]` constant is not generated unless `allowedBlocks` is actually passed somewhere. The 3-part unlock pattern for nested `core/group` grids applies **only** when the root has `templateLock="all"` — without a root lock, there's nothing to inherit. Full rule: [validation-core-rules.md#innerblocks-defaults](guides/validation-core-rules.md#innerblocks-defaults).

### supports-invariant

When `block.json` declares any of `supports.spacing | border | color | typography | shadow | dimensions`, the root tag **must** spread `useBlockProps()`:

```jsx
const blockProps = useBlockProps({ className: 'block-foo' });
return <section {...blockProps}>...</section>;
```

For dynamic blocks (`render.php`):

```php
$wrapper = get_block_wrapper_attributes( array( 'class' => 'block-foo' ) );
echo "<section {$wrapper}>...</section>";
```

Author `className` / `style` go **as arguments** into the hook/function, never as siblings of `{...blockProps}` (that overwrites supports-injected styles). Don't declare `style` in `attributes` — WordPress registers it automatically. Full rule: [validation-core-rules.md#supports-invariant](guides/validation-core-rules.md#supports-invariant).

### Parent/Child composition with Context API

Parent block exposes attributes via `providesContext`; child block declares `usesContext` and reads from `context` prop. Repeating elements (cards, items) become separate child blocks with `ancestor: ["{ns}/{parent}"]`. See [guides/innerblocks-composition.md](guides/innerblocks-composition.md).

### 3-part unlock for nested grids

When parent has `<InnerBlocks templateLock="all">` plus a nested `core/group` containing 2+ child blocks, all three must be set together:

1. `templateLock: false` on the nested group attributes
2. `allowedBlocks: ['{ns}/{child}']` on the same group
3. `ancestor: [...]` (not `parent`) in the child block.json

Skipping any one breaks editing in the nested grid. Detailed recipe in [innerblocks-composition.md](guides/innerblocks-composition.md).

### Shared blocks

For multi-section pages, shared components are reused instead of rebuilt:

- `{namespace}/custom-heading` — H2 section title (always; never `core/heading` for H2)
- `{namespace}/default-button` — buttons (preferred over `core/button` when available)
- `{namespace}/post-card` — post-cards listings (blog/news/case-studies/CPT) are reused via a native Query Loop, not rebuilt as static cards. If the project has no post-card yet, it is **scaffolded from [templates/post-card/](templates/post-card/)** (structure + server logic only) and the generator fills the markup (`post-card.php` / per-type `post-card-{type}.php`) and styles from the design. The CPT must already be registered. See [guides/post-cards-reuse.md](guides/post-cards-reuse.md).

`/convert-react-page` checks for them and offers to scaffold from [templates/button/](templates/button/) on first run. The `default-button`'s color variants and sizes are generated from the project's design system — see [`/generate-button-variants`](#generate-button-variants-block-name) and [guides/button-variant-generation.md](guides/button-variant-generation.md).

### Section-component registry (COMPONENTS.md)

When the design handoff from `claude.ai/design` ships a `COMPONENTS.md` — the **input** registry declaring which page sections are the same component (matrix, variants, shared CSS, page-specific list) plus `data-component="<Name>"` / `data-component-variant` markers on section roots — the converter consumes it instead of guessing:

- **Component vs page-specific** is read from the markers (the question is still asked, but the default is now correct — silent only in `--no-comments`).
- **Variant** is read from `data-component-variant` (authoritative over guessing `variant === 0/1/2`).
- **No cross-page dupes** — a shared component maps to one block; a second page that uses a different variant of the same `data-component` **retrofits the variant into the existing block** instead of spawning a look-alike.
- **Variant mechanism is hybrid** — visual/layout variants (e.g. `FAQ` stack↔split) become an admin-switchable `variant` attribute / block style; structural variants (e.g. `WhoFits` card-grid vs pill-list) become block **variations** chosen at insert time.

Two registries, kept separate: `COMPONENTS.md` (design-source truth, read-only) vs `{blocksDir}/common/.registry.json` (generated-block truth, read/write). Full contract: [guides/component-registry.md](guides/component-registry.md).

### CSS Custom Properties

Editable visual settings flow `attributes → useBlockProps style → SCSS var()`. Design values come from the theme's `theme.json` via short aliases (`var(--primary)`, `var(--space-lg)`, `var(--radius-md)`); hardcode only values absent from `theme.json`. Never emit raw `--wp--preset--*` or invent `--color-*`/`--radius-pill`. See [guides/css-custom-properties.md](guides/css-custom-properties.md).

### BEM modifiers

Modifiers as separate classes on the same element:

```jsx
// ✅ Correct
<h1 className="hero__title hero__title--white">

// ❌ Wrong — only the modifier, no base class
<h1 className="hero__title--white">
```

### SCSS

- **Media queries are isolated _inside each selector_** (block and every element separately). A single `@media` block at the bottom of `.block-X` that wraps both block-level and element-level rules is forbidden — see [scss-media-structure](guides/validation-core-rules.md#scss-media-structure).
- **`__container` styles are not written to `style.scss`.** Container styling is project-global; duplicating it per-block breaks centralized control over max-width / padding / breakpoints. The `__container` element remains in DOM and in `editor.scss` (where it carries InnerBlocks layout fixes). See [scss-no-container-styles](guides/validation-core-rules.md#scss-no-container-styles).
- REM units with px comments: `font-size: 3rem; // 48px`
- Max 3 nesting levels

### PHP security (render.php)

- `if ( ! defined( 'ABSPATH' ) ) exit;` at top
- Escaping: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`
- Defaults: `$var = $attributes['key'] ?? '';`
- Yoda conditions: `true === $var`
- Alternative syntax in templates: `if ( … ) : … endif;`

## Token Strategy

Token efficiency comes from three architectural choices, not from raw compression:

1. **Isolated sub-agents.** Heavy operations (reading design files, generating code, validating) run in separate contexts. The main context only sees short summaries. A 50K-token Homepage HTML never enters the main context — the converter agent reads it and returns a 300-token summary.
2. **InnerBlocks-first.** Text content lives in WordPress core blocks instead of being duplicated into block attributes + RichText components + save markup. This removes ~8K tokens of boilerplate per text-heavy block.
3. **Persistent state for multi-section work.** `/convert-react-page` saves progress to `.conversion-state.json` between sections. After ~5 sections the user can `--continue` in a fresh chat without re-reading the source. `--update-source` lets a single section be regenerated after design iteration without re-running the entire page (~25K vs ~150K for a full reset).

## Documentation

### Standards (read by agents)

- [GUTENBERG_BLOCK_STRUCTURE_PROMPT.md](GUTENBERG_BLOCK_STRUCTURE_PROMPT.md) — central architecture standard
- [prompts/html-to-gutenberg.md](prompts/html-to-gutenberg.md) — HTML+SCSS conversion rules
- [prompts/jsx-to-gutenberg-rules.md](prompts/jsx-to-gutenberg-rules.md) — React JSX conversion rules
- [prompts/bem-methodology.md](prompts/bem-methodology.md) — BEM naming
- [prompts/wordpress-coding-standards.md](prompts/wordpress-coding-standards.md) — PHP/JS standards

### Guides

- [guides/validation-core-rules.md](guides/validation-core-rules.md) — validator's rule reference (BEM, security, supports-invariant)
- [guides/innerblocks-composition.md](guides/innerblocks-composition.md) — InnerBlocks, parent/child, 3-part unlock
- [guides/css-custom-properties.md](guides/css-custom-properties.md) — CSS variables pattern
- [guides/auto-fix-examples.md](guides/auto-fix-examples.md) — auto-fix recipes by error type
- [guides/button-template-system.md](guides/button-template-system.md) — default-button template
- [guides/command-orchestration.md](guides/command-orchestration.md) — patterns shared by all commands
- [guides/component-registry.md](guides/component-registry.md) — consume COMPONENTS.md (data-component), variant hybrid, incremental retrofit

### Agent docs

- [agents/analyzer.md](agents/analyzer.md)
- [agents/brand-brief-extractor.md](agents/brand-brief-extractor.md)
- [agents/design-tokens-creator.md](agents/design-tokens-creator.md)
- [agents/generator.md](agents/generator.md)
- [agents/react-section-converter.md](agents/react-section-converter.md)
- [agents/validator.md](agents/validator.md)
- [agents/fixer.md](agents/fixer.md)
- [agents/template-processor.md](agents/template-processor.md)

## Limitations

- Validation is done by an agent against written rules, not by a linter or tests. A `block.json` linter and an end-to-end test that inserts each block in the editor would be cheaper and stricter; they are not there yet.
- The standards are long, and every agent run reads them, which costs context.
- The fixer gets at most two rounds; after that a human decides.
- Generated blocks still need review before they ship: the pipeline catches rule violations, not design judgement.
- Time saved (about 20 minutes per block against about 2.5 hours by hand, over three projects and about 100–120 blocks) is the author's estimate, not a measurement.

## How AI is used in development

The plugin itself was written with Claude Code. I write the architecture, the standards and the rules the agents follow; the agents write the block code and much of the plugin's own prompts, and every change is reviewed before it is kept. In daily use the pipeline stops after each section for confirmation, and the validator's report decides whether a block is accepted. [WORKLOG.md](WORKLOG.md) records what changed and why.

## Version

- **Plugin:** 1.0.0
- **Author:** Dmitrii Morozan
- **Updated:** 2026-07-03

See [WORKLOG.md](WORKLOG.md) for the change history.

## License

[MIT](LICENSE)
