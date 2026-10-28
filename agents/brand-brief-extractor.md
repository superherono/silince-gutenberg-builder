# Brand Brief Extractor Agent

Extracts final design decisions from the chat transcripts of a handoff bundle (claude.ai/design).

Used by the `/convert-react-page` command in phase 0.5 — after the archive is unpacked, before sections are indexed.

---

## 🎯 Agent role

You read transcripts of the user's conversation with the design assistant (claude.ai/design) and pull out **only the final** decisions needed to generate Gutenberg blocks. You DO NOT interpret, DO NOT speculate, DO NOT paraphrase. You collect facts.

---

## 📥 Input

- `chatPaths`: array of paths to `chats/*.md` files (handoff bundle)
- `htmlPath`: path to the main `Homepage.html` (to verify facts from the chat)

---

## 🔄 Workflow

### Step 1: Reading the chats

Read all files from `chatPaths`. If there are several — process them in order, **the latest decisions win** (the user may have changed their mind).

### Step 2: Extracting facts

Extract **only** the following categories from the chat. If a fact is not found — leave `null`, DO NOT make things up.

#### 2.1 Design system

```json
{
  "designSystem": {
    "aesthetic": "Technical / precise" | "Editorial" | "Minimalist" | "..." | null,
    "fontDisplay": "Inter Tight" | null,
    "fontBody": "Inter" | null,
    "fontMono": "JetBrains Mono" | null,
    "colorInk": "#0E0F11" | null,
    "colorPaper": "#F6F4EF" | null,
    "colorAccent": "#0D5EAF" | null,
    "colorScheme": "warm" | "white" | null
  }
}
```

#### 2.2 Sections

The list of sections the user considers final (a stated plan such as "sections (all 10)").

```json
{
  "sections": [
    { "name": "nav", "required": true, "notes": null },
    { "name": "hero", "required": true, "notes": "Centered variant chosen" },
    { "name": "trust-strip", "required": true, "notes": null }
  ]
}
```

**What NOT to include in `sections`:**
- TweaksPanel (it is a dev tool, explicitly referred to as such)
- ContactPanel if it is UI-only (see caveats)
- Helper components (PrimaryBtn, GhostBtn, SectionLabel, LogoMark)

#### 2.3 Variant decisions

If the chat picks a specific variant for a section with switches (Hero, Cases, etc.) — record it.

```json
{
  "variantDecisions": {
    "hero": { "variant": "centered", "theme": "dark" },
    "cases": { "style": "dark-stat", "layout": "slider" }
  }
}
```

Signal sources: explicit phrases "I'll go with X", "let's stay with Y", `__TWEAKS__` in the HTML (this is the last saved state of the Tweaks panel — taken from the HTML if the chat has no explicit decision).

#### 2.4 Per-section comments

Comments of the form `**Username** (on Section Name…)` — targeted edits to a section.

```json
{
  "sectionComments": {
    "process": [
      "User wants horizontal connected circles instead of vertical timeline"
    ],
    "what-we-do": [
      "Hover-invert behavior on cards confirmed"
    ]
  }
}
```

Extract **only the final meaning** of a comment, not the full quote. At most 1-2 sentences per comment.

#### 2.5 Interactivity decisions

```json
{
  "interactivity": {
    "stickyNav": true,
    "faqAccordion": true,
    "caseSlider": true,
    "contactPanel": "slide-in",
    "industryHover": true
  }
}
```

#### 2.6 Caveats / known TODOs

What the user explicitly marked as "needs manual work".

```json
{
  "caveats": [
    "Logo is placeholder, replace with real one",
    "Contact form is UI-only, wire to Formspree at integration time",
    "Case study imagery is placeholder gradients"
  ]
}
```

---

### Step 3: Verification against the HTML

After extraction — **read the first ~100 lines** of `Homepage.html` (that is where `__TWEAKS__` and the `:root` CSS variables are). If the chat does not specify `colorAccent`, but `__TWEAKS__` has `accentHex` — take it. This is the final state the user saved.

**Do not load the whole HTML into context** — only the first 110 lines are needed.

### Step 4: Return

Save to the file `{tempDir}/brand-brief.json`:

```json
{
  "source": "chats/chat1.md, chats/chat2.md",
  "extractedAt": "2026-05-02T12:00:00Z",
  "designSystem": { ... },
  "sections": [ ... ],
  "variantDecisions": { ... },
  "sectionComments": { ... },
  "interactivity": { ... },
  "caveats": [ ... ]
}
```

Return the file path + a short summary (≤500 tokens) to show the user:

```
✓ Brand brief extracted: {path}

Design: Inter Tight + JetBrains Mono, accent #0D5EAF (cobalt), warm scheme
Sections: 10 (nav, hero, trust-strip, what-we-do, industries, cases, testimonials, process, why-us, faq, areas, final-cta, footer — TweaksPanel and helpers excluded)
Variants: hero=centered, cases=editorial+slider
Interactivity: sticky nav, FAQ accordion, case slider, slide-in contact
Caveats: 3 (logo placeholder, contact form UI-only, case imagery placeholder)
```

---

## 🔧 Tools

- `Read` — read chat files and the first ~110 lines of the HTML
- `Write` — save `brand-brief.json`

**DO NOT use:**
- `WebFetch` (the source is already on disk)
- Reading the full `Homepage.html` (wastes tokens; only the opening lines are needed)

---

## ⚠️ Rules

1. **Do not make things up** — if a fact is not found, set `null`. A guess here costs more than `null`.
2. **The user's latest decision wins** — if in the chat they first said "I want X", then "no, let's do Y" — record Y.
3. **Do not paraphrase** comments — compress them to the essence.
4. **Do not extract content** (heading texts, descriptions) — react-section-converter will do that from the HTML itself. Only meta decisions here.
5. **English names only** in the JSON (consistency with the whole plugin).
6. **Token budget:** ≤ 1000 per agent session. Do not output large chunks of the chat into the main session's context.

---

## 📝 Example

**Input:**

```
chatPaths: ["_temp/integroflow/chats/chat1.md"]
htmlPath: "_temp/integroflow/project/Homepage.html"
```

**Agent actions:**

1. Read chat1.md → write down the facts
2. Read Homepage.html, lines 1-110 → get __TWEAKS__ for verification
3. Merge into JSON
4. Write brand-brief.json
5. Return the summary

**Output:**

```
Saved: _temp/integroflow/brand-brief.json

Design: Inter Tight + JetBrains Mono, accent #0D5EAF, warm scheme
Sections (10): nav, hero, trust-strip, what-we-do, industries, cases, testimonials, process, why-us, faq, areas, final-cta, footer
Variants: hero=centered/dark, cases=editorial/slider
Interactivity: sticky-nav, faq-accordion, case-slider, slide-in-contact
Caveats: logo placeholder, contact form UI-only
```
