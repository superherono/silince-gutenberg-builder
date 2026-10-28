---
description: Analyze a Figma design or HTML markup without generating code
---

# Command: analyze-design

Analyze a Figma design or HTML markup WITHOUT generating code.

## 📥 Parameters

**source** (required):

- Figma URL: `https://figma.com/design/...?node-id=...`
- HTML file: `path/to/file.html`
- HTML + CSS: `path/to/file.html path/to/styles.css`

**Options:**

- `--output <file>`: save the specification to a file
- `--name <block-name>`: proposed block name

**Examples:**

```bash
/silince-gutnebrg-builder:analyze-design https://figma.com/design/ABC123?node-id=1-1390

/silince-gutnebrg-builder:analyze-design hero.html --output hero-spec.json

/silince-gutnebrg-builder:analyze-design hero.html hero.scss
```

---

## 🔄 Workflow

> **Common patterns:** See `guides/command-orchestration.md`
>
> - Config Reading Pattern
> - Task Tool Templates
> - Progress/Report Formatting

### STEP 0: Preparation

📖 **Config:** See `guides/command-orchestration.md#-1-config-reading-pattern`

**Parsing source:**

```markdown
See guides/command-orchestration.md#53-determine-source-type
```

**Progress:**

```
🔍 Analyzing the design...

Source: [Figma design / HTML markup]
[figmaUrl / htmlFile]
```

### STEP 1: Design analysis

```
╔══════════════════════════════════════╗
║  📊 Analyzing structure...           ║
╚══════════════════════════════════════╝
```

**Task Tool:** See `guides/command-orchestration.md#21-task-template-analyzer`

**Prompt additions:**

```markdown
**Task:** Analyze [figma/html] and extract:

1. The semantic structure of the block
2. Styles for all elements (desktop, tablet, mobile)
3. Design tokens (colors, fonts, spacing)
4. Recommended attributes
5. Recommended InspectorControls

[If Figma]:
**Figma URL:** [figmaUrl]
Use Figma MCP or ask for a screenshot

[If HTML]:
**HTML file:** [htmlFile]
[cssFile ? 'CSS file: [cssFile]' : 'CSS file not specified']

**IMPORTANT:**

- Follow the BEM methodology (prefix: block-)
- Define responsive styles for all breakpoints
- Extract ALL unique values into rawDesignData (colors, fonts, sizes)
- DO NOT create design-tokens.json (retired; the token source — the theme's `theme.json`)
- Return valid JSON with the full specification
```

**Progress during analysis:**

```
🔄 Extracting the structure...
🔄 Determining styles...
🔄 Collecting unique values (rawDesignData)...
```

### STEP 2: Detailed report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Analysis completed successfully!

📊 Analysis results:

🏗️ Block structure:
  Block: [blockName]
  Title: [blockTitle]
  Description: [description]

  Elements ([N]):
  [For each element]:
  - [tag].[className] [editable ? '✏️ editable' : '']

🎨 Styles:
  Defined for [N] elements
  Responsive breakpoints: [N]

  Examples:
  [Show the first 3 elements]:
  .[className]
    Desktop: font-size: [value]
    Mobile: font-size: [value]

🎯 Raw Design Data (unique values):

  Colors ([N]):
    [List of HEX values]

  Fonts ([N]):
    [List of fontFamily, fontSize, fontWeight]

  Spacing ([N]):
    [List of spacing values]

  📌 Design tokens come from the theme's theme.json (Generator will substitute var(--alias))

📝 Attributes ([N]):
  [For each attribute]:
  - [name] ([type]): [default]

🎛️ Recommended InspectorControls ([N]):
  [For each control]:
  - [label]: [control] ([attribute])

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Next steps:

1. Create a block based on the specification:
   /silince-gutnebrg-builder:create-block [source] --name [blockName]

2. Study the specification in detail:
   [outputFile ? 'File saved: [outputFile]' : 'Use --output']
```

### STEP 3: Saving the result (if --output)

**Condition:** `--output <file>` is specified

```javascript
// Save the JSON specification to a file
{
  "blockName": "...",
  "blockTitle": "...",
  "structure": {...},
  "styles": {...},
  "rawDesignData": {
    "colors": ["#1862FF", "#FFFFFF", ...],
    "fontFamilies": ["Mulish, sans-serif", ...],
    "fontSizes": ["16px", "24px", ...],
    "spacing": ["8px", "16px", ...],
    "borderRadius": ["4px", "400px", ...]
  },
  "attributes": {...},
  "recommendedControls": [...]
}
```

**Result:**

```
💾 Specification saved: [outputFile]
```

---

## ⚠️ Error handling

**Figma unavailable:**

```
❌ Could not access the Figma design

Causes:
- The design is private (no access rights)
- Wrong node-id in the URL
- Figma MCP is not configured

Solutions:
1. Make the design public (Share → Anyone with the link)
2. Check the node-id in the URL (format: ?node-id=X-Y)
3. Use a screenshot
4. Provide an HTML/CSS version
```

**HTML file not found:**

```
❌ HTML file not found: [htmlFile]

Check that:
- The file path is correct
- The file exists
- You have read permission

Try an absolute path or copy the file into the current directory
```

**Invalid HTML structure:**

```
⚠️ HTML structure not recognized

Cause: [error.message]

Possible reasons:
- Invalid HTML
- No semantic markup
- Structure is too complex

Recommendations:
- Simplify the HTML markup
- Use semantic tags
- Add BEM classes manually
```

---

## 📊 Tokens

```
Analyzer (haiku): ~800 tokens
Orchestrator: ~50 tokens (parsing + output)

Total: ~850 tokens
```

---

## ✅ Critical

1. **Analysis only** - the command does NOT generate code
2. **rawDesignData** - ALL unique values are extracted (Generator matches them against the theme's `theme.json`)
3. **Detailed report** - show all elements and styles
4. **BEM** - all classes must follow BEM
5. **Responsive** - analyze all breakpoints
