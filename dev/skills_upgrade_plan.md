# Day Day Skills Upgrade Plan: Continuous SEO Learning

**Objective:** Transform Day Day from a static execution agent into a dynamic learning agent that adapts to Google's algorithm updates and cannabis industry trends.

---

## 1. The Core Loop: "Scan -> Synthesize -> Standardize"

We will implement a **Knowledge Ingestion Pipeline** that runs weekly.

### Step 1: Trend Scanning (The Eyes)
**New Job:** `src/server/jobs/dayday-trend-scan.ts`
*   **Trigger:** Weekly (Sunday Night).
*   **Tool:** `Firecrawl` (Deep web scraping) + `Google Search`.
*   **Sources:**
    *   Search Engine Land / SEJ ("Latest Google Algorithm Updates")
    *   Google Webmaster Central Blog
    *   Cannabis Industry Journals (MJBizDaily - Retail tech section)
    *   Competitor Sitemaps (Structure analysis)

### Step 2: Synthesis (The Brain)
**Action:** `analyzeSeoTrends`
*   **Input:** Raw text/HTML from Step 1.
*   **Prompt:** "Analyze these articles for *actionable* changes. Ignore fluff. Focus on: Schema markup, Keyword density rules, Core Web Vitals, E-E-A-T signals for YMYL (Your Money Your Life) niches."
*   **Output:** Structured JSON of "SEO Rules".

### Step 3: Skill Standardization (The Manual)
**Integration:** `LearningService`
*   Instead of learning from *trajectories*, we add a method `createSkillFromKnowledge()`.
*   **Artifact:** `src/skills/generated/day_day/current_seo_standards.md`.
*   **Format:**
    ```markdown
    # 2026 Cannabis SEO Standards
    ## E-E-A-T Rules
    - Must include "Medical Reviewer" for health claims.
    - Local schemas must link to state license numbers.
    ## Technical
    - Core Web Vitals threshold: < 2.5s LCP.
    ## Content
    - Avoid these spam trigger words: [ ... ]
    ```

---

## 2. Implementation Roadmap

### Phase A: Knowledge Pipeline (Week 1)
- [ ] Create `dayday-trend-scan.ts` job.
- [ ] Implement `Firecrawl` scraping for trusted SEO domains.
- [ ] Connect to `LearningService` to save output as a Skill.

### Phase B: Runtime Integration (Week 2)
- [ ] Update `dayday.ts` to *automatically load* `current_seo_standards.md` into its system prompt or context.
- [ ] Add a `checkCompliance(content)` step that validates generated text against the new rules.

### Phase C: Feedback Loop (Ongoing)
- [ ] **Rank Tracking:** Use Search Console data to see if pages following new rules rank better.
- [ ] **A/B Testing:** Have Day Day generate Variant A (Old Rules) vs Variant B (New Rules) for similar ZIPs and compare performance.

---

## 3. Example "Trend Scan" Workflow

```yaml
name: Day Day Trend Watch
on: schedule (weekly)

steps:
  - name: "Scan Google Blog"
    tool: firecrawl.scrape
    url: "https://developers.google.com/search/blog"

  - name: "Scan Search Engine Land"
    tool: web_search
    query: "Google algorithm update 2026 impact cannabis"

  - name: "Synthesize"
    agent: day_day
    task: "Update knowledge base with new findings"

  - name: "Save Skill"
    action: learning_service.save_skill
    name: "seo-trends-2026-q1"
```

## 4. Next Actions
- [ ] Approve this plan.
- [ ] Build the `dayday-trend-scan` job.
