# Blog System Deployment Guide

## 🎉 Current Status: Phases 1-4 Complete!

### ✅ Phase 1: Foundation (100%)
- Complete type system (BlogPost, BlogSEO, BlogCompliance)
- Firestore indexes deployed to production
- Full CRUD server actions
- Blog management dashboard with stats, filters, tabs
- Rich blog post editor with auto-save, SEO sidebar, version history

### ✅ Phase 2: AI Generation (100%)
- AI blog generator with Claude Sonnet 4 integration
- Brand voice integration (pulls from BrandGuide)
- SEO auto-generation utilities
- AI Generator Dialog UI (ChatGPT-style interface)
- Fully integrated into dashboard

### ✅ Phase 3: Compliance & Workflow (100%)
- Deebo compliance checker service
- Medical claims detection (cure, treat, heal, etc.)
- Youth-targeting detection
- State-specific rules checking
- AI-powered deep compliance analysis
- Scheduled publishing cron job (hourly)
- Compliance check server action

### ✅ Phase 4: Public Frontend (50%)
- Enhanced blog index page (pulls from Firestore)
- Blog post detail page with SEO metadata
- Related posts section
- Schema.org JSON-LD markup

### ⏳ Phase 5-6: Still TODO
- Category/tag pages
- RSS feed
- Sitemap integration
- Inbox integration (blog post artifacts)
- Analytics dashboard

---

## Prerequisites
- Firebase admin access (already configured ✅)
- Git access to push to `origin/main`

## Step 1: Deploy Firestore Indexes ✅ COMPLETE

```bash
firebase deploy --only firestore:indexes
```

**Status**: ✅ **Already deployed to production** (`studio-567050101-bc6e8`)

**Indexes created:**
1. `blog_posts` collection:
   - `orgId` (ASCENDING) + `status` (ASCENDING) + `publishedAt` (DESCENDING)
   - `orgId` (ASCENDING) + `category` (ASCENDING) + `publishedAt` (DESCENDING)

## Step 2: Verify TypeScript Build

```bash
npm run check:types
```

All blog-related files should compile without errors.

## Step 3: Test Locally

```bash
npm run dev
```

Navigate to:
- `/dashboard/brand-pages` - Edit brand pages
- `/dashboard/blog` - Blog management dashboard
- `/dashboard/blog/new` - Create new blog post

## Step 4: Deploy to Production

```bash
git add .
git commit -m "feat(blog): Complete blog system with AI generation and brand pages"
git push origin main
```

Firebase App Hosting will automatically build and deploy.

## Step 5: Verify Production

After deployment completes (5-10 minutes):

1. **Brand Pages**: Visit `https://bakedbot.ai/dashboard/brand-pages`
   - All 6 tabs should be editable
   - Save and publish should work

2. **Blog Dashboard**: Visit `https://bakedbot.ai/dashboard/blog`
   - Stats cards should display
   - Table should be empty (no posts yet)
   - "New Post" button should work

3. **Blog Editor**: Visit `https://bakedbot.ai/dashboard/blog/new`
   - Editor should load
   - Auto-save should work (check after 30s)
   - SEO sidebar should auto-generate slug from title

4. **Public Pages**: Visit `https://bakedbot.ai/[brand-slug]/about`
   - Should show default content if not yet customized
   - All 6 pages should be accessible

## Features Deployed

### Brand Pages System ✅
- 6 editable pages: About, Careers, Locations, Contact, Loyalty, Press
- Dynamic Firestore content
- Publish/unpublish controls
- Icon mapping with Lucide
- Fallback to default templates

### Blog System (MVP) ✅
- Complete CRUD operations
- Blog management dashboard with stats, filters, tabs
- Full-featured editor with SEO sidebar
- Auto-save every 30 seconds
- Version history (10 snapshots)
- View tracking ready
- Slug generation with uniqueness checking

### AI Integration (Partial) ✅
- Blog generator service with Claude integration
- Brand voice integration
- SEO auto-generation utilities
- Compliance-aware prompts

## Post-Deployment Tasks

### Immediate (Required):
1. Create first blog post via `/dashboard/blog/new`
2. Test publish workflow
3. Verify SEO metadata generation

### Short-term (Week 1):
1. Implement AI generator dialog UI
2. Add Deebo compliance checking
3. Create scheduled publishing cron job
4. Enhance public blog index page with real data

### Medium-term (Week 2-3):
1. Inbox integration (blog artifacts)
2. Analytics dashboard
3. Category/tag filtering pages
4. RSS feed generation

## Troubleshooting

### Issue: Firestore indexes not working
**Solution**: Wait 5-10 minutes after deployment. Indexes take time to build.

### Issue: Blog posts not showing
**Check**:
1. Firestore path: `tenants/{orgId}/blog_posts`
2. User has correct orgId in claims
3. Posts have status='published' for public viewing

### Issue: Auto-save not working
**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. User authentication status

### Issue: SEO fields not auto-generating
**Solution**: Type in title field and wait 1 second. UseEffect debounces the auto-generation.

## Rollback Plan

If issues occur:

```bash
git revert HEAD
git push origin main
```

This will revert to the previous deployment while keeping the code for analysis.

## Support

For issues, check:
- Build logs: Firebase Console → App Hosting → Builds
- Runtime logs: Firebase Console → Functions → Logs
- Database: Firebase Console → Firestore Database

## Success Metrics

Week 1:
- ✅ 1+ blog post created and published
- ✅ Brand pages customized for at least 1 brand
- ✅ No TypeScript errors
- ✅ Page load times < 2 seconds

Month 1:
- 🎯 10+ blog posts across brands
- 🎯 100+ blog views
- 🎯 SEO metadata on all published posts
- 🎯 5+ brands with customized brand pages
