# Skill: Generate New Skill

**Purpose**: Automatically create new skills when capability gaps are detected.

---

## Trigger

- Gap detected: Same error type fails 3+ times without skill coverage
- Manual: `/generate-skill <description>`
- Optimization: When optimize-workflow identifies missing capability

---

## Workflow

### Step 1: Detect Gap
```
Analyze recent failures:
  - Check metrics.json for patterns
  - Find errors without matching skill
  - Verify gap occurs 3+ times
```

### Step 2: Design Skill
```
Based on gap analysis, define:
  - Name: descriptive, kebab-case
  - Purpose: one-line description
  - Trigger: when to activate
  - Workflow: step-by-step resolution
  - Success criteria: how to validate
```

### Step 3: Generate Files
Using skill template, create:
```
.agent/skills/<skill-name>/
├── skill.md       # Main definition
└── cookbook/      # Pattern library (optional)
```

### Step 4: Validate
```
1. Syntax check skill.md
2. Test on known failure case
3. Verify success criteria met
```

### Step 5: Register
```
1. Update .agent/prime.md with new skill
2. Update metrics.json with skill entry
3. Log to progress_log.md
```

### Step 6: Notify
```
Message: "New skill '{{skill_name}}' created and tested.
Purpose: {{purpose}}
Success rate on test: {{success_rate}}"
```

---

## Skill Template

```markdown
# Skill: {{Name}}

**Purpose**: {{One-line description}}

---

## Trigger

{{When this skill activates}}

---

## Variables

| Variable | Source | Required |
|----------|--------|----------|
| {{var1}} | {{source}} | Yes/No |

---

## Workflow

### Step 1: {{Name}}
{{Description}}

### Step 2: {{Name}}
{{Description}}

...

---

## Validation

{{How to verify success}}

---

## Metrics

Update after each run:
- total_runs
- successes
- failures
```

---

## Gap Detection Rules

Create skill when:
1. Error pattern occurs 3+ times
2. No existing skill addresses it
3. Pattern is automatable (not requiring human judgment)
4. Success criteria can be validated

Skip skill creation when:
- Pattern requires human decision
- Pattern is one-time occurrence
- Existing skill can be extended instead
