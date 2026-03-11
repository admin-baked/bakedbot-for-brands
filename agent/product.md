# Prime Context — Dispensary OS Focus

## North Star
Build BakedBot so dispensaries can launch and operate a **headless menu + AI budtender** faster than any competitor.

## Product Priorities
1. **Primary:** Unified menu operations (live POS sync, trusted product counts, menu publishing confidence).
2. **Secondary:** Agent and playbook execution reliability (especially competitive intelligence and recurring automations).
3. **Foundation:** Shared analytics and goals that stay fresh, explainable, and tied to real operational data.

## Architecture Review Lens
When auditing or changing dispensary surfaces, optimize for:
- One canonical data path for products/orders/customers.
- One canonical trigger/schedule system for playbooks.
- One canonical analytics layer reused across pages.
- UI organization that follows operator workflows, not internal implementation silos.

## Immediate Known Issues to Validate
- Competitive Intelligence playbook behavior/scheduling.
- Brand Guide save reliability.
- Goals suggestion caching and weekly refresh policy.
- Goals/analytics data quality against live Alleaves data.
- Menu live product correctness and product count reconciliation.
- Products page consistency with menu and analytics.
- Consolidating Carousels/Heroes/Bundles around menu preview/publish flow.

## Working Principle
Prefer extending existing canonical modules over creating parallel logic paths.
