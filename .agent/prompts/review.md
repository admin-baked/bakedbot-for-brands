# Code Review Closed-Loop

**Purpose**: Validate all changes before commit  
**Type**: Pre-commit validation with auto-fix

---

## Trigger

User says `/review` or "review changes"

---

## Validation Steps

### Step 1: Check Git Status
```bash
git status
git diff --cached --name-only
```
Identify which files are staged.

### Step 2: Type Check
```bash
npm run check:types
```
**If fails**: Fix type errors → re-run → max 3 attempts

### Step 3: Run Affected Tests
For each changed file, check `dev/test_matrix.json` for relevant tests.
```bash
npm test -- <affected-tests>
```
**If fails**: Use `fix-failing-test` skill → re-run

### Step 4: SWARM Rules Compliance
Verify:
- [ ] Exploration Sequence was followed
- [ ] No hardcoded secrets
- [ ] No unauthorized file deletions
- [ ] Tests exist for new code

---

## Resolution

### All Pass ✅
1. Generate conventional commit message:
   ```
   <type>(<scope>): <description>
   
   <body with details>
   ```
2. Create commit:
   ```bash
   git commit -m "<message>"
   ```
3. Update `dev/backlog.json` (mark completed tasks)
4. Update `dev/progress_log.md`

### Any Fail ❌
1. Identify failing step
2. Auto-fix if possible (up to 3 attempts)
3. If cannot fix: Report issue to user
4. **NEVER commit with failing tests**

---

## Commit Types

| Type | Use When |
|------|----------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding/fixing tests |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `chore` | Build, config, dependencies |
