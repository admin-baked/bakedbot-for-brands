# BakedBot for Brands - Testing Session
**Date:** November 28, 2025
**Environment:** Local Development (http://localhost:3001)
**Testing Focus:** Login flows, authentication, and all user role experiences

---

## Test Plan Overview

### Authentication Entry Points
1. **Homepage** - `/` → Marketing landing page
2. **Brand Login** - `/brand-login` → Email/password + Google OAuth
3. **Customer Login** - `/customer-login` → Email/password + Google OAuth
4. **Dispensary Login** - `/dispensary-login` → Email/password + Google OAuth
5. **Onboarding** - `/onboarding` → Multi-step role selection and setup
6. **Account Page** - `/account` → Customer portal (requires auth)
7. **Dashboard** - `/dashboard` → Brand/Dispensary operator portal (requires auth)

### User Roles
- **Brand** - Product manufacturers managing their catalog
- **Dispensary** - Retail locations managing inventory
- **Customer** - End users shopping for products
- **Owner** - Super admin with full access

### Test Scenarios

#### 1. Homepage & Navigation
- [  ] Homepage loads without errors
- [  ] Logo displays correctly (local asset)
- [  ] Navigation links work
- [  ] "Brand Login" button redirects correctly
- [  ] "Get Started" button redirects to onboarding
- [  ] All hero images load (no WordPress 404s)

#### 2. Brand Login Flow
- [  ] Page loads at `/brand-login`
- [  ] Email/password form renders
- [  ] Google Sign-In button works
- [  ] Dev Login button visible in development
- [  ] Sign Up toggle works
- [  ] Email validation
- [  ] Password requirements
- [  ] Successful login redirects to dashboard
- [  ] New user redirects to onboarding
- [  ] Session creation works (`/api/auth/session`)
- [  ] Custom claims checked correctly
- [  ] Wrong role redirects appropriately

#### 3. Customer Login Flow
- [  ] Page loads at `/customer-login`
- [  ] Email/password form renders
- [  ] Google Sign-In button works
- [  ] Dev Login button visible in development
- [  ] Sign Up toggle works
- [  ] Successful login redirects to `/account`
- [  ] New user redirects to onboarding
- [  ] Session creation works
- [  ] Custom claims checked correctly

#### 4. Dispensary Login Flow
- [  ] Page loads at `/dispensary-login`
- [  ] Email/password form renders
- [  ] Google Sign-In button works
- [  ] Dev Login button visible in development
- [  ] Successful login redirects to dashboard
- [  ] New user redirects to onboarding

#### 5. Onboarding Flow
**Step 1: Role Selection**
- [  ] Four role options display
- [  ] "A Brand" button works
- [  ] "A Dispensary" button works
- [  ] "A Customer" button works
- [  ] "Just Exploring" button works

**Step 2: Brand/Dispensary Search**
- [  ] Search input renders
- [  ] CannMenus API search works
- [  ] Results display correctly
- [  ] Entity selection works
- [  ] "Add manually" link works

**Step 3: Manual Entry**
- [  ] Manual form fields render
- [  ] Brand fields: name, product, dispensary
- [  ] Dispensary fields: name
- [  ] Back to search works
- [  ] Continue button works

**Step 4: Review**
- [  ] Selected data displays
- [  ] Hidden form fields populated
- [  ] Submit button works
- [  ] Server action completes
- [  ] Redirects to dashboard on success
- [  ] User claims set correctly

#### 6. Dashboard (Brand/Dispensary)
- [  ] Dashboard loads for brand role
- [  ] Dashboard loads for dispensary role
- [  ] Dashboard loads for owner role
- [  ] Navigation sidebar renders
- [  ] Agent cards display
- [  ] Analytics widgets load
- [  ] Products page accessible
- [  ] Orders page accessible
- [  ] Settings page accessible

#### 7. Customer Account
- [  ] Account page loads for customer role
- [  ] Order history displays
- [  ] Profile information shows
- [  ] Preferences editable

#### 8. Menu Browsing
- [  ] Public menu loads at `/menu/[brandId]`
- [  ] Products display with images
- [  ] Category filters work
- [  ] Search functionality works
- [  ] Add to cart works
- [  ] Smokey chatbot loads
- [  ] Chatbot interaction works

#### 9. Checkout Flow
- [  ] Cart review page
- [  ] Customer information form
- [  ] Dispensary selection
- [  ] Payment processing
- [  ] Order confirmation
- [  ] Email sent via SendGrid

#### 10. Protected Routes
- [  ] `/dashboard` requires authentication
- [  ] `/account` requires authentication
- [  ] Unauthenticated users redirect to login
- [  ] Role-based access enforced

---

## Issues Found

### Critical Issues
_(To be filled during testing)_

### Medium Priority Issues
_(To be filled during testing)_

### Low Priority Issues
_(To be filled during testing)_

### Nice to Have Improvements
_(To be filled during testing)_

---

## Testing Notes

### Dev Login Feature
- Available in development mode only
- Provides instant authentication without email/password
- Should test both regular auth AND dev login
- Verify dev login is hidden in production

### Firebase Configuration
- Service account key configured in Secret Manager
- Local development uses `sa.b64` file
- Auth state managed via Firebase client SDK
- Sessions stored via `/api/auth/session` endpoint

### Known Limitations
- WordPress images replaced with local assets
- CannMenus API requires valid API key
- Email sending requires SendGrid configuration
- Payment processing uses Authorize.Net sandbox

---

## Test Execution Log
_(Live notes during testing will be added below)_

### Test Run 1: Initial Exploration
**Tester:** Claude Code
**Time:** Starting...

