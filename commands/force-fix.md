---
description: Forced fix of errors in a Gutenberg block
---

# Command: force-fix

Aggressive automatic fix of errors in a Gutenberg block, including complex cases.

## 📥 Parameters

**block-name** (required): Name of the block to fix

**Options:**

- `--max-iterations <num>`: maximum number of iterations (default: 3)
- `--backup`: create a backup before fixing
- `--only <error-types>`: fix only specific types (comma-separated)

**Examples:**

```bash
/silince-gutnebrg-builder:force-fix hero --backup
/silince-gutnebrg-builder:force-fix hero --max-iterations 2
/silince-gutnebrg-builder:force-fix hero --only missing_i18n,missing_escaping
```

---

## ⚠️ Warning

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ WARNING: Forced fix

What will be done:
- An attempt to fix ALL errors found (including complex ones)
- Up to [maxIterations] iterations of validation and fixing
- Files are changed without confirmation

Recommended:
✓ Create a backup (--backup)
✓ Commit your changes to git before running

Continue? [Y/n]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔄 Workflow

> **Common patterns:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md`
>
> - Config Reading Pattern
> - Task Tool Templates
> - Max Iterations Pattern

### STEP 0: Confirmation

**Ask for confirmation:** `Are you sure? Type "yes" to continue:`

### STEP 1: Preparation

📖 **Config:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-1-config-reading-pattern`

**Backup (if --backup):**

```
📦 Creating a backup...
Path: [blockPath].backup-[timestamp]
```

**Progress:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Forced fix of "[blockName]"

Path: [blockPath]
Max iterations: [maxIterations]
[onlyTypes ? 'Only types: [types]' : 'All error types']
[backup ? 'Backup: [backupPath]' : '']
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### STEP 2: Iterative fixing

**Loop:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#54-max-iterations-pattern-for-fixer`

```
┌─────────────────────────────────────┐
│ Iteration [N]/[maxIterations]       │
└─────────────────────────────────────┘
```

#### STEP 2.1: Validation

```
🔍 Validating...
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#23-task-template-validator`

**Filtering (if --only):**

```javascript
errorsToFix = onlyTypes ? errors.filter((e) => onlyTypes.includes(e.type)) : errors;
```

**If there are no errors:**

```
✅ All issues fixed!
```

→ Exit the loop → STEP 3

**If there are errors:**

```
Issues found: [N]
Types: [list of unique types]
```

→ STEP 2.2

#### STEP 2.2: Aggressive fix

```
🔧 Fixing...
```

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#24-task-template-fixer`

**Prompt additions:**

```markdown
**IMPORTANT: Aggressive mode!**
Fix ALL errors, even complex ones.

**Errors:**
[JSON: errorsToFix]

**In aggressive mode:**

- Fix even complex errors
- Apply a best guess for ambiguous cases
- Add missing code
- Restructure when necessary
```

**Result:**

```
✓ Fixes applied: [N]
✓ Files changed: [N]

Applied fixes:
[For each fix]:
  ✓ [file]: [type]
```

**If nothing was fixed:**

```
⚠️ Could not apply fixes on this iteration.
Stopping the loop.
```

→ STEP 3

**Otherwise:** Next iteration → STEP 2.1

### STEP 3: Final validation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Fix summary

Iterations run: [N]
Total fixes: [N]
Files changed: [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Final validation...
```

**Run validation:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#23-task-template-validator`

#### CASE A: Everything fixed ✅

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Block "[blockName]" fixed successfully!

All checks passed:
✓ File structure is correct
✓ block.json is valid
✓ edit.js meets the standards
✓ save.js/render.php meets the standards
✓ style.scss follows BEM
✓ editor.scss is valid
✓ index.js is correct

Applied fixes ([N]):

[Grouped by file]:
[file]:
  ✓ [type]: [description]

[If backup]:
📦 Backup: [backupPath]
If something went wrong, restore from it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 The block is ready to use!
```

#### CASE B: Issues remain ⚠️

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Not all issues could be fixed

Ran [N] iterations (limit: [maxIterations])
Fixes applied: [N]

Remaining issues ([N]):

[For each error]:
[N]. [file]:[line]
   [type]: [message]
   Recommendation: [suggestion]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Applied fixes:
[Grouped by type]:
  [type]: [N] fixes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 What to do next:

1. Fix manually:
   /silince-gutnebrg-builder:show-fix-guide [blockName]

[If backup]:
2. Restore from the backup:
   cp -r [backupPath]/* [blockPath]/

3. Try other types:
   /silince-gutnebrg-builder:force-fix [blockName] --only [types]

[If the limit is reached]:
⚠️ Iteration limit reached ([maxIterations]).
   Try: --max-iterations [maxIterations+2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚠️ Error handling

**Block not found:**

```markdown
See ${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#51-check-block-exists
```

**User canceled:**

```
❌ Operation canceled by the user
Block not changed.
```

**Fixer critical error:**

```
❌ Critical error in the Fixer agent

Iteration: [N]
Cause: [error.message]

[If backup]:
📦 Restore from the backup:
cp -r [backupPath]/* [blockPath]/

Manual fixing is recommended.
```

---

## 📋 Error types

### Standard (same as in the regular Fixer):

1. missing_i18n
2. missing_escaping
3. px_instead_of_rem
4. wrong_use_block_props
5. missing_container
6. wrong_bem_class
7. wrong_richtext
8. missing_abspath
9. wrong_php_tags / missing_phpdoc
10. wrong_default_values / wrong_alternative_syntax

### Additional in aggressive mode:

11. missing_attributes - adds attributes
12. invalid_json - fixes JSON
13. missing_imports - adds imports
14. wrong_structure - restructures files
15. inconsistent_naming - unifies names

---

## 📊 Tokens

```
Per iteration:
  Validator: ~600 tokens
  Fixer: ~500 tokens
  Total: ~1100 tokens/iteration

3 iterations: ~3300 tokens
```
