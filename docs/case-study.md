# From design to native Gutenberg blocks: an agent pipeline with quality gates

*A Claude Code plugin that builds blocks to one standard*

**In short.** Designs reach me as Figma files, HTML and SCSS, or React pages from claude.ai/design. Each one has to become native Gutenberg blocks that a client can edit without breaking the layout. I built a Claude Code plugin where eight agents analyse the design, generate the block, validate it against written rules and fix what fails. I've used it on three projects for about 100–120 blocks. A typical block takes me about 20 minutes with it, against about 2.5 hours by hand.

## The problem

- Hand-building blocks is slow, and blocks from different projects drift apart: different attribute names, different ways to nest inner blocks, styles that ignore theme.json.
- An agent can write a block in minutes, but left alone it repeats the same mistakes: wrong `supports`, markup that fails block validation after an edit, hard-coded colours.
- I wanted the speed of generation and the consistency of a strict standard.

## How it works

```
/convert-react-page <design>
   │  orchestrator in the main context: queue of sections, state file
   ▼
analyzer ──► generator ──► validator ──► fixer (up to 2 rounds) ──► block files
   │            │              │
   │            │              └─ checks against written rules, returns an error report
   │            └─ block.json, edit.js, save.js or render.php, SCSS
   └─ design → JSON spec
```

- **Isolated contexts.** The orchestrating command runs in the main context. Each agent works in its own context and returns a short summary, so design files and generated code don't fill the main conversation.
- **One standard for every agent.** A central document defines the architecture: InnerBlocks first, parent and child blocks connected through the Context API, `useBlockProps`, canonical `block.json`, `edit` and `save` templates. Coding rules, BEM naming and WordPress coding standards sit next to it.
- **Rules the validator enforces.** A `supports` invariant, BEM class names, CSS custom properties from theme.json instead of hard-coded values, and escaping in `render.php`. The fixer has recipes for the common failures and gets at most two rounds; after that a human decides.
- **Section by section, with a pause.** A full page is queued as sections. After each one the plugin stops for confirmation. Progress lives in a state file, so the work survives a chat restart.
- **Per-project settings.** Namespace, paths, block category and the front-end JavaScript strategy (one shared bundle or a view script per block) come from a config file in the theme.

## A decision that changed the design

The first version had a separate agent that created design tokens for each project. In practice it duplicated what the theme already defines. I retired it and made the theme's `theme.json` the single source of truth for colours, spacing and type. One fewer agent, and no drift between the tokens and the theme.

## Results

- 8 agents, 10 commands, 11 guides.
- Used on three projects, about 100–120 blocks in total, refined from project to project.
- A typical block takes about 20 minutes instead of about 2.5 hours by hand, by my own estimate across those projects.

## What I'd do differently

- **Turn more prose rules into automatic checks.** The standards are long, and reading them costs the agents context on every run. A `block.json` linter and an end-to-end test that inserts each block and checks it passes validation would be cheaper and stricter.
- **Measure from the first project.** I estimated the time saved instead of logging it.
