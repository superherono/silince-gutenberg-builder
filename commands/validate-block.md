---
description: Check that an existing Gutenberg block is correct
---

# Command: validate-block

Checks that an existing Gutenberg block is correct.

## 📥 Parameters

**block-name** (required): Block name (without the namespace prefix)

**Options:**

- `--fix`: fix errors automatically
- `--strict`: strict validation (including recommendations)
- `--report <file>`: save the report to a file

**Examples:**

```bash
/silince-gutnebrg-builder:validate-block hero
/silince-gutnebrg-builder:validate-block hero --fix
/silince-gutnebrg-builder:validate-block hero --strict --report validation.json
```

---

## 🔄 Workflow

> **Common patterns:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md`
>
> - Config Reading Pattern
> - Task Tool Templates
> - Progress/Report Formatting

### STEP 0: Preparation

📖 **Config:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-1-config-reading-pattern`

1. Get `builder.blocksDirectory`
2. Check that the block exists: `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#51-check-block-exists`
3. If the block is not found → show the list of available blocks

**Progress:**

```
🔍 Checking block "[blockName]"...

Path: [blockPath]
Mode: [strict ? 'strict' : 'normal']
Auto-fix: [fix ? 'on' : 'off']
```

### STEP 1: Validation

```
╔══════════════════════════════════════╗
║  ✅ Validating block...              ║
╚══════════════════════════════════════╝
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#23-task-template-validator`

**Prompt additions:**

```markdown
**Block path:** [blockPath]
**Mode:** [strict ? 'strict (including recommendations)' : 'normal']

**Check:**

1. File structure
2. block.json (validity, fields, attributes)
3. edit.js (useBlockProps, with container, i18n)
4. save.js/render.php (with container, escaping)
5. style.scss (BEM, media queries, REM)
6. editor.scss
7. index.js

**Return:**

- List of checks
- Errors (critical)
- Warnings
  [strict ? '- Recommendations' : '']
- For each issue: file, line, description, autoFixable
```

**Progress during validation:**

```
🔄 Checking file structure...
🔄 Validating block.json...
🔄 Checking edit.js...
🔄 Checking save.js/render.php...
🔄 Checking style.scss...
```

### STEP 2: Result analysis

**CASE A: Success (no issues)**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Validation passed successfully!

Checked:
✓ File structure is correct
✓ block.json is valid (apiVersion: 3, [N] attributes)
✓ edit.js meets the standards
  - useBlockProps() applied correctly
  - HAS __container (correct)
  - All strings go through __()
✓ save.js/render.php meets the standards
  - HAS __container (correct)
  - Structure is identical to edit.js
  - Data is escaped
✓ style.scss follows BEM
  - BEM notation is correct
  - Isolated media queries
  - Sizes in REM
✓ editor.scss is valid
✓ index.js is correct

Total checks: [N]
Passed: [N]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 The block is ready to use!
```

→ **DONE**

**CASE B: Issues found**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Validation found issues

Checked: [total]
Passed: [passed]
Issues: [errors + warnings]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[If there are errors]:
🔴 CRITICAL ERRORS ([N]):

[For each error]:
1. [file]:[line]
   Type: [type]
   Problem: [message]

   Should be: [suggestion]

   [autoFixable ? '🔧 Can be fixed automatically' : '⚠️ Requires a manual fix']

[If there are warnings]:
🟡 WARNINGS ([N]):
[list]

[If strict and there are recommendations]:
🔵 RECOMMENDATIONS ([N]):
[list]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Statistics:
Can be fixed automatically: [N]
Require a manual fix: [N]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Available actions:

[If autoFixableCount > 0]:
1. Fix automatically:
   /silince-gutnebrg-builder:validate-block [blockName] --fix

2. Fix manually:
   /silince-gutnebrg-builder:show-fix-guide [blockName]

3. Detailed report:
   /silince-gutnebrg-builder:validate-block [blockName] --report validation.json
```

→ **If --fix is NOT given:** DONE
→ **If --fix is given:** STEP 3

### STEP 3: Auto-fix (if --fix)

**Condition:** `--fix` is given AND `autoFixableCount > 0`

```
╔══════════════════════════════════════╗
║  🔧 Automatic fix...                 ║
╚══════════════════════════════════════╝

Fixing [N] issues...
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#24-task-template-fixer`

**Prompt additions:**

```markdown
**Block path:** [blockPath]

**Errors to fix:**
[JSON: errors.filter(e => e.autoFixable)]

**Warnings to fix:**
[JSON: warnings.filter(w => w.autoFixable)]

**IMPORTANT:**

- Read ONLY the files with errors
- Use the Edit tool (not Write!)
- Apply precise fixes
```

**Progress during fixing:**

```
🔧 [type]: [file]
```

### STEP 4: Re-validation (incremental)

After the fixer's fixes → return to STEP 1 with an optimization:

**⚠️ TOKEN OPTIMIZATION:**

1. **DO NOT re-read** guides (validator.md, validator-error-reporting.md, validation-core-rules.md) — the rules are already in context
2. **Read ONLY** the files from the fixer's "filesModified" list
3. **Apply** the already loaded validation rules
4. **Skip** checking unchanged files

**Progress:**

```
🔄 Re-validation (changed files only)...
📄 Checking: edit.js
📄 Checking: render.php
📄 Checking: style.scss
```

**Task Tool:** The same validator, but with the parameter:

```markdown
**Mode:** re-validation
**Check ONLY these files:**

- blocks/hero/edit.js
- blocks/hero/render.php
- blocks/hero/style.scss

**DO NOT read:**

- ${CLAUDE_PLUGIN_ROOT}/guides/validator-error-reporting.md (already in context)
- ${CLAUDE_PLUGIN_ROOT}/guides/validation-core-rules.md (already in context)
- Other block files (not changed)
```

**Final report:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fixes applied

Issues fixed: [N]

Applied fixes:
[For each fix]:
  ✓ [file]: [type]
    [description]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Re-validation...

[If successful]:
✅ All checks passed!
   Block "[blockName]" is fully correct.

[If issues remain]:
⚠️ Issues remain ([N]):

   Critical: [N]
   Warnings: [N]

   These issues require a manual fix.
   Instructions: /silince-gutnebrg-builder:show-fix-guide [blockName]
```

### STEP 5: Saving the report (if --report)

**Condition:** `--report <file>` is specified

```javascript
// Report structure
{
  "blockName": "...",
  "timestamp": "...",
  "status": "success|warning|error",
  "totalChecks": N,
  "passed": N,
  "errors": [...],
  "warnings": [...],
  "recommendations": [...],
  "autoFixed": {...} // if --fix was used
}
```

**Result:**

```
💾 Report saved: [reportFile]
```

---

## ⚠️ Error handling

**Block not found:**

```markdown
See ${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#51-check-block-exists
```

**Validator crashed:**

```
❌ Error during validation

Cause: [error.message]

Possible causes:
- Corrupted block files
- Invalid JSON in block.json
- Missing required files

Recreating the block is recommended:
/silince-gutnebrg-builder:create-block <source> --name [blockName]
```

**Fixer could not fix:**

```
⚠️ Not all issues were fixed automatically

Fixed: [N]
Remaining: [N]

The remaining issues require manual intervention.

Instructions:
/silince-gutnebrg-builder:show-fix-guide [blockName]
```

---

## 📊 Tokens

```
Without --fix:
  Validator (haiku): ~600 tokens
  Total: ~600 tokens

With --fix:
  Validator: ~600 tokens
  Fixer: ~400 tokens
  Validator (rerun): ~600 tokens
  Total: ~1600 tokens
```
