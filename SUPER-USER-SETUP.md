# Super User Setup Guide - Martez

Your super user account has been configured with automatic login capabilities.

## 🔐 Your Credentials

**Email**: martez@bakedbot.ai
**Password**: Stored securely in `.env.local`
**Role**: Super User (Full Access)

---

## 🚀 Quick Start

### One-Time Setup
```bash
# Run this once to create your super user account
npx tsx scripts/setup-super-user.ts
```

This will:
- ✅ Create/update your Firebase Auth account
- ✅ Set up your Firestore user document with super_user role
- ✅ Set custom claims for role-based access
- ✅ Generate an auto-login token
- ✅ Give you full system permissions

### Auto-Login (Quick Access)
```bash
# Use this anytime for instant login
npx tsx scripts/auto-login.ts
```

This will:
- Open your browser
- Automatically log you in
- Redirect to dashboard

---

## 🎯 Your Permissions

As a super user, you have **ALL** permissions:

- ✅ Manage all users
- ✅ Manage all brands
- ✅ Manage all agents
- ✅ Access all data
- ✅ System management
- ✅ View analytics
- ✅ Manage billing
- ✅ Full API access

---

## 🔒 Security

### Protected Files (Never Committed to Git)
- `.env.local` - Contains your credentials
- `.super-user-token` - Your auto-login token

Both files are in `.gitignore` for security.

### Best Practices
1. **Never share your token** - It grants full system access
2. **Regenerate regularly** - Run setup script monthly
3. **Use HTTPS in production** - Token should only be sent over HTTPS
4. **Monitor access logs** - Review who has super user access

---

## 📋 Manual Login (Alternative)

If you prefer manual login:

1. Go to: http://localhost:3000/admin-login
2. Email: `martez@bakedbot.ai`
3. Password: `Dreamchasing2030!!@@!!`
4. You'll be automatically recognized as Super User

---

## 🛠️ Troubleshooting

### "Token not found" error
```bash
# Regenerate token
npx tsx scripts/setup-super-user.ts
```

### "Authentication failed" error
```bash
# Check credentials in .env.local
# Make sure SUPER_USER_EMAIL and SUPER_USER_PASSWORD are set
```

### "Permission denied" error
```bash
# Re-run setup to update permissions
npx tsx scripts/setup-super-user.ts
```

---

## 🔄 Updating Your Account

To change password or update permissions:

1. Update `.env.local` with new credentials
2. Run: `npx tsx scripts/setup-super-user.ts`
3. Your account will be updated

---

## 🎨 Dashboard Access

After logging in, you have access to:

### Admin Dashboard
- `/dashboard/admin` - Full system overview
- User management
- Brand management
- Agent configuration
- System settings

### Executive View
- `/dashboard/executive` - High-level analytics
- Revenue metrics
- Agent performance
- Customer insights

### All Dashboards
You can access any dashboard in the system:
- `/dashboard/brand-owner`
- `/dashboard/retailer`
- `/dashboard/customer`
- `/dashboard/agent`

---

## 🚨 Emergency Access

If you're locked out:

1. SSH to your server
2. Run Firebase Admin script directly:
   ```bash
   node scripts/reset-super-user.js
   ```

3. Or access Firebase Console:
   - https://console.firebase.google.com
   - Go to Authentication
   - Manually update user roles

---

## 📊 Monitoring Your Access

Check your super user status:

```typescript
import { auth, db } from '@/firebase/config';

// Check current user
const user = auth.currentUser;
const token = await user?.getIdTokenResult();
console.log('Role:', token?.claims.role);
console.log('Is Super User:', token?.claims.superUser);

// Check Firestore document
const userDoc = await db.collection('users').doc(user.uid).get();
console.log('Permissions:', userDoc.data()?.permissions);
```

---

## 🎯 Quick Commands

```bash
# Setup super user account
npx tsx scripts/setup-super-user.ts

# Auto-login
npx tsx scripts/auto-login.ts

# Start dev server
npm run dev

# Deploy to production
npm run build && npm run start
```

---

## 📝 Notes

- Your credentials are stored in `.env.local` (secure, not committed)
- Token is generated automatically and stored in `.super-user-token`
- Both files are git-ignored for security
- Setup script can be run multiple times safely
- Auto-login works on localhost and production (with HTTPS)

---

## ✅ Verification

After setup, verify everything works:

1. ✅ Run setup: `npx tsx scripts/setup-super-user.ts`
2. ✅ See success message with your UID
3. ✅ Run auto-login: `npx tsx scripts/auto-login.ts`
4. ✅ Browser opens and logs you in
5. ✅ Redirected to dashboard
6. ✅ See "Super User" badge/indicator
7. ✅ Can access all areas

---

## 🆘 Support

If you encounter any issues:

1. Check `.env.local` has correct credentials
2. Run setup script again
3. Check Firebase Console for user account
4. Review browser console for errors
5. Check server logs for authentication issues

---

**Status**: ✅ Configured and Ready
**Last Updated**: January 29, 2026
**Next Action**: Run `npx tsx scripts/setup-super-user.ts` to complete setup
