# Super Users Reference

## Overview
Super Users (Owners) have unrestricted platform access and special privileges.

---

## Definition

A Super User is identified by:
- Role: `super_admin`
- Flag: `isSuperUser: true` in session

```typescript
const isSuperUser = session.role === 'super_admin' || session.isSuperUser;
```

---

## Privileges

### 1. Absolute Access
- **Bypass Paywalls** — All features available without subscription
- **View All Tenants** — Can switch context to any brand/dispensary
- **Full Analytics** — Access to platform-wide metrics

### 2. Executive Boardroom
- **Path**: `/dashboard/ceo`
- Access to Leo, Mike, Craig, Linus, Glenda agents
- Direct tool access (Gmail, Drive, Slack, GitHub)

### 3. Agent Capabilities
| Capability | Description |
|------------|-------------|
| Full Tool Access | Agent Discovery, Advanced Analytics |
| Sub-Agent Spawning | Can instantiate ephemeral agents |
| Direct API Access | Finance, Ops, Growth, Docs integrations |
| File Authority | CRUD on Knowledge Base and codebase |

### 4. Playbook Management
- Own and manage all playbooks across tenants
- Access to private/internal playbooks

---

## Executive Boardroom Protocol

The Executive Agents operate with **Level 5 Autonomy**:

1. **Direct Tool Access**
   - Email: Send/Read/Draft via Gmail
   - Files: Create/Edit in Google Drive
   - Code: Read/Write access to repository

2. **Sub-Agent Spawning**
   - Dynamically instantiate ephemeral agents
   - Example: "Linus spawns a React Refactor Bot"

3. **Command Chain**
   - **Leo** directs entire operational fleet
   - **Jack & Glenda** direct Mrs. Parker
   - **Linus** directs codebase health

---

## Super Admin Login

**Component**: `src/components/super-admin-login.tsx`

Special login flow for super admin access.

---

## Related Files
- `src/server/services/permissions.ts`
- `src/components/super-admin-login.tsx`
- `src/app/dashboard/ceo/` — Boardroom pages
