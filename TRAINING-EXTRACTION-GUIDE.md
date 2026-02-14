# Training Program Extraction Guide

Extract BakedBot Training Program to separate Firebase App Hosting backend to reduce main app build size.

## 📊 Overview

**Current State**:
- Main app: 201 pages (OOM during builds)
- Training: 6 pages bundled in main app

**Target State**:
- Main app: 195 pages (3% smaller)
- Training app: 6 pages (separate Firebase backend at training.bakedbot.ai)

**Benefits**:
- ✅ FREE (Firebase App Hosting is in beta)
- ✅ Reduces main app build size
- ✅ Training builds in <5 minutes (vs 33+ min main app)
- ✅ Shares Firestore, Auth, Storage (no data duplication)
- ✅ $0 additional cost

---

## 🚀 Quick Start (15 Minutes)

### Prerequisites
- GitHub CLI (`gh`) installed
- Firebase CLI (`firebase`) installed
- Admin access to Firebase project `studio-567050101-bc6e8`

### Step 1: Extract Training App (5 min)

```bash
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands"

# Make script executable
chmod +x scripts/extract-training-app.sh

# Run extraction
bash scripts/extract-training-app.sh
```

This creates a new Next.js app at `../bakedbot-training` with all training pages and dependencies.

### Step 2: Create GitHub Repo (2 min)

```bash
cd ../bakedbot-training

# Create private GitHub repository
gh repo create admin-baked/bakedbot-training --private --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

### Step 3: Connect to Firebase (3 min)

1. Go to [Firebase Console](https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting)
2. Click **"Add backend"**
3. Choose **"GitHub"**
4. Select repository: `admin-baked/bakedbot-training`
5. Branch: `main`
6. Click **"Finish"**

Firebase will automatically:
- Detect `apphosting.yaml`
- Build the app
- Deploy to a temp URL (e.g., `bakedbot-training--xyz.web.app`)

### Step 4: Setup Custom Domain (3 min)

1. In Firebase Console → App Hosting → Your new backend
2. Click **"Settings"** → **"Custom Domain"**
3. Add domain: `training.bakedbot.ai`
4. Copy the Firebase IP address
5. Add DNS A record in your DNS provider:
   - Type: A
   - Name: training
   - Value: [Firebase IP from step 4]

### Step 5: Remove from Main App (2 min)

```bash
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands"

# Make script executable
chmod +x scripts/remove-training-from-main.sh

# Run removal
bash scripts/remove-training-from-main.sh

# Commit and push
git add -A
git commit -m "refactor: Extract training to separate Firebase backend (195 pages)"
git push origin main
```

---

## 🔐 Authentication Setup

Both apps share Firebase Auth - no extra configuration needed!

**How it works**:
1. User logs in on main app (bakedbot.ai)
2. Firebase Auth creates session
3. User visits training.bakedbot.ai
4. Firebase SDK reads same session
5. User is authenticated ✅

**Authorized Domains** (add in Firebase Console if not present):
- bakedbot.ai
- training.bakedbot.ai
- localhost

---

## 📂 What Gets Extracted

### Pages (6 total)
```
app/training/
├── page.tsx                    # Main training dashboard
├── admin/
│   └── page.tsx               # Admin dashboard
├── challenge/
│   └── [id]/page.tsx          # Challenge detail
└── submissions/
    └── [id]/page.tsx          # Submission detail
```

### Components
```
components/
├── ui/                        # ShadCN components (copied)
└── training/                  # Training-specific (if exists)
```

### Shared Code
```
types/training.ts              # TypeScript types
firebase/                      # Firebase config
server/auth/                   # Auth helpers
lib/utils.ts                   # Utilities
```

---

## 💰 Cost Analysis

| Resource | Main App | Training App | Cost |
|----------|----------|--------------|------|
| Firebase Hosting | Free (beta) | Free (beta) | **$0** |
| Firestore | Shared | Shared | Same |
| Auth | Shared | Shared | Same |
| Storage | Shared | Shared | Same |

**Total additional cost**: **$0/month**

---

## 🧪 Testing

### Test Training App Locally

```bash
cd ../bakedbot-training
npm run dev
```

Visit: http://localhost:3000/training

### Test Main App Redirect

```bash
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
npm run dev
```

Visit: http://localhost:3000/dashboard/training
Should redirect to training.bakedbot.ai

---

## 🔄 Deployment Flow

### Training App
```
Push to GitHub → Firebase App Hosting builds → Deploy to training.bakedbot.ai
```

### Main App
```
Push to GitHub → Firebase App Hosting builds → Deploy to bakedbot.ai
```

Both deploy independently!

---

## 📊 Build Metrics

### Before Extraction
- Main app: 201 pages
- Build time: 33+ minutes → OOM (exit code 137)
- Memory: >64GB required

### After Extraction
- Main app: 195 pages (3% smaller)
- Build time: **TBD** (should improve)
- Memory: Reduced by ~3-5GB

- Training app: 6 pages
- Build time: <5 minutes ✅
- Memory: <4GB ✅

---

## 🐛 Troubleshooting

### Build Fails: "Module not found"
**Cause**: Missing shared dependency
**Fix**: Copy missing file from main app to training app

### Auth Doesn't Work
**Cause**: Domain not authorized
**Fix**: Add `training.bakedbot.ai` to Firebase Console → Auth → Settings → Authorized Domains

### Redirect Not Working
**Cause**: next.config.js syntax error
**Fix**: Check redirect syntax in `next.config.js`, ensure proper JSON format

### Training App Shows 404
**Cause**: Routes may need adjustment
**Fix**: Training pages should be at `/training` not `/dashboard/training`

---

## 🎯 Success Criteria

✅ Training app deploys successfully
✅ Custom domain (training.bakedbot.ai) works
✅ Users can log in and access training
✅ Main app redirect works
✅ Main app build completes without OOM

---

## 📝 Rollback Plan

If something goes wrong:

```bash
# Main app - restore training pages
git revert HEAD
git push origin main

# Training app - delete backend
# Firebase Console → App Hosting → Delete backend
```

---

## 🎓 For AI Engineers

This extraction is **AI-engineer friendly**:

1. **Run scripts** - No manual file copying
2. **Automated setup** - Scripts handle all configuration
3. **Clear errors** - Scripts validate each step
4. **Easy rollback** - Git revert if needed

**Prompt to run**:
```
"Run the training extraction scripts in order:
1. bash scripts/extract-training-app.sh
2. Create GitHub repo
3. Connect to Firebase
4. bash scripts/remove-training-from-main.sh"
```

---

## 📚 Additional Resources

- [Firebase App Hosting Docs](https://firebase.google.com/docs/app-hosting)
- [Next.js Standalone Output](https://nextjs.org/docs/pages/api-reference/next-config-js/output)
- [Firebase Auth Domains](https://firebase.google.com/docs/auth/web/redirect-best-practices)

---

**Questions?** Check the scripts for inline comments or ask in #engineering Slack channel.
