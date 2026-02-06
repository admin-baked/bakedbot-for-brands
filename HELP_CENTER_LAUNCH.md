# Help Center Launch Checklist

## Phase 1: Production Launch ✅

### Pre-Launch Verification

**Infrastructure:**
- [x] 50 articles created and registered
- [x] All articles seeded to Firestore (50/50 success)
- [x] TypeScript compilation clean (no errors)
- [x] Dynamic routes configured ([category]/[slug])
- [x] Server Actions implemented (CRUD, search, ratings)
- [x] Custom MDX components working (Callout, Tabs, etc.)

**Content:**
- [x] All articles have metadata (title, description, tags)
- [x] Role-based access configured (public vs. authenticated)
- [x] Internal cross-linking complete
- [x] SEO metadata included
- [x] Compliance-checked content

**Components:**
- [x] Article rating widget (thumbs up/down)
- [x] Related articles component
- [x] Help sidebar navigation
- [x] Search interface (basic)
- [x] Contextual help buttons

### Launch Steps

**1. Commit Changes**
```bash
git add .
git commit -m "feat(help): Complete help center - 50 articles, full infrastructure

- 50 comprehensive help articles (Getting Started, Products, Agents, Marketing, Dispensary, Integrations, Analytics, Troubleshooting)
- Dynamic MDX rendering with custom components
- Firestore integration for analytics and ratings
- Role-based access control
- Article search, ratings, and related articles
- Mobile-responsive design
- SEO-optimized

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**2. Deploy to Production**
```bash
git push origin main
```

This triggers Firebase App Hosting auto-deployment.

**3. Verify Deployment**

Wait 2-3 minutes for deployment, then check:

**Test URLs:**
- https://app.bakedbot.ai/help (help home)
- https://app.bakedbot.ai/help/getting-started/welcome
- https://app.bakedbot.ai/help/agents/smokey
- https://app.bakedbot.ai/help/marketing/campaigns

**Check:**
- [ ] Help home page loads
- [ ] Article pages render correctly
- [ ] Images/diagrams display
- [ ] Search works
- [ ] Rating widget functional
- [ ] Related articles show
- [ ] Mobile responsive
- [ ] No console errors

**4. Test Key Workflows**

**New User Flow:**
```
1. Visit /help
2. Search "how to add products"
3. Click result → Article loads
4. Rate article (thumbs up/down)
5. Click related article
6. All working? ✅
```

**Brand Admin Flow:**
```
1. Login as brand admin
2. Visit /help
3. See authenticated articles (Marketing, Analytics)
4. Click contextual help from Products page
5. Opens help article in new tab
6. All working? ✅
```

**5. Enable for Pilot Customer (Thrive Syracuse)**

**Settings → Organizations → Thrive Syracuse**
```
☑ Enable help center access
☑ Show contextual help buttons
☑ Include in onboarding emails

[Save Settings]
```

**Send announcement email:**
```
Subject: New: BakedBot Help Center Now Live!

Hi Thrive Syracuse team,

We're excited to announce our new Help Center is now live!

Access it: Dashboard → Help (top nav) or app.bakedbot.ai/help

Features:
• 50 comprehensive guides covering all features
• Search functionality
• Video tutorials (coming soon)
• Rate articles to help us improve

Top articles to get started:
• Getting Started Guide
• Adding Products
• Creating Campaigns
• AI Agent Overview

Questions? The help center has answers, or contact us anytime.

Cheers,
BakedBot Team
```

**6. Monitor Initial Metrics**

**Dashboard → Analytics → Help Center**

Track for first week:
- Total page views
- Most viewed articles
- Search queries (what users are looking for)
- Article ratings (which articles are helpful)
- Support ticket reduction

**Expected Week 1:**
- 50-100 help center visits
- 3-5 articles per user
- 70%+ positive rating rate
- 20-30% reduction in support tickets

### Post-Launch

**Day 1-3:**
- Monitor error logs for issues
- Respond to user feedback quickly
- Fix any broken links or rendering issues

**Week 1:**
- Review analytics (most viewed articles)
- Identify content gaps (search queries with no results)
- Collect user ratings and feedback
- Optimize top 10 most-viewed articles

**Week 2-4:**
- Add requested articles based on feedback
- Record video tutorials for top 5 articles
- Improve low-rated articles
- Add more screenshots/diagrams

---

## Phase 2: Enhanced Search & Testing (Next)

### Enhanced Search Component

**Features to build:**

**1. Advanced Search Interface**
```
Search Help Center
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Search box with autocomplete]

Filters:
☐ Category: [All ▼]
  - Getting Started
  - Products
  - AI Agents
  - Marketing
  - Analytics
  - Dispensary
  - Integrations
  - Troubleshooting

☐ Difficulty: [All ▼]
  - Beginner
  - Intermediate
  - Advanced

☐ Tags: [Select multiple]
  #onboarding #products #campaigns

Sort: [Relevance ▼]
  - Relevance
  - Most Recent
  - Most Viewed
  - Highest Rated

Results: 12 articles
[Article cards with previews]
```

**2. Search Autocomplete**
```
User types: "how to add prod"

Suggestions:
→ How to add products
→ Adding products from CSV
→ Product descriptions
→ Product optimization
```

**3. Search Analytics**
```
Track:
- Search queries (what users search for)
- Click-through rate (search → article)
- No-results queries (gaps in content)
- Refinement rate (users refine search)
```

### Testing Checklist

**Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Device Testing:**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Functionality Testing:**
- [ ] Search works on all pages
- [ ] Filters update results
- [ ] Sort changes order
- [ ] Rating persists after refresh
- [ ] Related articles relevant
- [ ] Navigation sidebar functional
- [ ] Links all work (internal + external)
- [ ] Images load correctly
- [ ] Code blocks render with syntax highlighting

**Performance Testing:**
- [ ] Lighthouse score: 90+ (Performance)
- [ ] Lighthouse score: 95+ (Accessibility)
- [ ] Lighthouse score: 100 (Best Practices)
- [ ] Lighthouse score: 100 (SEO)
- [ ] Page load < 2 seconds
- [ ] Search results < 500ms

**Accessibility Testing:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast WCAG AA
- [ ] Alt text on images
- [ ] Semantic HTML structure

### Interactive Product Tours

**Using Shepherd.js:**

**Tour 1: Help Center Overview**
```javascript
const helpCenterTour = new Shepherd.Tour({
  steps: [
    {
      text: 'Welcome to the Help Center! Let me show you around.',
      attachTo: { element: '.help-header', on: 'bottom' }
    },
    {
      text: 'Search for answers quickly using the search bar.',
      attachTo: { element: '.search-input', on: 'bottom' }
    },
    {
      text: 'Browse articles by category in the sidebar.',
      attachTo: { element: '.help-sidebar', on: 'right' }
    },
    {
      text: 'Rate articles to help us improve!',
      attachTo: { element: '.article-rating', on: 'top' }
    }
  ]
});
```

**Tour 2: First-Time User**
```javascript
// Trigger on first help center visit
if (isFirstVisit && !tourCompleted) {
  startHelpCenterTour();
}
```

---

## Success Metrics

### Launch Success (Week 1)
- ✅ 0 critical bugs
- ✅ 50+ unique visitors
- ✅ 70%+ positive rating rate
- ✅ 20% reduction in support tickets

### Phase 2 Success (Week 4)
- ✅ Enhanced search: 3x faster article discovery
- ✅ All tests passing (browser, device, accessibility)
- ✅ Lighthouse score: 90+ across all metrics
- ✅ Interactive tours: 60%+ completion rate

### Long-Term Success (Month 3)
- ✅ 500+ monthly visitors
- ✅ 3.5 articles per visit
- ✅ 75%+ positive rating rate
- ✅ 40% reduction in support tickets
- ✅ Top 10 help articles ranking in Google

---

## Maintenance Plan

**Weekly:**
- Review analytics (most viewed, searches)
- Update stale content (screenshots, version changes)
- Respond to low ratings (improve articles)

**Monthly:**
- Add 2-3 new articles (user requests)
- Record 1-2 video tutorials
- Update top 10 articles (keep fresh)

**Quarterly:**
- Comprehensive content audit
- Update all screenshots (UI changes)
- Add new features to help center
- A/B test article improvements

---

## Rollback Plan

**If critical issues found:**

**1. Disable help center (temporary):**
```typescript
// src/app/help/layout.tsx
if (process.env.HELP_CENTER_ENABLED === 'false') {
  return <MaintenanceMessage />;
}
```

**2. Revert deployment:**
```bash
git revert HEAD
git push origin main
```

**3. Fix issues offline:**
- Identify problem
- Fix in local branch
- Test thoroughly
- Re-deploy when fixed

---

## Contact During Launch

**Support on standby:**
- Email: support@bakedbot.ai
- Phone: (555) 123-4567
- Slack: #help-center-launch

**Monitor:**
- Error logs: Sentry/Firebase Console
- Analytics: Help center dashboard
- User feedback: Email, in-app chat

---

Ready to launch! 🚀
