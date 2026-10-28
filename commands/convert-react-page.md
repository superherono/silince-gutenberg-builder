---
description: Convert a React page from claude.ai/design into a set of Gutenberg blocks (one section at a time, with confirmation)
---

# Command: convert-react-page

Converts a **React app** (HTML with inline React and inline styles) obtained from claude.ai/design into a set of Gutenberg blocks. Works section by section — after each section it pauses for confirmation.

---

## 📥 Parameters

**source** (for the first run):

- A URL like `https://claude.ai/design/p/<hash>?file=<page>` (new) or `https://claude.ai/design/<hash>` (legacy) — imported **only via the `claude_design` MCP** (see STEP 1.1); WebFetch is not used
- Path to a local folder with an unpacked handoff bundle (contains `chats/`, `project/`, `README.md`) — does not require MCP
- Path to a single HTML file (fallback mode, without chat context) — does not require MCP

**Options:**

- `--continue` — continue a previously started conversion from the state file (can be done in a new chat)
- `--status` — show progress without converting
- `--retry <name>` — recreate a section's block from the CURRENT source (if it was generated incorrectly)
- `--skip <name>` — mark a section as `skipped`, do not convert it
- `--update-source <url> [--regenerate <name>[,<name>...]]` — replace the source with a new link (after design edits), reindex the sections in the queue, optionally regenerate the specified ones. Without `--regenerate` it shows a diff and asks interactively.
- `--reset` — delete the state file and start over (with confirmation)
- `--no-comments` — fully autonomous mode: DO NOT ask the user A SINGLE question (no pre-generation notes on a section, no queue approval, no per-section choices, no pauses between sections), run the whole queue to the end on defaults. Contract and defaults table: `guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`. Applies to a new run and to `--continue`.

---

## 📁 State file

All runs save their state to `{blocksDir}/.conversion-state.json`:

```json
{
  "source": "https://claude.ai/design/...",
  "sourceLocalPath": "src/.claude/handoffs/<hash>/",
  "sourceHtml": "src/.claude/handoffs/<hash>/project/Homepage.html",
  "sourceHash": "<hash>",
  "themeJsonPath": "theme.json",
  "brandBrief": "src/.claude/handoffs/<hash>/brand-brief.json",
  "commonRegistry": "blocks/common/.registry.json",
  "componentsRegistry": "src/.claude/handoffs/<hash>/COMPONENTS.md",
  "sharedBlocks": {
    "default-button": "blocks/common/default-button",
    "custom-heading": "blocks/common/custom-heading"
  },
  "queue": [
    {
      "n": 1,
      "name": "hero",
      "lines": [264, 472],
      "status": "done",
      "block": "blocks/hero",
      "component": "Hero",
      "componentVariant": "centered",
      "shared": true,
      "userChoices": { "variant": "centered", "interactivity": "none" },
      "userNotes": "Logo — a placeholder, do not build it; CTA links to the #contact anchor",
      "completedAt": "2026-05-02T12:30:00Z",
      "validationStatus": "passed"
    },
    { "n": 2, "name": "trust-strip", "lines": [522, 690], "status": "in-progress" },
    { "n": 3, "name": "what-we-do", "lines": [692, 729], "status": "pending" }
  ],
  "sourceHistory": [
    {
      "source": "https://claude.ai/design/<OLD_HASH>",
      "sourceHash": "<OLD_HASH>",
      "replacedAt": "2026-05-04T09:00:00Z",
      "regenerated": ["hero", "process"],
      "added": [],
      "missing": ["legacy-banner"]
    }
  ],
  "createdAt": "2026-05-02T12:00:00Z",
  "updatedAt": "2026-05-02T12:30:00Z"
}
```

**Optional fields of `queue[]` entries:**

- `userNotes: string | null` — the user's pre-generation notes on the section (from STEP 6.1). Passed into the converter's `input.userNotes`. `null`/absent = there were no comments (or autonomous mode).
- `component: string` — the name from `data-component` in the source (PascalCase, e.g. `WhoFits`). Present → the section — a shared component, its identity is checked against COMPONENTS.md. Absent → page-specific.
- `componentVariant: string` — from `data-component-variant` (e.g. `split`). Prefills the Variant question (STEP 6.1).
- `shared: boolean` — the section is marked with `data-component` AND is present on >1 page according to the COMPONENTS.md matrix. Default group = `common`.

**Optional fields of `queue[]` entries** (appear after `--update-source`):

- `previousLines: [start, end]` — where the section lived in the previous source (for auditing).
- `lastSourceHash: "<hash>"` — hash of the source the section was generated from (differs from the current `sourceHash` if `--update-source` updated the coordinates but did not regenerate the block).
- `status: "missing"` — no section with the same name was found in the new source; the block stays on disk, the `lines` coordinates are kept stale.

---

## 🔄 Workflow

> **Common patterns:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md`

### STEP 0: Reading the config and routing

1. Read `src/.claude/config.json` → `pluginSettings['silince-gutnebrg-builder']`:
   - `namespace`, `textdomain`, `blocksDir`, `blockCategory`
   - Record `autonomous = whether the --no-comments flag is present`. In autonomous mode the command asks NOT A SINGLE question in any of the steps below — apply the defaults from `guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`.
2. **If `--continue` / `--status` / `--retry` / `--skip` / `--update-source` is present:**
   - Read `{blocksDir}/.conversion-state.json`
   - If the file does not exist → error: "No active conversion. Run `/convert-react-page <source>` first"
   - Go to the corresponding mode (see below)
3. **If `source` is present** (new run):
   - If the state file already exists → ask via AskUserQuestion: "Found an unfinished conversion. Continue (--continue) / Update design (--update-source) / Start over (--reset) / Cancel?"
     **🤖 With `--no-comments`:** do not ask — choose `--continue` (non-destructive), record this in the auto-decisions.
   - Otherwise → go to STEP 1

---

### STEP 1: Getting the source

Determine the source type and prepare a local copy.

#### 1.1 claude.ai/design URL — import ONLY via the `claude_design` MCP

Loading by URL goes **exclusively through the `claude_design` MCP** (`https://api.anthropic.com/v1/design/mcp`, authorization `/design-login`). **WebFetch is NOT used** — the design API requires authorization that WebFetch does not have; an auto-fallback would only waste time. No MCP → see the unavailability handling below (no fallback).

**Link parsing** (needed to tell the MCP the project and the target file):

```javascript
// Forms: new https://claude.ai/design/p/<hash>?file=... · old https://claude.ai/design/<hash>
const m = source.match(/\/design\/(?:p\/)?([A-Za-z0-9_-]+)/);
const hash = m ? m[1] : source.split('/design/')[1]?.split(/[?#]/)[0];
const fileRaw = (source.match(/[?&](?:open_)?file=([^&#]+)/) || [, 'Homepage.html'])[1];
const targetFile = decodeURIComponent(fileRaw); // '%2F' → '/'; the primary HTML may be NESTED (e.g. 'web-development/index.html')
```

**Preflight — MCP availability (instant, no waiting).** Check whether the `claude_design` MCP is registered: whether its tools are in the tool list (or find them via `ToolSearch` for `claude_design` / `mcp__*design*`). This is the key anti-hang step — no tool → "MCP is structurally absent", DO NOT try to call it and DO NOT wait.

**Import.** MCP is available → resolve the exact project import tool via `ToolSearch`, call it with `hash` (and `targetFile` as the target file). Normalize the result into `src/.claude/handoffs/<hash>/` so that `project/<targetFile>`, `chats/*.md`, `README.md`, `COMPONENTS.md` appear. If the MCP returns a **gzip+tar archive** — unpack it:

```powershell
$extractDir = "src/.claude/handoffs/<hash>"
New-Item -ItemType Directory -Path $extractDir -Force
$inStream = [System.IO.File]::OpenRead($downloadedBin)   # path to the archive returned by the MCP
$gz = New-Object System.IO.Compression.GzipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
$tarPath = "$extractDir.tar"
$tarOut = [System.IO.File]::Create($tarPath)
$gz.CopyTo($tarOut); $gz.Close(); $tarOut.Close(); $inStream.Close()
tar -xf $tarPath -C $extractDir
Remove-Item $tarPath
```

**Handling MCP unavailability / errors** (NEVER fall back to WebFetch, NEVER loop in interactive mode):

- **Interactive (no `--no-comments`):** DO NOT wait, DO NOT retry. Stop the conversion and report:
  > MCP `claude_design` is unavailable/not authorized. Options: **(1)** connect and authorize it (`/design-login`), then rerun the command; **(2)** provide the path to an already unpacked handoff folder or to an HTML file (modes 1.2/1.3).
- **Autonomous (`--no-comments`) — smart retry** (there is no user, no one to ask):
  - **MCP is present but returned a transient/auth error** (a blip, authorization in progress) → retry with backoff, **limited** (up to 4 attempts: ~2s → 8s → 20s → 40s). Exhausted → **failure report and stop**, the conversion does not start.
  - **MCP is structurally absent** (no tool per preflight) → nothing to retry → **immediate failure report and stop** (no endless idle loops).
  - Record the cause and the number of attempts in the `🤖 Auto-decisions (--no-comments)` section of the report.

After normalization make sure the following exist:
- `<extractDir>/<projectName>/project/<targetFile>` — the target primary HTML from `?file=` (may be **nested**, e.g. `project/web-development/index.html`; NOT necessarily `Homepage.html`). Not found at the direct path → Grep the basename across `project/`.
- `<extractDir>/<projectName>/chats/*.md`
- `<extractDir>/<projectName>/README.md`

**Find `COMPONENTS.md`** (the input registry of section components) — in descending order of priority: `<extractDir>/<projectName>/COMPONENTS.md` → `<extractDir>/COMPONENTS.md` → Grep across the unpacked folder. Found → write the absolute path to `state.componentsRegistry`. Not found → continue with heuristics, but note in the final report "COMPONENTS.md not found — component identity was not checked". Reading contract: [component-registry.md](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md).

#### 1.2 Path to a local folder

Check that the folder contains `project/` and `chats/`. If not — fall back to mode 1.3.

#### 1.3 Path to a single .html file (fallback)

Write to state `sourceHtml` = the given path, `chats` = an empty array. In this case the brand brief will **not** be extracted — all questions are asked manually via AskUserQuestion.

---

### STEP 2: Brand brief (only if there are chats)

```
╔══════════════════════════════════════╗
║  📋 Extracting brand brief...        ║
╚══════════════════════════════════════╝
```

**Task Tool:**

```javascript
Task({
  description: 'Extract brand brief from chats',
  subagent_type: 'general-purpose',
  prompt: `
You are the Brand Brief Extractor agent.
Read the instructions: agents/brand-brief-extractor.md

Input:
  chatPaths: ${JSON.stringify(chatPaths)}
  htmlPath: ${htmlPath}

Save brand-brief.json in the same folder as chats (i.e. <handoffDir>/brand-brief.json).
Return the path and a short summary.
  `,
  model: 'haiku',
});
```

The result — the path to `brand-brief.json` + a summary (shown to the user in the chat).

---

### STEP 3: Indexing sections

**Without reading the whole HTML** — only Grep by structural markers.

**Priority 1 — component markers** (authoritative identity + variant, [component-registry.md](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md#-markers-in-the-source)):

```javascript
const markers = Grep({
  pattern: 'data-component=(?:"|\')([A-Za-z0-9]+)(?:"|\')(?:[^>]*data-component-variant=(?:"|\')([\\w-]+)(?:"|\'))?',
  path: htmlPath, output_mode: 'content', '-n': true,
});
```

**Priority 2 — fallback boundaries** for sections WITHOUT `data-component` (page-specific): function name + section comment, as before:

```javascript
const fallback = Grep({
  pattern: '^function\\s+([A-Z]\\w+)\\s*\\(|^//\\s*=========\\s*([A-Z][A-Z\\s]+)\\s*=========',
  path: htmlPath, output_mode: 'content', '-n': true,
});
```

Build the index — an array `{ name, startLine, endLine, component?, componentVariant?, shared? }`. `endLine` for section N = `startLine` of section N+1 minus 1 (the last one — to the end of the file).

**Cross-check with COMPONENTS.md** (if `state.componentsRegistry` was found): for a section with `data-component` set `component`, `componentVariant`, and `shared = (the component is in the matrix AND present on >1 page)`. Mark sections from the "Page-specific sections" part of COMPONENTS.md as `shared: false` even if they happen to have a marker. Normalize the index name PascalCase → kebab (`WhoFits` → `who-fits`) — the rule is in [component-registry.md → Normalization](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md#-name-normalization-pascalcase--kebab).

Section names — **bare** (kebab-case from the component name/section comment, WITHOUT a page prefix): `industries`, not `home-industries`. The converter builds `title` as Title Case from this name without a category prefix (see `agents/react-section-converter.md` §4.1 + base standard §8).

**Filtering by brand brief:**
- If `brandBrief.sections[]` exists — keep only those sections (by name, normalized to kebab-case)
- Otherwise — show everything except obvious service ones (`useTweaks`, `TweaksPanel`, `TweakRow`, `Segment`, `Cycle`, helper components `PrimaryBtn`/`GhostBtn`/`SectionLabel`/`SectionTitle`/`LogoMark`/`Avatar`/`Field`/`Chip`/`FooterCol`)

---

### STEP 4: User approval of the queue

Show the index as a table:

```
📑 Sections found: 13

  №  Name               Lines       Brand brief
  1  nav                172-258     ✓ required
  2  hero               264-472     ✓ variant=centered
  3  trust-strip        522-690     ✓ required
  4  what-we-do         692-728     ✓ required
  5  industries         820-891     ✓ required
  6  cases              893-1176    ✓ variant=editorial, layout=slider
  7  testimonials       1179-1322   ✓ required
  8  process            1368-1402   ✓ "horizontal connected circles"
  9  why-us             1429-1454   ✓ required
 10  faq                1512-1538   ✓ accordion=true
 11  areas              1576-1587   ✓ required
 12  final-cta          1589-1634   ✓ required
 13  footer             1636-1674   ✓ required

Excluded: TweaksPanel, ContactPanel (UI-only), helpers

Caveats from the brand brief:
  • Logo placeholder
  • Contact form UI-only
  • Case imagery placeholder
```

**🤖 With `--no-comments`:** do not ask — convert all found sections, immediately create the state file with the full queue (status `pending`) and go to STEP 5/6.

**AskUserQuestion:**

```
question: 'Confirm the queue?'
options:
  - 'Yes — convert all 13'
  - 'Choose manually'
  - 'Cancel'
```

If "choose manually" — ask a second AskUserQuestion with multi-select by section names.

After confirmation — create the state file with `queue: [...]` (status `pending` for all).

---

### STEP 5: Preparing tokens and shared blocks

#### 5.1 Theme tokens

The source of design tokens — the theme's `theme.json` (paths `themeJsonPath`/`themeAliasesPath` from `src/.claude/config.json`, defaults `theme.json` / `src/scss/variables.scss`). A separate `design-tokens.json` is NOT created (retired). The converter substitutes theme aliases according to the [css-custom-properties.md](${CLAUDE_PLUGIN_ROOT}/guides/css-custom-properties.md) contract. No further action is required — go to 5.2.

<!-- legacy:

```
╔══════════════════════════════════════╗
║  🎨 Creating design tokens...        ║
╚══════════════════════════════════════╝
```

-->
<!-- /legacy 5.1 — design-tokens.json is retired, token source = the theme's theme.json -->

#### 5.2 Common blocks and the registry

The source of truth for reusable blocks — the registry `{blocksDir}/common/.registry.json` (see [innerblocks-composition.md → Common components](${CLAUDE_PLUGIN_ROOT}/guides/innerblocks-composition.md#-common-components-registry-promotion-auto-reuse)). `state.sharedBlocks` — a cache of this registry.

Read the registry (no file → empty) and check the base roles on disk:

```javascript
const registry = readJSON(`${blocksDir}/common/.registry.json`) || { blocks: {} };
const hasRole = (role) => Object.entries(registry.blocks).some(([, v]) => (v.roles || []).includes(role) && exists(`${blocksDir}/${v.dir}`));
```

If the base roles (`button`, `h2`) are missing and at least one section in the queue uses buttons/H2 — ask:

```
AskUserQuestion:
  question: 'Create common blocks (default-button, custom-heading) now?'
  hint: 'Reused in all sections, added to the registry. Without them buttons = core/button, H2 = core/heading.'
  options:
    - 'Yes, create now (recommended)'
    - 'No, use core blocks'
```

If "yes" — DO NOT generate from scratch: the button comes from `templates/button/`, custom-heading from a stub; put them in `{blocksDir}/common/`, **write them to the registry** (`{ kind: 'primitive', roles, dir: 'common/{name}' }`).

Promotion of other primitives (icon-tile, badge, card) and common sections — **along the way** in the loop (STEP 6): the converter detects roles and proposes promotion. Sync `state.sharedBlocks` with the registry after each promotion.

---

### STEP 6: Loop over sections (with a pause)

For each section in `queue` with `status: "pending"`:

#### 6.1 Per-section user choices

**🤖 With `--no-comments` (autonomous): DO NOT ask A SINGLE question in this step** (neither choices nor comments). Apply the defaults (`guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`): variant — from `componentVariant` (marker), otherwise the first/default one; group — `common` if `shared: true`, otherwise `page`; interactivity — by `frontendJs.strategy` (`shared-bundle` → `structure-only`, otherwise `none`); `userNotes = null`. Record them in the report's auto-decisions and go to 6.2.

If the section is mentioned in `brandBrief.variantDecisions` — the structural choices are prefilled, skip the variant/interactivity/group questions (but still ask the comments question below, unless autonomous).

**🥇 Post listing gate — before the questions.** First run the `post-cards` role detection ([post-cards-reuse.md → When it triggers](${CLAUDE_PLUGIN_ROOT}/guides/post-cards-reuse.md#when-it-triggers-detection)). The section — a post listing (blog/news/articles/case studies/CPT, `.map()` over posts, `<article>`)? → it is served via Query Loop + `{namespace}/post-card` (slider — static wrapper §3-bis). In this case **skip the Interactivity question** (the listing's front-end JS — the user's/shared bundle's area, see `frontendJs`) and do not propose a bespoke `render.php`. Pass the post-listing flag to the converter.

Otherwise — ask via AskUserQuestion (only what is genuinely ambiguous).

> 🧭 **Prefill from COMPONENTS.md (does not remove the question, it makes the default correct).** If the section has `component`/`componentVariant`/`shared` (from STEP 3) — the Group and Variant questions are asked with the correct default already set, the user confirms or changes it. In autonomous mode the default is applied without a question. Contract: [component-registry.md](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md).

- **Group:** `page` or `common`. **Default from the source:** `shared: true` (has `data-component` AND the component is on >1 page per the matrix) → propose `common`; a section from the page-specific list in COMPONENTS.md or without a marker → `page`. If the `common/.registry.json` registry already has a block with this `component`/name — **DO NOT generate a duplicate**: reuse the section, and for a new `componentVariant` — **add the variant to the existing block** (incremental retrofit, [component-registry.md → Retrofit](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md#-incremental-variant-retrofit)). See also [innerblocks-composition.md → Common sections](${CLAUDE_PLUGIN_ROOT}/guides/innerblocks-composition.md#-common-components-registry-promotion-auto-reuse).
- **Variant:** prefill from `componentVariant` (`data-component-variant`); if there is no marker — as before (`variant === 0/1/2` in JSX). For a shared component show the variant type (visual/structural) and the inferred mechanism (`attribute` / `block-style` / `variations`) — the user can override it. The mechanism is passed to the converter as `variantMechanism`.
- **Interactivity:** if the JSX has `useState` for UI state (slider, accordion, modal). **First check `frontendJs.strategy`** (§8.1-bis of the base standard): with `shared-bundle` the agent outputs only the structure + hook classes (WITHOUT `view.js`/`viewScript`), init — the user's/shared bundle's area, so `view-script` does not apply. Options:
  - `none` — degrade to static
  - `structure-only` (shared-bundle) — markup + hook classes, JS in the shared bundle (default for themes with a single front-end bundle)
  - `view-script` — vanilla JS view.js (**only if `frontendJs.strategy === 'per-block-view'`**)
  - `interactivity-api` — `@wordpress/interactivity` (advanced)

- **Section comments (default):** add to the same `AskUserQuestion` batch a free-form question "Are there any non-obvious points or wishes for this section that I should take into account before generation?" (two ways to answer: a "No" option + a free-text field). If all structural choices are prefilled by the brief — ask this question as a separate minimal `AskUserQuestion`. Contract: `guides/command-orchestration.md#-6-pre-generation-notes-pre-emptive-comments`.

Save the structural answers to `state.queue[i].userChoices`, and the free-form comments — to `state.queue[i].userNotes` (`null` if "No"). Update the state file.

#### 6.2 Running react-section-converter

Build `input` according to the schema in `agents/react-section-converter.md` (§ "Input"). **You MUST include `userNotes: state.queue[i].userNotes`** (if not empty) — on a par with `userChoices`. In autonomous mode `userNotes` will be `null`.

**For shared components also pass** (if present): `component`, `componentVariant`, `shared`, `variantMechanism` (from STEP 6.1) and `componentsRegistryPath: state.componentsRegistry`. With these the converter pulls the component entry from COMPONENTS.md and chooses the variant mechanism / retrofit (see `agents/react-section-converter.md` § "Input" + [component-registry.md](${CLAUDE_PLUGIN_ROOT}/guides/component-registry.md)).

```javascript
Task({
  description: `Convert section: ${sectionName}`,
  subagent_type: 'general-purpose',
  prompt: `
You are the React Section Converter agent.

Read the instructions: agents/react-section-converter.md
Its Step 1.1 lists all the files you must read before generation (including GUTENBERG_BLOCK_STRUCTURE_PROMPT.md). Do not skip these reads — without them the block code will be incompatible with the plugin's other blocks.

Input:
${JSON.stringify(input, null, 2)}

Create the set of block files in ${blocksDir}/${sectionName}/.
Return a compact summary (≤300 tokens).
  `,
});
```

#### 6.3 Validation

The same Validator agent is used as in `/create-block`/`/validate-block` (its instructions in `agents/validator.md` already reference the base standard).

```javascript
Task({
  description: `Validate ${sectionName}`,
  subagent_type: 'general-purpose',
  prompt: `You are the Validator. Read agents/validator.md. Block path: ${blocksDir}/${sectionName}.`,
});
```

If there are errors — auto-fix them via the Fixer agent (1 iteration, not 3, to avoid looping):

```javascript
Task({
  description: `Fix ${sectionName}`,
  subagent_type: 'general-purpose',
  prompt: `You are the Fixer. Read agents/fixer.md. Path: ${blocksDir}/${sectionName}. Report: ${validationResult}.`,
});
```

If errors remain after the fix — mark `validationStatus: "issues"`, **do not block** the following sections.

#### 6.4 Updating the state

```javascript
state.queue[i].status = 'done';
state.queue[i].block = `${blocksDir}/${sectionName}`;
state.queue[i].completedAt = new Date().toISOString();
state.queue[i].validationStatus = validatorResult.status; // passed | issues
state.updatedAt = new Date().toISOString();
Write(stateFilePath, JSON.stringify(state, null, '\t'));
```

#### 6.5 Pause between sections

**🤖 With `--no-comments` (autonomous): DO NOT pause and DO NOT ask a question.** Show a brief section report and go straight to the next `pending` section (6.1) until the end of the queue, then — STEP 7.

Show the report:

```
✅ Done: ${sectionName} (${filesCreated} files, validator: ${validatorStatus})

📊 Progress: ${doneCount}/${totalCount}
⏭️ Next: ${nextSectionName || '— queue is empty'}

⚠️ Context: ~${estimatedTokens}K tokens used
${doneCount > 0 && doneCount % 5 === 0 ? '💡 Recommended: after every 5 sections — continue in a new chat via --continue' : ''}
```

**AskUserQuestion:**

```
question: 'What next?'
options:
  - 'Continue (convert ${nextSectionName})'
  - 'Pause (exit, will resume via --continue)'
  - 'Skip ahead (skip ${nextSectionName})'
  - 'Regenerate ${sectionName} (if something is wrong)'
  - 'Stop (finish and summarize)'
```

Answer handling:

- **Continue** → next loop iteration (6.1)
- **Pause** → go to STEP 7
- **Skip ahead** → `state.queue[i+1].status = 'skipped'`, update state, → next
- **Regenerate** → `state.queue[i].status = 'pending'`, delete the created files, → 6.1 for the current section
- **Stop** → STEP 7

---

### STEP 7: Final report

```
╔══════════════════════════════════════╗
║  ✅ Conversion complete              ║
╚══════════════════════════════════════╝

📊 Summary:
  Sections processed: ${doneCount}/${totalCount}
  Skipped: ${skippedCount}
  With validation errors: ${issuesCount}

📦 Created blocks:
  ${queue.filter(s => s.status === 'done').map(s => `  ${blocksDir}/${s.name}/`).join('\n')}

📄 Shared:
  ${state.sharedBlocks.defaultButton ? blocksDir + '/default-button/' : ''}
  ${state.sharedBlocks.customHeading ? blocksDir + '/custom-heading/' : ''}

💡 Next steps:
  1. Register the blocks in plugin.php:
     foreach (glob(__DIR__ . '/blocks/*', GLOB_ONLYDIR) as $dir) {
       register_block_type($dir);
     }
  2. Build assets: npm run build
  3. Test the sections in the editor
  4. Replace placeholder logos and case imagery (see caveats)

⚠️ Caveats from brand brief:
  ${brandBrief.caveats.map(c => '  • ' + c).join('\n')}
```

If there are unfinished sections (`pending`/`skipped`) — add:

```
ℹ️ Queue is not exhausted:
  • pending: ${pendingNames.join(', ')}
  • skipped: ${skippedNames.join(', ')}

Continue later: /silince-gutnebrg-builder:convert-react-page --continue
```

---

## 🔁 Command modes

### `--status`

Read the state file, print the progress table. No changes.

### `--continue`

Read the state file, find the first section with `status: "pending"`, go to STEP 6.1 for it. If there is no pending one — print "Queue is empty" and suggest `--retry` or `--reset`.

### `--retry <name>`

Find the section by name, set `status: "pending"`, delete the block's created files (with confirmation via AskUserQuestion), go to STEP 6.1 for it. **🤖 With `--no-comments`:** no need to confirm the deletion (the user explicitly requested retry) — delete and go to 6.1; the question about comments in 6.1 is skipped too.

### `--skip <name>`

Find the section, set `status: "skipped"`, update state. Do not run the conversion.

### `--update-source <new-url> [--regenerate <name>[,<name>...]]`

Replaces the source when the design has changed. Re-downloads the archive, re-indexes the sections, syncs the `lines` coordinates in `queue`, optionally regenerates the specified sections.

**When to use:**
- The design was re-released (a new link with a different `<hash>`).
- Same hash, but the HTML content was updated (rare, but possible).

**What it does NOT do:**
- Does not touch blocks already generated on disk, except those explicitly listed in `--regenerate` (or selected interactively).
- Does not touch `theme.json` and `brand-brief.json` automatically (see the optional steps below).

#### Workflow

**1. Download the new source.**

Use the same logic as in STEP 1.1 (parse the link → preflight `claude_design` MCP → import → normalize into `src/.claude/handoffs/<NEW_HASH>/`; **MCP only, no WebFetch**; unavailable → same handling: interactive stop+advice, autonomous smart retry). If the URL is not from `https://claude.ai/design/` — handle it as a local path (STEP 1.2/1.3).

Record the new values: `newSource`, `newSourceLocalPath`, `newSourceHtml`, `newSourceHash`.

If `newSourceHash === state.sourceHash` — ask via AskUserQuestion: "Hash matches the current one. Re-download anyway?" (in case of an in-place edit in claude.ai/design without a hash change).

**2. Re-index the sections in the new HTML.**

Use the same logic as in STEP 3 (Grep — priority 1 `data-component` markers, priority 2 fallback). Get the new index `newIndex` — an array of `{ name, startLine, endLine, component?, componentVariant? }`.

> 🔑 **Match preferably by `component` (`data-component`), not by function name.** The design agent unified function names (`HowWeWork`/`HowQuoteWorks` → `Process`, `WhoWeWorkWith`/`WhoFor` → `WhoFits`, `ReassureStrip` → `TrustStrip`, `WebsitePackages` → `Packages`, `CaseGrid` → `Cases`) — the old match by function name will miss on such sections. If both `q` and the candidate have `component` — match by it; otherwise by the normalized name. A change of `componentVariant` on a matched component is a "likely-modified" signal.

**3. Match against the current `state.queue` and build a diff.**

For each entry `q` in `state.queue`:

| Condition | Classification | What to record |
|---|---|---|
| Found `n ∈ newIndex` where `n.name === q.name` AND `[n.startLine, n.endLine] === q.lines` | **unchanged** | `previousLines: q.lines` (for audit), `lines` unchanged |
| Found `n` where `n.name === q.name` AND `lines` differ | **shifted** (possibly changed) | `previousLines: q.lines`, `lines: [n.startLine, n.endLine]` |
| `n` not found in `newIndex` | **missing** | `previousLines: q.lines`, `status: "missing"`, leave `lines` as it was |

For each `n ∈ newIndex` whose name is NOT in `state.queue`:

- **added** — a new section in the design.

Save the results into local collections `unchanged[]`, `shifted[]`, `missing[]`, `added[]`.

**4. "Likely modified" heuristic.**

For each `shifted` section — compute the range length:

- `oldLen = q.lines[1] - q.lines[0]`
- `newLen = n.endLine - n.startLine`
- If `|newLen - oldLen| > 5` lines OR `oldLen > 0 && |newLen - oldLen| / oldLen > 0.1` (>10% difference) → mark it as **likely-modified**.
- Otherwise **shift-only** (the structure is preserved, the coordinates moved because of changes above).

**5. Decide which sections to regenerate.**

**5a. If `--regenerate <names>` is given:**
- Parsing: a comma-separated list, for example `--regenerate hero,process`.
- For each name: check that it exists in `state.queue` (including those classified as `unchanged`/`shifted`/`missing`). If it is in `missing` — warn that the section is absent from the new source and cannot be regenerated — ask via AskUserQuestion whether to delete the block from disk (option "Keep" by default).
- Regeneration list = the valid names.

**5b. If `--regenerate` is not given:**

Show the diff:

```
📋 Source diff:
  Old: <OLD_HASH> (loaded 2026-05-02)
  New: <NEW_HASH> (loaded 2026-05-04)

  Unchanged: 8 sections
    • nav, trust-strip, what-we-do, industries, testimonials, why-us, areas, footer

  Coordinates shifted (likely-modified): 2 sections
    • hero          [264-472]   →  [280-510]   (+22 lines)
    • process       [1368-1402] →  [1390-1480] (+56 lines) ⚠️ structure changed

  Coordinates shifted (shift-only): 2 sections
    • cases         [893-1176]  →  [921-1204]
    • faq           [1512-1538] →  [1540-1566]

  Missing from the new source: 1 section
    • legacy-banner [340-410]   →  not found

  New sections: 1
    • testimonial-video [1330-1395]
```

`AskUserQuestion` (multi-select):

```
question: 'Which sections should be regenerated?'
options:
  - 'hero (likely-modified)'
  - 'process (likely-modified)'
  - 'cases (shift-only)'
  - 'faq (shift-only)'
  - 'testimonial-video (NEW — add to the queue?)'
  - 'legacy-banner (missing — delete from disk?)'
hint: 'Recommended default: regenerate only likely-modified. Shift-only is safe to leave as is.'
```

**6. Update state atomically.**

First, save the history:

```javascript
state.sourceHistory = state.sourceHistory || [];
state.sourceHistory.push({
  source: state.source,
  sourceHash: state.sourceHash,
  replacedAt: new Date().toISOString(),
  regenerated: [],   // filled in after STEP 7
  added: addedNames,
  missing: missingNames,
});
```

Then update the root fields:

```javascript
state.source         = newSource;
state.sourceLocalPath = newSourceLocalPath;
state.sourceHtml     = newSourceHtml;
state.sourceHash     = newSourceHash;
state.updatedAt      = new Date().toISOString();
```

Then go through the queue:

- `unchanged` / `shift-only` / `likely-modified` NOT selected for regeneration: update `lines`, add `previousLines`, keep `status: "done"`, set `lastSourceHash: state.sourceHistory[N].sourceHash` (the old hash — to know that the block was generated from the old source).
- `likely-modified` / `shift-only`, **selected for regeneration**: update `lines`, `previousLines`, `status: "pending"`, delete the keys `block`, `completedAt`, `validationStatus`, `lastSourceHash`.
- `missing`: `status: "missing"`, `previousLines`, `lines` unchanged.
- `added`: add a new entry to queue with `n: queue.length + 1`, `name`, `lines: [n.startLine, n.endLine]`, `status: "pending"` (if the user confirmed adding it).

Write state to disk **before** deleting the block files — in case of interruption.

**7. Delete the files of the blocks being regenerated and start the loop.**

One `AskUserQuestion` with confirmation:

```
question: 'Delete block files before regeneration?'
hint: 'Will be deleted: blocks/hero/, blocks/process/'
options:
  - 'Yes, delete and regenerate'
  - 'Only mark as pending (I will delete manually)'
  - 'Cancel'
```

If "Yes" — `Remove-Item -Recurse -Force` for each folder, then go to STEP 6 (the section loop) of the main workflow only for `pending` entries.

After the loop finishes — update `state.sourceHistory[last].regenerated` with the names of the sections that were actually regenerated.

**8. Optional steps (ask separately).**

After the loop finishes, offer via `AskUserQuestion`:

- (Design tokens now live in the theme's `theme.json` — there is no separate regeneration; if the brand colors change, edit theme.json.)
- "Rebuild `brand-brief.json` from the new chats?" (if the chat structure changed).

By default — "No" for both options.

---

#### Token budget for this mode

| Stage | Budget |
|---|---|
| Download + unpack | 0 (external operations) |
| Re-indexing (Grep) | ~0.5 K |
| Diff + AskUserQuestion | ~1.5 K |
| Regenerating N sections | N × ~10 K (isolated in sub-agents) |

If only 1-2 sections are regenerated — the total cost is ~25 K instead of ~150 K with `--reset` + a full run.

---

### `--reset`

```
AskUserQuestion:
  question: 'Delete the state file and start over?'
  hint: 'Blocks already created in blocksDir will NOT be deleted.'
  options: ['Yes, delete state', 'Cancel']
```

**🤖 With `--no-comments`:** do not ask for confirmation — the user explicitly requested `--reset`; delete the state file and ask for a new source.

On confirmation — delete `.conversion-state.json` and ask for a new source.

---

## ⚠️ Error handling

| Error | Action |
|---|---|
| `claude_design` MCP is not registered (preflight) | Interactive: stop + advice (authorize via `/design-login` or provide a local folder/HTML). Autonomous: immediate failure report + stop (nothing to retry). **DO NOT call WebFetch.** |
| MCP exists but returned an error (auth/connection) | Interactive: stop + advice. Autonomous: smart retry (up to 4 attempts, backoff), exhausted → failure report + stop |
| MCP returned something that is not gzip/not an archive | Handle it as files (normalize into the handoff folder); structure not recognized → interactive: ask for the path, autonomous — failure report |
| tar -xf failed | Show stderr, suggest moving the files manually |
| `chats/` not found after normalization | Continue without brand brief, fallback mode |
| `targetFile` (primary HTML from `?file=`) not found | Grep the basename across `project/`; not found → interactive: ask the user (AskUserQuestion), autonomous — failure report |
| react-section-converter failed on a section | `state.queue[i].status = 'failed'`, `error: "..."`, continue the loop with the next one |
| Validator did not find the created files | Most likely the converter failed silently — mark it `failed`, recommend `--retry` |
| `--update-source`: the new hash matches the old one | AskUserQuestion: "Same hash. Re-download anyway / Cancel?" |
| `--update-source`: re-indexing found NOT A SINGLE section from the current queue | Very likely the new source is not Homepage. Ask via AskUserQuestion: "0/N matches. Continue with a forced update (dangerous) / Cancel?" |
| `--update-source --regenerate <name>`: the name is not in queue | Report the list of available names and Cancel. Do not accept arbitrary values. |

---

## 📊 Token budget

| Stage | Budget (per section) |
|---|---|
| Main context: index, brief summary, state updates, AskUserQuestion | ~1 K |
| Sub-agent react-section-converter (isolated) | ~8-10 K |
| Sub-agent validator (isolated) | ~2 K |
| Sub-agent fixer (if errors, isolated) | ~2 K |
| Returning the summary to main | ~0.3 K |

**After 14 sections, the expected growth of the main context: ~30-40 K** (~14 × 2 K per section + indexing + brief). If exceeded — the user is warned every 5 sections.

---

## 📝 Full run example

```bash
/silince-gutnebrg-builder:convert-react-page https://claude.ai/design/DxSm5MZ4nQ9Ol72e2HFWFA
```

1. Import via `claude_design` MCP (preflight → import) → normalization into `src/.claude/handoffs/DxSm5MZ4nQ9Ol72e2HFWFA/`
2. Brand brief: `Inter Tight + JetBrains Mono, accent #0D5EAF, 13 sections, 3 caveats`
3. Index: 13 sections
4. AskUserQuestion: "Confirm the queue?" → Yes
5. Design tokens: taken from the theme's `theme.json` (nothing is created)
6. Shared blocks: AskUserQuestion → "Yes, create default-button and custom-heading"
7. Loop:
   - hero: variant=centered (from brief), interactivity=none → `blocks/hero/` created
   - **Pause**, report, AskUserQuestion → "Continue"
   - trust-strip: → `blocks/trust-strip/`
   - **Pause** → the user says "Pause, I will continue later"
8. State saved, exit.
9. The user opens a new chat → `/convert-react-page --continue`
10. The command reads state, continues from `what-we-do`...

### Scenario: the design is edited after completion

A week later the client reworked hero and process. A new link to the design.

```bash
/silince-gutnebrg-builder:convert-react-page --update-source https://claude.ai/design/<NEW_HASH> --regenerate hero,process
```

1. Import the new source via `claude_design` MCP → normalization into `src/.claude/handoffs/<NEW_HASH>/`.
2. Re-indexing: 14 sections (hero, ..., **+testimonial-video** new).
3. Diff:
   - 11 unchanged
   - 2 likely-modified: hero, process (explicitly listed in `--regenerate` → no question asked)
   - 1 added: testimonial-video → AskUserQuestion: "Add to the queue?" → skipping it this time
4. Confirm deletion of `blocks/hero/`, `blocks/process/` → Yes.
5. Regeneration loop only for hero, process → ~20 K tokens.
6. State updated, `sourceHistory` has a record of the source replacement.

If the design had been reworked without `--regenerate`:

```bash
/silince-gutnebrg-builder:convert-react-page --update-source https://claude.ai/design/<NEW_HASH>
```

— the command will show the diff and ask a multi-select question about what to regenerate.

---

## ✅ Critical

1. **Never read Homepage.html in full** in the main context. Only via Grep / Read offset+limit.
2. **The state file — the single source of truth** between runs. Save all intermediate decisions there.
3. **AskUserQuestion is required** at key decision points (choosing variants, what to do after a section). Do not make assumptions on the user's behalf. **Exception — autonomous mode `--no-comments`:** no questions are asked at all, defaults are applied (`guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`), all auto-decisions are recorded in the final report.
4. **Sub-agents are isolated** — results return to main only as a summary, not as code.
5. **Every 5 sections** — a gentle reminder that `--continue` in a new chat is available (in autonomous mode no reminder is needed — we go to the end).
