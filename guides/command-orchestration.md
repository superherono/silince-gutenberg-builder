# Command Orchestration Guide - Managing command workflows

A guide to orchestrating agents via the Task tool for commands.

**Use this guide when:** you need details on calling agents, formatting progress, handling errors.

---

## 📋 1. Config Reading Pattern

### Standard config reading process

**File:** `src/.claude/config.json` in the project root

**Plugin settings structure:**

```json
{
	"pluginSettings": {
		"silince-gutnebrg-builder": {
			"namespace": "acme",
			"textdomain": "acme",
			"blocksDir": "./blocks/",
			"blockCategory": "acme-blocks",
			"iconSystem": {
				"type": "sprite",
				"component": "common/icon/sprite-icon",
				"manifest": "_generated/icons.manifest.json",
				"iconClass": "wp-icon",
				"symbolIdPrefix": "icon-",
				"sourceDir": "src/icons",
				"rebuildCmd": "npm run icons"
			}
		}
	}
}

**Note:** Design tokens come from the theme's `theme.json` (paths `themeJsonPath`/`themeAliasesPath` in config, defaults `theme.json` / `src/scss/variables.scss`). A separate `design-tokens.json` is not created (retired).

**`iconSystem` (optional):** describes the theme's sprite icons. If present with `type: "sprite"` — the generator/converter render icons via the shared `SpriteIcon` from the manifest (NOT inline SVG, NOT enum). The `component`/`manifest` paths are relative to `blocksDir`. Full contract: [icon-system.md](icon-system.md). No section → the sprite rules do not apply.
```

### Instructions for commands:

````javascript
1. Check whether src/.claude/config.json exists

2. IF THE FILE DOES NOT EXIST:
   a) Determine theme_name:
      - Get the name of the current directory (basename)
      - If it is "src" or "app", take the parent directory
      - Convert to lowercase and replace spaces with hyphens

   b) Create the .claude/ directory

   c) Create src/.claude/config.json:
      {
        "pluginSettings": {
          "silince-gutnebrg-builder": {
            "namespace": "{theme_name}",
            "textdomain": "{theme_name}",
            "blocksDir": "./blocks",
            "blockCategory": "{theme_name}-blocks",
            "autoFix": {
              "enabled": true,
              "maxIterations": 2
            }
          }
        }
      }

   d) Tell the user:
      ```
      📝 Created src/.claude/config.json

      Settings:
      - namespace: {theme_name}
      - blocksDir: ./blocks

      💡 You can edit the file if you need different settings
      📌 Design tokens come from the theme's theme.json (see themeJsonPath in config)
      ```

3. IF THE FILE EXISTS:
   Read src/.claude/config.json

4. Extract pluginSettings['silince-gutnebrg-builder']

5. Get the settings:
   - namespace: block prefix (for example: "acme")
   - textdomain: domain for i18n
   - blocksDir: path to the blocks directory
   - blockCategory: category in the editor
   - autoFix.enabled: enable auto-fix (default: true)
   - autoFix.maxIterations: max iterations (default: 2)
   - iconSystem: theme sprite icons (optional; with `type: "sprite"` — icons via `SpriteIcon`+manifest, see [icon-system.md](icon-system.md))

6. Use defaults if settings are missing:
   - namespace: "custom"
   - textdomain: "custom"
   - blocksDir: "./blocks/"
   - blockCategory: "common"
   - autoFix.enabled: true
   - autoFix.maxIterations: 2

**Note:** Design tokens come from the theme's `theme.json`; a separate `design-tokens.json` is not created (retired).
````

### Examples of determining theme_name:

```javascript
// Example 1: wp-content/themes/mytheme/src/
// Current directory: "src"
// Parent: "mytheme"
// theme_name = "mytheme"

// Example 2: wp-content/themes/My Theme/
// Current directory: "My Theme"
// theme_name = "my-theme"

// Example 3: wp-content/plugins/my-plugin/
// Current directory: "my-plugin"
// theme_name = "my-plugin"
```

---

## 🔧 2. Task Tool Templates

### 2.1. Task Template: Analyzer

**When to use:** Analyzing a Figma design or an HTML file

**Model:** `haiku` (fast analysis)

**Template:**

```javascript
Task({
	subagent_type: 'general-purpose',
	description: 'Analyze design structure and extract specification',
	model: 'haiku',
	prompt: `
You are the Analyzer agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/analyzer.md

Task: Analyze the source and create a JSON specification of the block.

Source: ${sourceType === 'figma' ? figmaUrl : htmlFilePath}
Type: ${sourceType}

Settings:
- themePrefix: ${namespace}
- blocksDir: ${blocksDir}

Return a JSON specification with the structure, styles, attributes, rawDesignData.
  `,
});
```

**Expected result:**

```json
{
  "blockName": "hero",
  "blockTitle": "Hero Block",
  "structure": {...},
  "styles": {...},
  "attributes": {...},
  "rawDesignData": {
    "colors": ["#1862FF", "#FFFFFF", ...],
    "fontFamilies": ["Mulish, sans-serif", ...],
    "fontSizes": ["16px", "24px", ...],
    "spacing": ["8px", "16px", ...],
    "borderRadius": ["4px", "400px", ...]
  }
}
```

---

### 2.2. Task Template: Generator

**When to use:** Generating block code from the specification

**Model:** `sonnet` (complex generation)

**Template:**

```javascript
Task({
	subagent_type: 'general-purpose',
	description: 'Generate Gutenberg block code from specification',
	model: 'sonnet',
	prompt: `
You are the Generator agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/generator.md

⚠️ CRITICAL: 
- STEP 0 in generator.md determines the block type FIRST
- Buttons use the Button Template System (skip STEP 0.5 and STEP 1)
- For regular blocks:
  1. STEP 0.5: Show the block's structure preview and ask for confirmation
  2. STEP 1: Ask questions about editable properties via AskUserQuestion

Task: Generate a complete Gutenberg block.

Specification from Analyzer:
${JSON.stringify(specification, null, 2)}

Project settings:
- namespace: ${namespace}
- textdomain: ${textdomain}
- blocksDir: ${blocksDir}
- blockCategory: ${blockCategory}

Block type: ${blockType || 'determine it yourself from the specification'}

Run STEP 0 → determine the path (button/regular):
- IF BUTTON: STEP A (Button Template System) → FINISH
- IF NOT A BUTTON: STEP 0.5 (Structure Preview) → STEP 1 (User Questions) → STEP 2-8 (Full Generation)
  `,
});
```

**Expected result (for non-button blocks):**

```
📦 [Block structure preview]

✅ Waiting for user confirmation...
[User: "Yes" / "No" / Comments]

💬 [4 questions about editable properties]
[User: answers the questions]

📁 List of created files:
- blocks/{blockName}/block.json
- blocks/{blockName}/index.js
- blocks/{blockName}/edit.js
- blocks/{blockName}/save.js (or render.php)
- blocks/{blockName}/style.scss
- blocks/{blockName}/editor.scss
```

**Expected result (for button blocks):**

```
🔘 Button block detected. Using the Button Template System...

📁 List of created files:
- blocks/{blockName}/block.json
- blocks/{blockName}/index.js
- blocks/{blockName}/edit.js
- blocks/{blockName}/save.js
- blocks/{blockName}/view.js
- blocks/{blockName}/style.scss
- blocks/{blockName}/editor.scss
```

---

### 2.3. Task Template: Validator

**When to use:** Validating a created/existing block

**Model:** `haiku` (fast validation)

**Template:**

```javascript
Task({
	subagent_type: 'general-purpose',
	description: 'Validate block code for errors and best practices',
	model: 'haiku',
	prompt: `
You are the Validator agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/validator.md

Task: Validate the block against all rules.

Block: ${blockName}
Path: ${blockPath}

⚠️ IMPORTANT: 
- Use the workflow branching from validator.md
- STEP 0: determine the result (success/errors)
- If success → short report → FINISH
- If errors → read guides/validator-error-reporting.md

Mode: ${strictMode ? 'strict (including 🔵 recommendations)' : 'normal (only 🔴 and 🟡)'}

Run all checks per the short rules in validator.md and return a report.
  `,
});
```

**Expected result (success):**

```
✅ Block "Hero Block" passed validation!
[short list of checks]
```

**Expected result (errors):**

```json
{
	"status": "failed",
	"errors": [
		{
			"file": "edit.js",
			"line": 15,
			"level": "critical",
			"type": "russian_characters",
			"message": "...",
			"currentCode": "...",
			"correctCode": "..."
		}
	],
	"summary": {
		"critical": 2,
		"warnings": 3,
		"recommendations": 0
	}
}
```

---

### 2.4. Task Template: Fixer

**When to use:** Automatically fixing errors after validation

**Model:** `haiku` (quick edits)

**Template:**

```javascript
Task({
	subagent_type: 'general-purpose',
	description: 'Automatically fix validation errors',
	model: 'haiku',
	prompt: `
You are the Fixer agent from the silince-gutnebrg-builder plugin.

Read the instructions: agents/fixer.md

Task: Automatically fix the validation errors.

Block: ${blockName}
Path: ${blockPath}

Errors from Validator:
${JSON.stringify(validationErrors, null, 2)}

⚠️ CRITICAL:
- Read ONLY the problematic files (not the whole project!)
- Use the Edit tool for fixes
- Follow the auto-fix patterns from fixer.md
- Maximum ${maxIterations || 2} iterations

Return a report on the fixes.
  `,
});
```

**Expected result:**

```json
{
	"status": "fixed",
	"fixedErrors": 5,
	"remainingErrors": 0,
	"changes": [
		{
			"file": "edit.js",
			"line": 15,
			"type": "russian_characters",
			"fixed": true
		}
	]
}
```

---

## 📊 3. Progress Formatting

### 3.1. Progress Box (for workflow steps)

**Template:**

```
┌─────────────────────────────────────┐
│ Step ${currentStep}/${totalSteps}: ${stepName}             │
└─────────────────────────────────────┘
${statusEmoji} ${action}...
```

**Examples:**

```
┌─────────────────────────────────────┐
│ Step 1/4: Design analysis          │
└─────────────────────────────────────┘
🔄 Analyzing the structure...
```

```
┌─────────────────────────────────────┐
│ Step 2/4: Code generation          │
└─────────────────────────────────────┘
⚠️ Generator will ask questions about editable properties...
```

### 3.2. Status Emoji

```
🔄 - In progress
✓  - Completed successfully
⚠️  - Attention, action required
❌ - Error
🔍 - Checking
🔧 - Fixing
📁 - Files
📝 - Attributes
🎨 - Design tokens
```

### 3.3. Completion Checkmarks

**After each step:**

```
✓ ${actionCompleted}
✓ ${detailsCompleted} (${count} ${items})
```

**Example:**

```
✓ Design analyzed
✓ Structure extracted (8 elements)
✓ Design tokens created
```

---

## 📋 4. Report Formatting

### 4.1. Success Report Template

**Use when:** All steps completed successfully, no errors

**Template:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ${commandName} completed successfully!

${mainResult}

📁 Created files:
${filesTree}

📝 Attributes: ${attributesCount}
${attributesList}

🎨 Raw Design Data:
  Colors: ${colorsCount}
  Fonts: ${fontsCount}

📌 Design tokens: from the theme's theme.json (var(--primary), var(--space-lg)…)

${additionalInfo}

📋 Next steps:

${nextSteps}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Example for create-block:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Gutenberg block "Hero Block" created!

Block: hero
Path: ./blocks/hero/

📁 Created files:
blocks/hero/
├── block.json
├── index.js
├── edit.js
├── save.js
├── style.scss
└── editor.scss

📝 Attributes: 5
- title (string)
- subtitle (string)
- imageUrl (string)
- backgroundColor (string)
- textColor (string)

🎨 Raw Design Data:
  Colors: 8
  Fonts: 3

📌 Design tokens: from the theme's theme.json

📋 Next steps:

1. Register the block in WordPress
2. Compile SCSS: npm run build
3. Test the block in the editor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 4.2. Error Report Template

**Use when:** Errors were found that need to be fixed

**Template:**

```
❌ ${commandName} - issues found

${errorsSummary}

Details:
${errorsList}

Action options:
${actionOptions}
```

**Example:**

```
❌ Validation of block "hero" - issues found

Found:
- 2 critical errors 🔴
- 3 warnings 🟡

Details:
[List from validator-error-reporting.md]

Action options:
1. Automatic fix:
   /silince-gutnebrg-builder:force-fix hero

2. Show the detailed guide:
   /silince-gutnebrg-builder:show-fix-guide hero

3. Fix manually and validate again:
   /silince-gutnebrg-builder:validate-block hero
```

---

## 🛠️ 5. Common Patterns

### 5.1. Check Block Exists

**Use before validation/fixing:**

```javascript
const blockPath = `${blocksDir}/${blockName}`;
const blockExists = checkDirectoryExists(blockPath);

if (!blockExists) {
	console.log(`
❌ Block "${blockName}" not found

Path: ${blockPath}

Check:
- The block name is correct
- The blocksDir directory in src/.claude/config.json
- The block was created earlier

Available blocks:
${listAvailableBlocks(blocksDir)}
  `);
	return;
}
```

### 5.2. List Available Blocks

**For showing to the user:**

```javascript
function listAvailableBlocks(blocksDir) {
	// Read the directories in blocksDir
	const blocks = readDirectories(blocksDir);

	return blocks
		.filter((dir) => hasBlockJson(dir))
		.map((dir) => `  - ${dir}`)
		.join('\n');
}
```

### 5.3. Determine Source Type

**For Analyzer:**

```javascript
function determineSourceType(source) {
	if (source.includes('figma.com')) {
		return { type: 'figma', url: source };
	}

	if (source.endsWith('.html')) {
		return { type: 'html', path: source };
	}

	throw new Error('Unsupported source type. Use a Figma URL or an HTML file.');
}
```

### 5.4. Max Iterations Pattern (for Fixer)

**Preventing infinite loops:**

```javascript
const MAX_FIX_ITERATIONS = 2;
let currentIteration = 0;

while (hasErrors && currentIteration < MAX_FIX_ITERATIONS) {
  currentIteration++;

  console.log(`\n🔧 Fix attempt ${currentIteration}/${MAX_FIX_ITERATIONS}...\n`);

  // Run Fixer
  const fixResult = await runFixer(...);

  // Re-validation
  const validationResult = await runValidator(...);
  hasErrors = validationResult.hasErrors;
}

if (hasErrors) {
  console.log(`
⚠️ Errors remain after ${MAX_FIX_ITERATIONS} attempts.
A manual fix or force-fix is required.
  `);
}
```

---

## 💬 6. Pre-generation Notes (pre-emptive comments)

**Purpose:** let the user point out non-obvious aspects of the block **before** the agent starts work — so that fewer edits are needed later. This is the **default behavior** for all commands that generate a block (`/create-block`, `/convert-html`, `/convert-react-page`).

### Question contract

**When:** at the very start of work on a block/section — BEFORE analysis and generation (the exact steps are in each command).

**How (`AskUserQuestion`):**

- `question`: "Are there any non-obvious aspects or wishes for this block that I should take into account before generation?"
- Exactly **two** ways to answer:
  1. the **"No"** option (no comments → continue);
  2. **free text** — the user types comments into the "Other" field.
- DO NOT add other option buttons and DO NOT impose an answer format.

**Result:**

- answer "No" → `userPreGenNotes = null` (in `/convert-react-page` — `queue[i].userNotes = null`);
- free text → save it verbatim in `userPreGenNotes` (respectively `queue[i].userNotes`).

### Passing it down

`userPreGenNotes` (if not empty) MUST be included in the prompt of EVERY sub-agent that affects the result, as a separate labeled block:

```
📝 User comments (you MUST take them into account, before and during generation):
[verbatim text of userPreGenNotes]
```

- **create-block:** Analyzer (take into account when analyzing the structure/attributes) + Generator preview call + Generator full generation.
- **convert-html:** keep in context throughout the entire single-agent pass.
- **convert-react-page:** in `input.userNotes` for `react-section-converter` (alongside `brandBrief.sectionComments`).

> This **complements**, rather than replaces, the reactive structure confirmation (create-block STEP 2.2). Pre-generation notes are context BEFORE the start; structure confirmation is a reaction to an already derived structure.

---

## 🤖 7. Autonomous Mode (the `--no-comments` flag)

The `--no-comments` flag switches the command to **fully autonomous mode**: the agent does NOT ask the user **a single** question — neither the pre-generation notes (section 6) nor any other interactive branch points provided for in the instructions (structure confirmation, generator questions, common promotion, choice of variants/interactivity, pauses between sections, state routing, etc.).

**Semantics:** "the user started the command and walked away from the computer". The agent runs the whole workflow to the end on defaults and does not ask the user to check/fix anything — the user will do that afterwards.

### Strict rules of autonomous mode

1. **0 `AskUserQuestion` calls.** Any point where the instructions say to ask the user is replaced with a deterministic default (table below). If no default is defined for a branch point — choose the most conservative/non-destructive option, DO NOT ask.
2. **Document all auto-decisions.** Add a `🤖 Auto-decisions (--no-comments)` section to the final report listing every choice made instead of a question (what was chosen and why). This is exactly what the user will review.
3. **Passing the flag down.** The command must pass `autonomous: true` into the prompt of every sub-agent; sub-agents that see this flag also ask no questions and apply their own defaults.
4. **Do not confuse with `--yes`.** `--yes` (create-block) applies only to auto-approval of file operations and does NOT affect questions. `--no-comments` applies only to questions and does NOT imply `--yes`.

### Defaults table (what to do instead of asking)

| Question point | Autonomous default |
|---|---|
| Pre-generation notes (section 6) | skip, `userPreGenNotes = null` |
| Structure confirmation (create-block STEP 2.2) | treat as "Yes", continue generation |
| Generator Q1 "editable elements" | all content via InnerBlocks (the plugin's standard InnerBlocks-first approach) |
| Generator Q2 "InspectorControls" | basic `supports` (spacing/typography/color) + color controls; toggles only for explicitly optional elements |
| Generator Q3 "repeating elements" | InnerBlocks (the recommended option) |
| Generator Q4 "rendering type" | Static (save.js); post listing → Query Loop per the post-cards gate |
| Common promotion of NEW primitives (STEP 1.6 / convert-html) | **DO NOT** promote silently: reuse existing ones from the registry, leave new roles as core/inline; list the candidates in the report |
| Button variants without `designSystemPath` (STEP A.2.4 / §7 of the contract) | generate from the theme palette (the "from palette" option), without asking |
| convert-react-page: queue approval (STEP 4) | convert all found sections |
| convert-react-page: per-section choices (STEP 6.1) | variant — from the `componentVariant` marker, otherwise the first/default one; interactivity — per `frontendJs.strategy` (`shared-bundle` → `structure-only`, otherwise `none`); group — `common` when `shared: true` (`data-component` marker + >1 page), otherwise `page` |
| convert-react-page: pause between sections (STEP 6.5) | do not pause, go to the end of the queue |
| convert-react-page: conflict with existing state + new source (STEP 0) | `--continue` (non-destructive), not `--reset` |

> Reusing ALREADY existing common blocks from the registry is the default behavior in interactive mode too (no question is asked), and autonomous mode keeps it. Only silently CREATING new common blocks without confirmation is forbidden.

---

## 📝 8. Usage Examples

### Example 1: Full Workflow (create-block)

```javascript
// STEP 1: Config
const config = readConfig();
const { namespace, textdomain, blocksDir } = config;

// STEP 2: Analyzer
showProgress(1, 4, 'Design analysis');
const spec = await Task({
	/* analyzer template */
});
console.log('✓ Design analyzed');

// STEP 3: Generator
showProgress(2, 4, 'Code generation');
const files = await Task({
	/* generator template */
});
console.log('✓ Files created');

// STEP 4: Validator
showProgress(3, 4, 'Validation');
const validation = await Task({
	/* validator template */
});

if (validation.hasErrors) {
	// STEP 5: Fixer
	showProgress(4, 4, 'Auto-fix');
	await Task({
		/* fixer template */
	});
}

// Success Report
showSuccessReport({ blockName, files, attributes });
```

---

✅ The guide is ready to use!
