# Type Error Monitor

**Purpose**: Detect and respond to TypeScript type errors.

---

## Detection

### Primary Check
```bash
npm run check:types
```

### Parse Output
Extract errors matching pattern:
```
error TS\d+: .+ at (.+):(\d+):(\d+)
```

---

## Response Matrix

| Error Type | Code | Auto-Fix? | Strategy |
|------------|------|-----------|----------|
| Missing property | TS2339 | Yes | Add property or fix typo |
| Type not assignable | TS2322 | Yes | Cast or update type |
| Cannot find module | TS2307 | Yes | Fix import path |
| Argument type wrong | TS2345 | Yes | Fix argument |
| Missing return type | TS7030 | Yes | Add return type |
| Implicit any | TS7006 | Yes | Add explicit type |

---

## Auto-Fix Workflow

```yaml
trigger: type_error_detected
steps:
  - id: analyze
    action: parse error output
    extract: file, line, error_code, message
    
  - id: investigate
    action: view_file at error location
    context: ±10 lines
    
  - id: fix
    thinking_level: advanced
    action: apply type fix
    validate: npm run check:types
    
  - id: retry
    max_attempts: 2
    on_failure: escalate
```

---

## Common Fixes

### TS2339: Property does not exist
```typescript
// Before: obj.missingProp
// Fix: Check if property exists or add to interface
if ('missingProp' in obj) {
  obj.missingProp
}
```

### TS2322: Type not assignable
```typescript
// Before: const x: string = someNumber;
// Fix: Add proper cast or fix source
const x: string = String(someNumber);
```

### TS2345: Argument not assignable
```typescript
// Before: fn(wrongType)
// Fix: Transform argument to correct type
fn(correctType as ExpectedType);
```

---

## Metrics

Track type error patterns:
```json
{
  "type_monitor": {
    "errors_detected": 0,
    "errors_fixed": 0,
    "common_codes": {
      "TS2339": 0,
      "TS2322": 0,
      "TS2345": 0
    }
  }
}
```
