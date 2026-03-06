# Security Soren - Architecture

## Overview

Security Soren owns cross-cutting security controls for BakedBot:
- authentication and authorization enforcement
- prompt and input hardening
- secret management hygiene
- security regression coverage

## Core Boundaries

1. **Auth boundary**: `src/server/auth/` controls identity, sessions, and role checks.
2. **Security boundary**: `src/server/security/` handles sanitization and prompt attack defense.
3. **Permission boundary**: service and tool-level permission checks gate privileged actions.
4. **Secret boundary**: runtime secrets must not be hardcoded and must be externally provisioned.

## Primary Flows

1. Request enters route/action.
2. Auth identity resolved.
3. Role/permission checks applied.
4. Untrusted text/input sanitized or guarded.
5. Protected business logic executes.
6. Security tests validate regression risk.

## Ownership Note

Security changes are cross-domain by nature. Coordinate with domain owners when changing shared contracts.

---

*Architecture version: 1.0 | Created: 2026-03-05*
