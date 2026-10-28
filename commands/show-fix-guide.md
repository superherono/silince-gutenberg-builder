---
description: Detailed instructions for fixing errors in a block
---

# Command: show-fix-guide

Detailed instructions for manually fixing errors in a Gutenberg block.

## 📥 Parameters

**block-name** (required): Name of the block to analyze

**Options:**

- `--type <error-type>`: show instructions only for a specific type
- `--save <file>`: save the instructions to a markdown file

**Examples:**

```bash
/silince-gutnebrg-builder:show-fix-guide hero
/silince-gutnebrg-builder:show-fix-guide hero --type missing_i18n
/silince-gutnebrg-builder:show-fix-guide hero --save fix-instructions.md
```

---

## 🔄 Workflow

> **Common patterns:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md`
>
> - Config Reading Pattern
> - Task Tool Templates

> **Fix examples:** See `${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md`
>
> - Templates for 13+ error types
> - Code BEFORE and AFTER
> - Detailed explanations

### STEP 0: Preparation

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Fix instructions: "[blockName]"

Analyzing the block...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### STEP 1: Block validation

📖 **Config:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#-1-config-reading-pattern`

**Task Tool:** See `${CLAUDE_PLUGIN_ROOT}/guides/command-orchestration.md#23-task-template-validator`

**Prompt additions:**

```markdown
**Block path:** [blockPath]

Return a detailed report with all errors (file, line, type, code, description).
```

### STEP 2: Grouping errors

**Filtering (if --type):**

```javascript
errors = specificType ? validationResult.errors.filter((e) => e.type === specificType) : validationResult.errors;
```

**Grouping:**

```javascript
errorsByType = groupBy(errors, 'type');
```

### STEP 3: Generating the instructions

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Error fix guide

Block: [blockName]
Path: [blockPath]

Error types found: [N]
Total errors: [N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**For each error type:**

````markdown
## [Icon] [Error type name]

**Errors found:** [N]

### What it means:

[Short description of the problem from ${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md]

### Why it matters:

[Severity and consequences]

### Examples of errors in your block:

[For each error]:

#### [N]. [file]:[line]

**Current code:**

```[language]
[error.code from the user's block]
```
````

**Fixed code:**

```[language]
[error.correctCode or a generated one]
```

**Explanation:**
[Explanation of the specific error]

### How to fix:

[Step-by-step instructions from ${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md]

### Check after fixing:

```bash
/silince-gutnebrg-builder:validate-block [blockName]
```

---

```

**Use the templates:** See `${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md` for detailed examples of each type:
- missing_i18n
- missing_escaping
- px_instead_of_rem
- wrong_use_block_props
- missing_container
- wrong_bem_class
- wrong_richtext
- missing_abspath
- wrong_php_tags
- missing_phpdoc
- wrong_default_values
- wrong_alternative_syntax
- And others

### STEP 4: Summary and next steps

```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SUMMARY

Error types: [N]
Total errors: [N]

By type:
[For each type]:
[Icon] [type]: [N] [autoFixable ? '(can be fixed automatically)' : '']

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 NEXT STEPS:

1. Fix the errors manually, following the instructions above

2. After fixing, run validation:
   /silince-gutnebrg-builder:validate-block [blockName]

3. If simple errors remain, try the auto-fix:
   /silince-gutnebrg-builder:validate-block [blockName] --fix

4. For an aggressive fix:
   /silince-gutnebrg-builder:force-fix [blockName] --backup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 USEFUL LINKS:

- Validation Rules: ${CLAUDE_PLUGIN_ROOT}/guides/validation-core-rules.md
- Fix examples: ${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md
- CSS Custom Properties: ${CLAUDE_PLUGIN_ROOT}/guides/css-custom-properties.md
- Button Template System: ${CLAUDE_PLUGIN_ROOT}/guides/button-template-system.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[If saveFile]:
💾 Instructions saved: [saveFile]

```

### STEP 5: Saving (if --save)

**Condition:** `--save <file>` is given

**Format:** Markdown with detailed instructions for all error types found

```

💾 Instructions saved to file: [saveFile]

```

---

## 📖 Error type map

| Type | Icon | Auto-fix | Severity |
|-----|--------|----------|-------------|
| missing_i18n | 🌍 | ✅ | 🟡 |
| missing_escaping | 🔒 | ✅ | 🔴 |
| px_instead_of_rem | 📏 | ✅ | 🟡 |
| wrong_use_block_props | ⚛️ | ✅ | 🔴 |
| missing_container | 📦 | ✅ | 🔴 |
| wrong_bem_class | 🏗️ | ✅ | 🟡 |
| wrong_richtext | 📝 | ✅ | 🔴 |
| missing_abspath | 🔐 | ✅ | 🔴 |
| wrong_php_tags | 🐘 | ✅ | 🟡 |
| missing_phpdoc | 📄 | ✅ | 🟡 |
| wrong_default_values | ⚠️ | ✅ | 🔴 |
| wrong_alternative_syntax | 📋 | ✅ | 🟡 |

**Detailed fix templates:** See `${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md`

---

## 📊 Tokens

```

Validator: ~600 tokens
Instruction generation: ~200 tokens

Total: ~800 tokens

```

---

## ✅ Critical

1. **Detailed examples** - show the BEFORE and AFTER code from the user's block
2. **Use ${CLAUDE_PLUGIN_ROOT}/guides/auto-fix-examples.md** - do not duplicate the templates, refer to the guide
3. **Block context** - examples must come from the user's real code
4. **Explanations** - explain WHY this is an error and HOW to fix it
5. **Next steps** - give a clear action plan
6. **Saving** - an option for a markdown file
```
