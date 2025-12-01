# Super Admin Guide

**Role**: Platform Owner / Super Admin
**Access Level**: Full platform access, all features, dev studio
**Last Updated**: December 1, 2025

---

## Quick Access (Development Mode)

### How to Login as Super Admin

**Method 1: Dev Login Button (Fastest)**

1. Navigate to any login page:
   - [http://localhost:3000/brand-login](http://localhost:3000/brand-login)
   - [http://localhost:3000/dispensary-login](http://localhost:3000/dispensary-login)
   - [http://localhost:3000/customer-login](http://localhost:3000/customer-login)

2. Look for the **"Dev Login"** button (only visible in development mode)

3. Click **"Dev Login"** dropdown

4. Select **"Platform Owner"** (owner@bakedbot.ai)

5. You'll be instantly logged in and redirected to the dashboard

**Method 2: Direct URL**

Simply navigate to:
```
http://localhost:3000/dashboard/ceo
```

If not logged in, you'll see the dev login option on the login page.

---

## Super Admin Dashboard Features

### AI Agent Embed Code Generator

**Location**: Dashboard → CEO → AI Agent Embed

**Purpose**: Generate embed codes for CannMenus customers to add AI Budtender chatbot to their websites.

**Features**:
- ✅ Chatbot-only embed (no headless menu)
- ✅ Customizable branding (colors, position, greeting)
- ✅ CannMenus customer ID integration
- ✅ Live preview
- ✅ Copy-to-clipboard functionality

**How to Generate an Embed Code**:

1. **Login as Super Admin** (see above)

2. **Navigate to AI Agent Embed tab**:
   - Dashboard → CEO → AI Agent Embed

3. **Configure the embed**:
   - **Customer Name**: e.g., "Green Valley Dispensary"
   - **CannMenus ID**: e.g., "cm_12345" (required for product integration)
   - **Chatbot Greeting**: Customize the welcome message
   - **Primary Color**: Brand color for the chatbot UI
   - **Position**: Bottom-right or bottom-left

4. **Copy the embed code**:
   - Switch to "Embed Code" tab
   - Click "Copy Code"
   - Send to CannMenus customer

5. **Preview the chatbot**:
   - Switch to "Preview" tab
   - Click "Show Preview" to see how it will look on the customer's site

**Important Notes**:
- ⚠️ **CannMenus customers only** - Embed requires a valid CannMenus ID
- ⚠️ **Chatbot only** - No product browsing UI, conversation-based only
- ⚠️ **Product data** - Chatbot pulls products from CannMenus API using the customer ID

---

## Super Admin Personas

The platform has pre-configured development personas for testing:

| Persona | Email | Role | Use Case |
|---------|-------|------|----------|
| **Platform Owner** | owner@bakedbot.ai | owner | Super admin, full access |
| Brand Owner | brand@bakedbot.ai | brand | Brand dashboard testing |
| Dispensary Owner | dispensary@bakedbot.ai | dispensary | Dispensary dashboard testing |
| Customer | customer@bakedbot.ai | customer | Customer experience testing |
| New User | onboarding@bakedbot.ai | (none) | Onboarding flow testing |

**Super Admin = Platform Owner persona**

---

## Super Admin Capabilities

### What Super Admins Can Do

1. **AI Agent Embed Management**:
   - Generate embed codes for CannMenus customers
   - Customize chatbot branding per customer
   - Preview embed functionality

2. **Data Management**:
   - Access to Data Manager tab
   - View all brands, dispensaries, customers
   - Manage platform-wide data

3. **AI Search Index**:
   - Configure AI search settings
   - Manage product indexing
   - Optimize chatbot responses

4. **Coupon Management**:
   - Create platform-wide coupons
   - Manage promotional campaigns

5. **Quick Testing**:
   - Bypass login flows with dev personas
   - Switch between roles instantly
   - Test all user experiences

### What Super Admins Cannot Do (By Design)

- ❌ Access in production (dev login disabled in production)
- ❌ Modify customer passwords (security)
- ❌ Delete production data without proper authorization

---

## Production Super Admin Access

### How It Works in Production

In production, the dev login button is **disabled** for security.

**To access Super Admin in production**:

1. **Firebase Console Method**:
   - Go to Firebase Console → Authentication
   - Manually create a user with email `owner@bakedbot.ai`
   - Set custom claims: `{ "role": "owner" }`
   - Login with the created credentials

2. **CLI Method**:
   ```bash
   # Create super admin user
   firebase auth:create \
     --email owner@bakedbot.ai \
     --password [SECURE_PASSWORD] \
     --project=studio-567050101-bc6e8

   # Set custom claims
   firebase auth:set-custom-claims owner@bakedbot.ai \
     '{"role":"owner"}' \
     --project=studio-567050101-bc6e8
   ```

3. **Login normally**:
   - Navigate to production site
   - Use brand/dispensary/customer login (owner can use any)
   - Login with `owner@bakedbot.ai` and your password

**Security Best Practices**:
- 🔐 Use a strong, unique password for production super admin
- 🔐 Enable 2FA on the Firebase account
- 🔐 Limit super admin access to trusted team members only
- 🔐 Audit super admin actions regularly

---

## Common Super Admin Tasks

### Task 1: Generate Embed Code for New CannMenus Customer

**Scenario**: Green Valley Dispensary (CannMenus ID: cm_gv123) wants to add the chatbot to their website.

**Steps**:

1. Login as super admin
2. Navigate to Dashboard → CEO → AI Agent Embed
3. Configure:
   - Customer Name: "Green Valley Dispensary"
   - CannMenus ID: "cm_gv123"
   - Primary Color: #10b981 (or their brand color)
   - Position: Bottom Right
   - Greeting: "Hi! I'm Smokey, your AI budtender. What can I help you find today?"
4. Click "Embed Code" tab
5. Click "Copy Code"
6. Send to customer via email:

   ```
   Subject: Your BakedBot AI Agent Embed Code

   Hi Green Valley Dispensary team,

   Here's your custom AI chatbot embed code. Simply paste this code into your website HTML, just before the closing </body> tag:

   [PASTE EMBED CODE HERE]

   The chatbot will automatically appear on your site and will pull products from your CannMenus catalog.

   Let me know if you need any help with installation!

   Best,
   BakedBot Team
   ```

### Task 2: Test Different User Roles

**Scenario**: Need to verify a feature works for all user types.

**Steps**:

1. Start as super admin (owner persona)
2. Test the feature as owner
3. Click "Dev Login" dropdown
4. Switch to "Brand Owner" → test as brand
5. Switch to "Dispensary Owner" → test as dispensary
6. Switch to "Customer" → test as customer
7. Switch to "New User (Onboarding)" → test onboarding flow

**Tip**: You can switch between personas without logging out - instant role switching!

### Task 3: Quick Dashboard Access

**Scenario**: Need to quickly check the dashboard without going through login flow.

**Steps**:

1. Open any page (even homepage)
2. Click "Dev Login" button (if on a login page)
3. Select "Platform Owner"
4. You're instantly at `/dashboard`

**Or**:

1. Directly navigate to `http://localhost:3000/dashboard/ceo`
2. If not logged in, click "Dev Login" → "Platform Owner"

---

## Troubleshooting

### Issue: Dev Login Button Not Visible

**Cause**: Running in production mode

**Solution**:
- Dev login only works when `NODE_ENV !== 'production'`
- In development: `npm run dev`
- In production: Use Firebase Console to create owner account (see "Production Super Admin Access" above)

### Issue: "Unauthorized" After Login

**Cause**: User role not set correctly

**Solution**:
```bash
# Verify user's custom claims
firebase auth:get owner@bakedbot.ai --project=studio-567050101-bc6e8

# Set role if missing
firebase auth:set-custom-claims owner@bakedbot.ai \
  '{"role":"owner"}' \
  --project=studio-567050101-bc6e8
```

### Issue: Dashboard Shows "Access Denied"

**Cause**: Middleware blocking non-owner roles from CEO dashboard

**Solution**:
- Verify you're logged in as "Platform Owner" (owner@bakedbot.ai)
- Check Firebase custom claims include `"role": "owner"`
- Clear browser cookies and re-login

### Issue: Embed Code Generator Not Working

**Cause**: Missing fields or JavaScript error

**Solution**:
- Ensure Customer Name and CannMenus ID are filled in
- Check browser console for errors
- Verify Textarea component is imported correctly

---

## Security Notes

### Development Mode

In development (`NODE_ENV !== 'production'`):
- ✅ Dev login button is visible
- ✅ Instant login with pre-configured personas
- ✅ No password required
- ⚠️ **Never use in production!**

### Production Mode

In production (`NODE_ENV === 'production'`):
- ❌ Dev login button is hidden
- ✅ Standard authentication required
- ✅ Password + 2FA recommended
- ✅ Custom claims verified server-side

**Why This Design?**

This prevents unauthorized super admin access in production while making development and testing fast and convenient.

---

## Quick Reference

### Super Admin Login (Dev)

```
1. Go to any login page
2. Click "Dev Login"
3. Select "Platform Owner"
4. Done!
```

### Generate Embed Code

```
1. Dashboard → CEO → AI Agent Embed
2. Configure (name, ID, color, position)
3. Copy embed code
4. Send to customer
```

### Switch User Roles

```
1. Click "Dev Login" (any login page)
2. Select new persona
3. Instant role switch
```

---

## Additional Resources

### Code References

- **Dev Personas**: [src/lib/dev-personas.ts](../src/lib/dev-personas.ts)
- **Dev Login Button**: [src/components/dev-login-button.tsx](../src/components/dev-login-button.tsx)
- **CEO Dashboard**: [src/app/dashboard/ceo/page.tsx](../src/app/dashboard/ceo/page.tsx)
- **Embed Generator**: [src/app/dashboard/ceo/components/ai-agent-embed-tab.tsx](../src/app/dashboard/ceo/components/ai-agent-embed-tab.tsx)

### Related Documentation

- [Firebase App Hosting Setup](../FIREBASE_APP_HOSTING_SETUP.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Development Workflow](../README.md)

---

**Need Help?**

- Check the troubleshooting section above
- Review code references for implementation details
- Contact the dev team for production super admin setup

---

**Last Updated**: December 1, 2025
**Status**: Ready for Use
**Environment**: Development (production setup documented above)
