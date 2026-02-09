# Training Program Setup Guide

## Overview

You now have 3 ways to enroll interns in the training program:

1. **Command Line Script** (quickest for dev/testing)
2. **UI Dialog Component** (for admin dashboard)
3. **Server Actions** (for programmatic access)

---

## Method 1: Command Line Script (Recommended for Quick Setup)

### Usage

```powershell
# Install tsx if you haven't already
npm install -g tsx

# Run the script
npx tsx scripts/set-intern-role.ts user@example.com
```

### Example

```powershell
PS> npx tsx scripts/set-intern-role.ts intern@bakedbot.ai

Found user: intern@bakedbot.ai (abc123xyz)
✅ Successfully set role to "intern"
⚠️  User must sign out and back in for changes to take effect

Current custom claims: { role: 'intern', enrollmentDate: '2026-02-09T...' }
```

### What it does:
- Looks up user by email
- Sets custom claims: `{ role: 'intern', enrollmentDate: '...' }`
- User can now access `/dashboard/training`

---

## Method 2: UI Dialog Component (For Admin Dashboard)

### Add to Training Admin Page

```tsx
import { EnrollInternDialog } from '@/components/training/enroll-intern-dialog';

// In your training admin page
<EnrollInternDialog />
```

### Features:
- 🎯 Enter user UID directly
- 📋 Optional cohort assignment
- ✅ Success/error toasts
- 🔄 Auto-refresh after enrollment

### Where to find UIDs:
1. Firebase Console → Authentication → Users
2. Or programmatically via `getAdminAuth().getUserByEmail(email)`

---

## Method 3: Server Actions (Programmatic)

### Available Actions

```typescript
import { enrollIntern, setUserRole, getUserClaims } from '@/server/actions/admin/set-user-role';

// 1. Enroll as intern (simplified)
const result = await enrollIntern({
  uid: 'user-uid',
  cohortId: 'cohort-2026-q1' // optional
});

// 2. Set any role (more flexible)
const result = await setUserRole({
  uid: 'user-uid',
  role: 'intern',
  additionalClaims: {
    cohortId: 'cohort-2026-q1',
    orgId: 'org_123',
    planId: 'empire'
  }
});

// 3. Get current claims
const claims = await getUserClaims('user-uid');
```

### All require `super_user` role

---

## Quick Start: Enroll Your First Intern

### Step 1: Create Test Account
1. Visit `http://localhost:3000/training`
2. Sign up with email: `intern-test@bakedbot.ai`
3. Note: You'll see "contact admin" message

### Step 2: Set Role
```powershell
npx tsx scripts/set-intern-role.ts intern-test@bakedbot.ai
```

### Step 3: Sign In
1. User signs out
2. User signs back in
3. User is redirected to `/dashboard/training` ✅

---

## Finding User UIDs

### Option 1: Firebase Console
1. Go to Firebase Console
2. Authentication → Users
3. Copy UID from the list

### Option 2: Command Line
```powershell
npx tsx scripts/get-user-uid.ts user@example.com
```

### Option 3: In Code
```typescript
import { getAdminAuth } from '@/firebase/admin';

const user = await getAdminAuth().getUserByEmail('user@example.com');
console.log(user.uid);
```

---

## Roles Available

| Role | Access Level | Training Access |
|------|-------------|-----------------|
| `intern` | Training only | ✅ Full access |
| `super_user` | Everything | ✅ Admin + courses |
| `owner` | Business owner | ❌ No |
| `brand` | Brand account | ❌ No |
| `dispensary` | Dispensary | ❌ No |
| `customer` | Customer | ❌ No |

---

## Troubleshooting

### User still can't access training after role set
- ✅ Make sure they signed out and back in
- ✅ Check custom claims: `await getUserClaims(uid)`
- ✅ Verify session cookie was refreshed

### "User not found" error
- ✅ Check email spelling
- ✅ Verify user exists in Firebase Console
- ✅ Make sure they completed signup

### Script not working
```powershell
# Install dependencies
npm install

# Try with explicit tsx
npx tsx scripts/set-intern-role.ts email@example.com

# Or compile first
npx tsc scripts/set-intern-role.ts
node scripts/set-intern-role.js email@example.com
```

---

## Next Steps

1. ✅ Enroll test intern
2. ✅ Verify they can access `/dashboard/training`
3. 📚 Create cohorts in Training Admin
4. 🎓 Monitor progress via Training Admin dashboard
5. 🚀 Scale to full cohort

---

## Files Created

- `scripts/set-intern-role.ts` - CLI script
- `src/server/actions/admin/set-user-role.ts` - Server actions
- `src/components/training/enroll-intern-dialog.tsx` - UI component
- `src/app/training/page.tsx` - Public landing page

---

**Questions?** Check the training admin dashboard or contact your super admin.
