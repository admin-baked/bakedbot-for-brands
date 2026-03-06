# Security Soren - Patterns & Gotchas

## Critical Patterns

### Pattern 1: Auth first, logic second
```typescript
const user = await requireUser();
if (!user) return unauthorized;
if (!hasRole(user, 'admin')) return forbidden;
// business logic only after checks
```

### Pattern 2: Never trust unbounded text input
```typescript
const safe = sanitizeInput(untrustedText);
const guarded = await runPromptGuard(safe);
```

### Pattern 3: Secrets via env or manager only
```typescript
const key = process.env.SERVICE_API_KEY;
if (!key) throw new Error('SERVICE_API_KEY missing');
```

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Unauthorized data access | Missing role check | Add RBAC guard before query/write |
| Prompt abuse leakage | No prompt guard pass | Route input through prompt guard pipeline |
| Deploy blocked for secrets | Secret misconfigured | Add secret version + grant access |
| Security regression returns | No targeted tests | Add route/action security tests for the path |

---

*Patterns version: 1.0 | Created: 2026-03-05*
