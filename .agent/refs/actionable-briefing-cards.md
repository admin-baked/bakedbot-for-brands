# Actionable Briefing Cards — Full Catalog (30+ Cards)

> Master reference for all briefing card types, their generators, approval flows,
> playbook configuration, and recommended cron schedules.

---

## How the System Works

```
Generator (cron) → InsightCard + InboxArtifact (with ActionableRecommendation)
  → Dashboard: card in briefing strip + artifact detail panel with Approve/Decline
  → Slack: Uncle Elroy posts to org channel with Block Kit Approve/Decline buttons
  → On Approve: artifact-executor routes to external system (POS, SMS, email, etc.)
  → On Decline: reason captured, agent learns, alternative surfaced next day
  → Audit: tenants/{orgId}/artifact_decisions tracks every decision
```

---

## Card Catalog

### REVENUE & PRICING INTELLIGENCE

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 1 | **COMPETITOR PRICE MATCH** | Ezal | Daily | Yes | `applyPriceMatch()` → Alleaves discount | `competitor_price_match` — Daily 9 AM |
| 2 | **FLASH SALE** | Money Mike | Daily | Yes | Create 20% off discount on 10 slowest SKUs → Alleaves | `flash_sale_slow_movers` — Daily 8 AM |
| 3 | **DAILY REVENUE PULSE** | Money Mike | Daily | No | Informational — compares yesterday vs 7-day avg | `daily_revenue_pulse` — Daily 7 AM |
| 4 | **HAPPY HOUR** | Money Mike | Weekly (Mon) | Yes | Schedule time-slot discount for slowest 2-hour window → Alleaves | `happy_hour_optimizer` — Weekly Mon 8 AM |
| 5 | **PRICE ELASTICITY SIGNAL** | Money Mike | Weekly | No | Shows demand response to recent price changes — informs future pricing | `price_elasticity_report` — Weekly Mon |
| 6 | **MARGIN OPTIMIZER** | Money Mike | Weekly | Yes | Recommend +$1-2 price increase on inelastic SKUs → Alleaves | `margin_optimizer` — Weekly Tue |
| 7 | **VENDOR PRICE CREEP** | Money Mike | Weekly | No (alert) | Flags wholesale cost trending up — "Renegotiate or find alt vendor" | `vendor_cost_monitor` — Weekly Mon |
| 8 | **BASKET BUILDER** | Money Mike | Daily | Yes | Create POS bundle from frequently co-purchased products → Alleaves | `basket_upsell` — Daily 8:30 AM |

### CUSTOMER INTELLIGENCE

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 9 | **WIN-BACK CAMPAIGN** | Smokey → Craig | Daily | Yes | Send SMS/email with $5 coupon to at-risk customers → Blackleaf + Alleaves | `winback_campaign` — Daily 9 AM |
| 10 | **FIRST VISIT FOLLOW-UP** | Smokey → Craig | Daily | Yes | Send "Thanks for visiting!" SMS 24h after first check-in → Blackleaf | `first_visit_followup` — Daily 10 AM |
| 11 | **BIRTHDAY OFFER** | Smokey | Daily | Yes | Send personalized birthday deal SMS + create POS discount → Blackleaf + Alleaves | `birthday_offers` — Daily 8 AM |
| 12 | **LOYALTY TIER CLIFF** | Smokey | Daily | Yes | Send "You're 1 purchase away from Gold!" nudge SMS → Blackleaf | `loyalty_tier_nudge` — Daily 9 AM |
| 13 | **RETENTION WAVE** | Smokey | Weekly | Yes | Cohort approaching 30-day churn window — proactive outreach campaign | `retention_wave_alert` — Weekly Mon |
| 14 | **CROSS-SELL SIGNAL** | Smokey | Weekly | Yes | "Flower buyers trying edibles" — create cross-category bundle → Alleaves | `cross_sell_bundles` — Weekly Wed |
| 15 | **REFERRAL PROGRAM SPARK** | Smokey | Weekly | No (alert) | Referral activity detected but no reward program — "Set up referrals" | — |
| 16 | **SMS OPT-IN SURGE** | Craig | Daily | Yes | Unusual opt-in spike — send welcome offer to new subscribers → Blackleaf | `sms_welcome_surge` — Event-triggered |

### INVENTORY & OPERATIONS

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 17 | **RESTOCK PREDICTOR** | Money Mike | Daily | No (alert) | "Blue Dream sells out in ~3 days" — vendor email draft + reorder nudge | `restock_predictor` — Daily 7 AM |
| 18 | **DEAD STOCK WRITE-OFF** | Money Mike | Weekly | Yes | Deep discount (50%+ off) or BOGO on zero-velocity items → Alleaves | `dead_stock_clearance` — Weekly Fri |
| 19 | **EXPIRING SOON PROMO** | Money Mike → Craig | Daily | Yes | Clearance promo + SMS blast for expiring items → Alleaves + Blackleaf | `expiring_stock_promo` — Daily 8 AM |
| 20 | **SEASONAL PREP** | Ezal + Money Mike | Monthly | No (alert) | "Last April edibles spiked 35% — stock up now" | `seasonal_forecast` — Monthly 1st |
| 21 | **CATEGORY IMBALANCE** | Money Mike | Monthly | No (alert) | "Flower = 80% sales but 40% shelf space — optimize display" | — |
| 22 | **STAFF LEADERBOARD** | Pops | Weekly | No | Budtender performance — check-ins, upsells, avg basket size, ratings | `staff_performance` — Weekly Mon |
| 23 | **PEAK HOUR MISMATCH** | Pops | Weekly | Yes | "Promos run at 4 PM peak; dead zone is 10-11 AM" — reschedule promo | `promo_timing_optimizer` — Weekly Mon |

### COMPETITIVE & MARKET INTELLIGENCE

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 24 | **NEW COMPETITOR ALERT** | Ezal | On event | No (alert) | New dispensary opened nearby — initial profile + pricing snapshot | — |
| 25 | **COMPETITOR MENU CHANGE** | Ezal | Daily | No | "Green Leaf added 12 new edibles this week" — category shift detected | `competitor_menu_monitor` — Daily |
| 26 | **CATEGORY GAP (Exclusivity)** | Ezal | Weekly | No | "You're the only source for live rosin within 10 miles — premium pricing?" | `category_exclusivity` — Weekly |
| 27 | **LOCAL EVENT BOOST** | Ezal | Daily | Yes | Nearby event (concert, game, graduation) — create event-day promo → Alleaves | `local_event_promo` — Daily |
| 28 | **WEATHER PROMO** | Ezal | Daily | Yes | Rainy day detected → push delivery promo + "Stay in, we deliver" SMS → Blackleaf | `weather_triggered_promo` — Daily 7 AM |
| 29 | **GOOGLE REVIEW TREND** | Mrs. Parker | Daily | Yes | Rating dropped — draft reply to negative reviews → Google Places API | `review_management` — Daily 9 AM |

### COMPLIANCE & RISK

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 30 | **COMPLIANCE DEADLINE** | Deebo | Daily | No (task) | License/cert renewal approaching — create checklist with due dates | `compliance_calendar` — Daily |
| 31 | **THC LIMIT WATCH** | Deebo | Weekly | No (alert) | Products approaching state THC limits — verify lab results | — |
| 32 | **PACKAGING COMPLIANCE** | Deebo | Monthly | No (alert) | New packaging rules → flag SKUs needing label updates | — |

### MARKETING & GROWTH

| # | Card | Agent | Frequency | Approval? | Action on Approve | Playbook? |
|---|------|-------|-----------|-----------|-------------------|-----------|
| 33 | **MENU FRESHNESS** | Craig | Weekly | Yes | Menu photos/descriptions stale — queue for refresh + Craig drafts copy | `menu_content_refresh` — Weekly Wed |
| 34 | **EMAIL OPEN RATE DIP** | Craig | Weekly | No (alert) | Campaign open rates dropped — subject line A/B test recommended | — |
| 35 | **SOCIAL MEDIA PULSE** | Craig | Weekly | No | Instagram/social mention volume + sentiment summary | `social_listening` — Weekly Mon |

---

## Recommended Playbook Bundles

### Starter Bundle (Free Plan — activate immediately for all pilots)
- `daily_revenue_pulse` — Daily 7 AM
- `restock_predictor` — Daily 7 AM  
- `compliance_calendar` — Daily check

### Growth Bundle (Standard Plan)
- Everything in Starter +
- `competitor_price_match` — Daily 9 AM
- `flash_sale_slow_movers` — Daily 8 AM
- `winback_campaign` — Daily 9 AM
- `first_visit_followup` — Daily 10 AM
- `birthday_offers` — Daily 8 AM
- `google_review_trend` — Daily 9 AM

### Pro Bundle (Professional Plan)
- Everything in Growth +
- `weather_triggered_promo` — Daily 7 AM
- `local_event_promo` — Daily check
- `loyalty_tier_nudge` — Daily 9 AM
- `basket_upsell` — Daily 8:30 AM
- `retention_wave_alert` — Weekly Mon
- `cross_sell_bundles` — Weekly Wed
- `margin_optimizer` — Weekly Tue
- `dead_stock_clearance` — Weekly Fri
- `staff_performance` — Weekly Mon
- `menu_content_refresh` — Weekly Wed

---

## Playbook Config Schema

Each playbook is stored in `tenants/{orgId}/playbooks/{playbookId}`:

```typescript
{
  id: 'competitor_price_match',
  orgId: 'org_thrive_syracuse',
  enabled: true,
  name: 'Competitor Price Match',
  description: 'Beat competitor prices by $1 on high-traffic products',
  cronExpression: '0 9 * * *',       // Daily 9 AM
  cronTimezone: 'America/New_York',
  frequency: 'daily',
  primaryAgent: 'ezal',
  supportingAgents: ['money_mike'],
  config: {
    competitors: ['diamond_tree', 'rise_cannabis'],
    threshold: 5,           // Alert when gap > $5
    beatMargin: 1,          // Beat by $1
    categories: ['flower', 'vape', 'edible'],
    marginFloor: 0.25,      // Never go below 25% margin
    maxDiscountsPerDay: 5,
  },
  requiresApproval: true,
  slackChannel: '#thrive-syracuse-pilot',
  approvalRoles: ['owner', 'manager'],
  createdAt: ...,
  updatedAt: ...,
  createdBy: 'system',
}
```

---

## Cron Architecture

One generic cron handles all orgs:

```
POST /api/cron/daily-briefing
Body: { orgId?: string }   // If omitted, runs for ALL active orgs

1. Load active playbooks for org(s)
2. For each playbook due to run:
   a. Execute generator (produces InsightCard + InboxArtifact)
   b. If artifact has ActionableRecommendation:
      - Save to inbox_artifacts
      - Add to briefing batch
3. Build Slack briefing from all artifacts
4. Post to org's Slack channel with Approve/Decline buttons
5. Update playbook.lastRunAt
```
