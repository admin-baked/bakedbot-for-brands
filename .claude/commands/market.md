---
name: market
description: Run a full AI marketing audit on any website URL — analyzes content, conversion, competitive positioning, technical SEO, and growth strategy. Outputs revenue-centric scores and actionable recommendations. Trigger phrases: "audit this site", "market audit", "analyze website", "run market audit", "/market", "check their marketing", "what's wrong with this site".
version: 0.1.0
owner: growth-marketing
agent_owner: craig
allowed_roles:
  - super_user
  - dispensary_operator
  - brand_operator
outputs:
  - market_audit_report
requires_approval: false
risk_level: low
status: active
---

# Market Audit

Run a comprehensive marketing audit on a website URL. Dispatches 5 parallel analysis agents then synthesizes a scored, revenue-centric report.

## Usage

```
/market <url>
/market https://dispensaryname.com
```

If no URL is provided, ask for one before proceeding.

## What It Does

Fetches the target site and runs 5 specialized analyses in parallel, then synthesizes results into a scored report with prioritized, revenue-weighted recommendations.

## Scoring Dimensions

| Dimension | Weight | What It Measures |
|---|---|---|
| Content & Messaging | 25% | Value prop clarity, strain/product copy, educational depth, CTAs |
| Conversion & Trust | 20% | Age gate UX, social proof, friction points, trust signals |
| SEO & Discoverability | 20% | Indexability, menu type, page speed, schema markup |
| Competitive Positioning | 15% | Differentiation, pricing signals, unique offers |
| Compliance & Fidelity | 20% | Cannabis-specific compliance, consent capture, audit trail signals |

## Execution Steps

**Step 1 — Fetch the site**
Use `WebFetch` to retrieve the target URL. If it fails (JS-heavy SPA), note it in the report and analyze what's available.

**Step 2 — Run 5 parallel analyses**

Launch these as parallel subagents (use the Agent tool with 5 simultaneous calls):

### Agent 1: Content & Messaging
Analyze the fetched HTML for:
- Headline clarity: Is the value proposition clear in 5 seconds?
- Product/strain copy: Do descriptions include effects, potency, use case?
- CTAs: Are they specific ("Find Your Strain") or generic ("Shop Now")?
- Educational content: Strain effects, consumption guides, first-timer info?
- Cannabis vocabulary: Do they use consumer-friendly language (relax, energize, focus) vs. dry clinical terms?

Score 0–25. Quote specific copy. Provide before/after rewrites for the 2 weakest areas.

### Agent 2: Conversion & Trust
Analyze for:
- Age gate: None / Basic (click-through) / Strong (DOB entry)?
- Social proof: Review count visible, star ratings, testimonials, loyalty member count?
- Friction: How many clicks from landing to product? Is there a search/filter?
- Urgency/scarcity: Low-stock badges, flash sale banners, limited editions?
- Trust signals: Lab results (COA links), brand story, staff picks?

Score 0–20. Identify top 2 friction points with fix estimates (effort: low/med/high, revenue impact: $X/mo).

### Agent 3: SEO & Technical
Analyze for:
- Menu type: Iframe embed (bad) / Embedded widget / Headless on-domain (best)?
- Title tags and meta descriptions: Present, keyword-rich, under character limits?
- Schema markup: Organization, Product, LocalBusiness, Review schemas?
- Internal linking: Category pages linked, breadcrumbs present?
- Page speed signals: Excessive scripts, render-blocking resources, image sizes?
- Local SEO: NAP consistency, Google Business Profile signals?

Score 0–20. List top 3 technical wins ranked by effort-to-impact.

### Agent 4: Competitive Positioning
Analyze for:
- Differentiation: What makes this brand/dispensary unique vs. competitors?
- Pricing signals: Displayed pricing, deals section, loyalty program visibility?
- Brand voice: Formal/casual, medical/recreational, premium/value?
- Target audience clarity: Is the site clearly built for a specific customer type?
- Gaps: What do competitors typically offer that this site is missing?

Score 0–15. Identify 2–3 positioning opportunities.

### Agent 5: Compliance & Fidelity
Analyze for:
- SMS/email consent: Visible opt-in forms, consent language, STOP instructions?
- Age verification: Compliant DOB gate or just a click-through?
- Forbidden language: "cure", "treat", "medical benefit", "guaranteed", "proven to" — flag any found
- Responsible use messaging: Present and prominent?
- State compliance signals: Legal disclaimers, license numbers visible?

Score 0–20. Flag any compliance risks with severity (HIGH / MEDIUM / LOW).

**Step 3 — Synthesize report**

Combine all 5 agent outputs into the structured report below.

## Output Format

```
## Market Audit: [Domain] — [Date]

**Overall Score: XX/100** ([Grade: A/B/C/D/F])
[One-sentence executive summary]

---

### Dimension Scores

| Dimension | Score | Grade |
|---|---|---|
| Content & Messaging | XX/25 | B |
| Conversion & Trust | XX/20 | C |
| SEO & Discoverability | XX/20 | D |
| Competitive Positioning | XX/15 | B |
| Compliance & Fidelity | XX/20 | A |

---

### Top 3 Revenue Leaks

**1. [Issue title]**
- Why it matters: [specific impact]
- Fix: [concrete action]
- Estimated impact: +$X,XXX/mo | Effort: [Low/Med/High] | Time: [X weeks]

**2. [Issue title]**
...

**3. [Issue title]**
...

---

### Quick Wins (< 1 week, high impact)

- [ ] [Action] → Expected: [outcome]
- [ ] [Action] → Expected: [outcome]
- [ ] [Action] → Expected: [outcome]

---

### Copy Rewrites

**Before:** "[exact quote from site]"
**After:** "[optimized version]"
**Why:** [specific reason]

---

### Compliance Flags

[HIGH] [issue] — [specific fix required]
[MEDIUM] [issue] — [recommended fix]

---

### A/B Tests to Run

**Test 1:**
If [change X] then [metric Y improves by Z%]
Metric: [what to measure] | Duration: 2 weeks

**Test 2:**
...

---

### Reviewer Notes

[One paragraph: overall assessment, biggest opportunity, recommended first step]
```

## Cannabis-Specific Rules

- Always check for forbidden medical claims: cure, treat, treatment, prescribe, diagnose, guaranteed, proven to, FDA approved, clinically proven, medical benefit, therapy, medication
- Flag missing age gates as HIGH compliance risk
- Note if menu is iframe-based (major SEO liability for dispensaries)
- Check for STOP/opt-out instructions on any SMS consent forms
- Flag missing lab result (COA) links for product pages
- If NY site: check for "Must be 21 or older with valid government-issued photo ID" language

## Edge Cases

- **JS-heavy SPA / no content returned:** Note limitation, analyze what's visible (title, meta, any SSR content), recommend Lighthouse audit
- **Competitor site:** Still run full audit — findings inform counter-positioning for the operator
- **Multiple locations / franchise:** Focus on the homepage + one product page as representative sample
- **Site returns 403/blocked:** Note it, analyze from domain + any cached/public content available
