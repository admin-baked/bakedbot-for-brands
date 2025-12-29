# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

---

## 🎯 Codebase Context

You are working on **BakedBot AI**, a multi-agent cannabis commerce platform.

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Backend | Firebase (Firestore, Auth, App Hosting) |
| AI Core | Google Genkit, Gemini 2.5/3 |
| Testing | Jest + Playwright |
| Styling | Tailwind CSS, ShadCN UI |

---

## 📋 Critical Protocols

### Before ANY Code Changes:
```bash
git pull origin main --rebase
```

### The 4-Step Exploration Sequence:
1. **Directory Tree** - `list_dir` on relevant directories
2. **Related Files** - `find_by_name`, `grep_search` for patterns
3. **Deep Read** - `view_file` each relevant file (NEVER assume)
4. **Pattern Summary** - Document patterns before implementing

### Fix → Test → Ship Loop:
1. Make change
2. Run test (`npm test -- <file>.test.ts`)
3. If fail → analyze + retry (max 3x)
4. If pass → update backlog + commit

---

## 🛠️ Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Fix Test | `/fix <task_id>` | Auto-diagnose and fix failing test |
| Review | `/review` | Validate all changes before commit |
| Type Check | `/types` | Run `npm run check:types` |

---

## 📁 Key File Locations

| Purpose | Path |
|---------|------|
| Task Backlog | `dev/backlog.json` |
| Test Commands | `dev/test_matrix.json` |
| Progress Log | `dev/progress_log.md` |
| Swarm Rules | `dev/SWARM_RULES.md` |
| Session State | `.agent/state/session.json` |

---

## 🔄 Session State

Check `.agent/state/session.json` for:
- Current task being worked on
- Tests that have been run
- Validation status

Update session state after each significant action.

---

## ✅ Pre-Commit Checklist

Before EVERY commit:
- [ ] `npm run check:types` passes
- [ ] Affected tests pass
- [ ] Updated `dev/progress_log.md`
- [ ] Updated `dev/backlog.json` status
- [ ] Conventional commit message

---

## 🚫 Never Do

- Skip Exploration Sequence
- Commit without running tests
- Assume file contents
- Leave `console.log` in production code
- Mark task "passing" without running test
