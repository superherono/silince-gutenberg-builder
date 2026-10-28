---
description: Create a new Gutenberg block from a Figma design or HTML markup
---

# Command: create-block

Create a new Gutenberg block from a Figma design or HTML markup by orchestrating 4 agents.

## 📥 Parameters

- **source** (required): Figma URL or path to an HTML file
- **Options:**
  - `--name`: block name
  - `--title`: block title
  - `--category`: category
  - `--skip-validation`: skip validation
  - `--yes`: automatically approve all file operations (create, read, edit) without asking for confirmation
  - `--no-comments`: fully autonomous mode — DO NOT ask the user A SINGLE question (no pre-generation notes, no structure confirmation, no generator questions), run the whole workflow on defaults. Contract and defaults table: `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-7-autonomous-mode-the---no-comments-flag`. Do not confuse with `--yes` (that one is only about file operations).

---

## 🔄 Workflow

> **Common patterns:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md`
>
> - Config Reading Pattern
> - Task Tool Templates
> - Progress/Report Formatting

### STEP 0: Read the config

📖 **Using:** `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-1-config-reading-pattern`

1. Read `src/.claude/config.json` in the project root
2. Get `pluginSettings['silince-gutnebrg-builder'].blocksDir` (default: `./blocks`)

### STEP 0.5: Pre-generation notes for the block (default)

📖 **Contract:** `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-6-pre-generation-notes-pre-emptive-comments`

**Goal:** let the user point out non-obvious aspects of the block BEFORE analysis and generation — fewer fixes later.

**If `--no-comments` is passed** (autonomous mode):

```javascript
// DO NOT ask the question. See command-orchestration.md#-7-autonomous-mode-the---no-comments-flag
const userPreGenNotes = null;
// goto STEP 1
```

**Otherwise — ask the user (default).** Call `AskUserQuestion`:

- `question`: "Are there any non-obvious aspects or wishes for this block that I should take into account before generation?"
- Exactly two ways to answer: the option **"No"** + a free-text field ("Other"). Do not add other buttons.

Answer handling:

```javascript
// "No" → no comments
const userPreGenNotes = null;

// Free text → save it verbatim
const userPreGenNotes = <user text>;
```

`userPreGenNotes` (if not empty) MUST be included in the prompts for Analyzer (STEP 1), preview generation (STEP 2.1) and full generation (STEP 2.4) — as a separate labeled block (see the contract).

### STEP 1: Design analysis

```
╔══════════════════════════════════════╗
║  🚀 Generator Agent v2.1.3 active   ║
╚══════════════════════════════════════╝
```

```
╔══════════════════════════════════════╗
║  📊 Analyzing design...              ║
╚══════════════════════════════════════╝
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#21-task-template-analyzer`

**Prompt additions:**

```markdown
**Source:** [insert source]

[If options --name, --title, --category]: **Requirements:**

- Use blockName: [--name]
- Use title: [--title]
- Use category: [--category]

[IF userPreGenNotes is NOT empty:]
📝 User comments (MUST take them into account when analyzing structure and attributes):
[insert userPreGenNotes]
```

**Expected result:** JSON with blockName, title, category, attributes, html, css

### STEP 2: Code generation

```
╔══════════════════════════════════════╗
║  🛠️ Generating block code...         ║
╚══════════════════════════════════════╝
```

---

#### STEP 2.1: Get the structure preview (for non-button blocks)

**Task Tool (first call):** Ask Generator to generate only the structure preview

**Prompt:**

```
You are the Generator agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/generator.md

Task: Perform ONLY STEP 0 and STEP 0.5.

Specification from Analyzer:
[insert JSON.stringify(specification, null, 2)]

Project settings:
- namespace: [insert namespace]
- blockCategory: [insert blockCategory]

[IF userPreGenNotes is NOT empty:]
📝 User comments (take them into account when building the structure preview):
[insert userPreGenNotes]

⚠️ CRITICALLY IMPORTANT:
1. Perform STEP 0 - determine the block type (button/regular)
2. IF BUTTON: return { blockType: 'button', skipPreview: true }
3. IF NOT A BUTTON: perform STEP 0.5 (generate the preview) and return:
   {
     blockType: 'regular',
     blockTitle: "...",
     structurePreview: "full preview text",
     attributesCount: X,
     rawDesignDataSummary: { colors: X, fonts: X, spacing: X }
   }
4. DO NOT CONTINUE to STEP 1! RETURN ONLY THE PREVIEW!
5. DO NOT CREATE FILES! PREVIEW ONLY!
```

**Expected result:** JSON object with the structure preview

---

#### STEP 2.2: Show the preview and ask for confirmation (for non-button blocks)

**Block type check:**

```javascript
if (generatorResult.skipPreview === true) {
	// This is a button - skip the preview, go to STEP 2.4
	goto STEP_2_4_FULL_GENERATION;
}
```

**Autonomous mode (`--no-comments`):**

```javascript
// DO NOT show AskUserQuestion. Treat the structure as confirmed.
// See command-orchestration.md#-7-autonomous-mode-the---no-comments-flag (default "treat as Yes").
if (noComments) {
	const userNotes = null;
	// Record in the report's auto-decisions: "Structure accepted without confirmation (--no-comments)".
	goto STEP_2_4_FULL_GENERATION;
}
```

**For regular blocks - show the preview to the user:**

Print the structure preview from generatorResult.structurePreview to the chat, then add:

```
---

✅ Confirm the block structure. You can:
- Write "Yes" if the structure is correct
- Write "No" if the structure does not fit (I will stop generation)
- Write your own comments for adjustments
```

**Then call AskUserQuestion:**

Use the AskUserQuestion tool with these parameters:

- question: 'Confirm the block structure (see above)'
- hint: 'Yes / No / Your comments'

Save the answer to the userConfirmation variable

---

#### STEP 2.3: Handle the user's answer

**Option A: "Yes" (yes, ok, 1, confirm)**

```javascript
// Continue to STEP 2.4
const userNotes = null;
```

**Option B: "No" (no, does not fit, 2)**

```javascript
console.log(`
❌ Structure rejected.

Block generation stopped. I recommend:
1. Clarify the structure requirements
2. Rerun create-block with a different specification
`);
return; // End the command
```

**Option C: Free text**

Save the user's comments:

```javascript
const userNotes = userConfirmation;
// Continue to STEP 2.4 taking the comments into account
```

---

#### STEP 2.4: Full block generation

**Task Tool (second call):** Ask Generator to create all files

**Prompt:**

```
You are the Generator agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/generator.md

Task: Perform full block generation (STEP 1-8).

Specification from Analyzer:
[insert JSON.stringify(specification, null, 2)]

Project settings:
- namespace: [insert namespace]
- textdomain: [insert textdomain]
- blocksDir: [insert blocksDir]
- blockCategory: [insert blockCategory]

Block type: [insert blockType] (button/regular)

[IF userPreGenNotes is NOT empty (pre-generation notes from STEP 0.5):]
📝 User comments (MUST take them into account at all generation steps):
[insert userPreGenNotes]

[IF userNotes is NOT empty (structure edits from STEP 2.3):]
📝 Structure edits from the user:
[insert userNotes]

Take these edits into account during generation!

[IF both are empty:]
✅ Structure confirmed by the user.

[IF --no-comments is passed:]
🤖 AUTONOMOUS MODE: autonomous: true
- DO NOT ask the user A SINGLE question (not STEP 1, not the STEP 1.6 promotion, not the STEP A.2.4 variants).
- Apply the defaults from command-orchestration.md#-7-autonomous-mode-the---no-comments-flag and list the auto-decisions in the report.

⚠️ CRITICALLY IMPORTANT:

[IF blockType === 'button':]
- This is a BUTTON: use STEP A (Button Template System)
- DO NOT ask the user questions - buttons are fully automated

[OTHERWISE (blockType === 'regular'):]
- This is a REGULAR BLOCK: perform STEP 1-8
- STEP 0.5 IS ALREADY DONE (structure confirmed)
- [IF NOT autonomous:] MUST perform STEP 1 (ask 4 questions via AskUserQuestion)
  [IF autonomous:] SKIP the STEP 1 questions — apply the autonomous defaults (Q1 all content via InnerBlocks; Q2 basic supports + color controls; Q3 InnerBlocks; Q4 Static / Query Loop for post listings)
- PERFORM STEP 1.6 (common reuse: read common/.registry.json, reuse existing roles). [IF NOT autonomous:] offer to promote new primitives. [IF autonomous:] DO NOT silently promote new roles — keep them core/inline, list the candidates in the report
  - [IF the block is a whole SECTION and the project has COMPONENTS.md / the source has data-component:] check against guides/component-registry.md — variant-capable block, not a duplicate, variant retrofit
- Then perform STEP 2-8 (create the files)

Return a report on the created files [IF autonomous: + a section "🤖 Auto-decisions (--no-comments)"].
```

**Expected result:** List of created files

---

### STEP 3: Validation (unless --skip-validation)

```
╔══════════════════════════════════════╗
║  ✅ Validating block...              ║
╚══════════════════════════════════════╝
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#23-task-template-validator`

**Prompt additions:**

```markdown
**Block path:** [blocksDir]/[blockName]
```

**Branching logic:**

- **Success** (no errors) → STEP 5 (final report)
- **Errors** → STEP 4 (auto-fix)

### STEP 4: Automatic fix (if there are errors)

```
╔══════════════════════════════════════╗
║  🔧 Automatic fix...                 ║
╚══════════════════════════════════════╝
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#24-task-template-fixer`

**Prompt additions:**

```markdown
**Block path:** [blocksDir]/[blockName]

**Validator report:**
[insert validationResult from STEP 3]
```

**Max iterations:** 3 (See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#54-max-iterations-pattern-for-fixer`)

**Logic:**

- After the fix → return to STEP 3 (re-validation)
- If fixed → STEP 5
- If not fixed within 3 iterations → STEP 5 with an error report

### STEP 5: Final report

📄 **Using:** `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-4-report-formatting`

**If successful:**

```
╔══════════════════════════════════════╗
║  ✅ Block created successfully!      ║
╚══════════════════════════════════════╝

📦 **Block:** [blockName]
📂 **Path:** [blocksDir]/[blockName]
📝 **Files:** 7

🎯 **Structure:**
   ├── block.json
   ├── index.js
   ├── edit.js
   ├── save.js
   ├── style.scss
   ├── editor.scss
   └── render.php

✨ **Next steps:**
   1. Register the block in plugin.php:
      register_block_type(__DIR__ . '/blocks/[blockName]');

   2. Build assets: npm run build

   3. Test the block in the editor
```

**If there are errors:**

```
╔══════════════════════════════════════╗
║  ⚠️ Block created with errors        ║
╚══════════════════════════════════════╝

📦 **Block:** [blockName]
📂 **Path:** [blocksDir]/[blockName]

❌ **Issues:**
   • Validator: [count] errors
   • Fixer: Fixed [X]/[Y] (3 iterations)

📋 **Detailed report:**
[insert the last validationResult]

💡 **Recommendations:**
   Use /silince-gutnebrg-builder:force-fix --block=[blockName]
```

---

## ⚠️ Error handling

**If Analyzer could not analyze the source:**

```
❌ Could not analyze the source

**Causes:**
- Figma URL is unavailable or has an invalid format
- HTML file not found
- No access to the file

💡 Check that the source is correct
```

**If Generator could not create the files:**

```
❌ Could not generate the block

**Causes:**
- No write permission for [blocksDir]
- A block with this name already exists

💡 Check permissions or use another name: --name=new-name
```
