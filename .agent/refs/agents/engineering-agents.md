# Engineering Agents Reference

Use this file when the task touches an engineering-owned subsystem.

## Shared Rules

- All engineering agents inherit from `.agent/prime.md`.
- Cross-domain changes follow `.agent/engineering-agents/CROSS_AGENT_PROTOCOL.md`.
- Before editing unfamiliar code, read the agent's `IDENTITY.md`, `memory/architecture.md`, and `memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix=...)`, `search_symbols`, `get_file_outline`, then `get_symbol`.

## Roster

| Agent | Domain | Auto-load Path | Source of Truth |
|-------|--------|----------------|-----------------|
| Inbox Mike | Inbox system, agent-runner, artifacts, thread routing, PuffChat | `src/app/dashboard/inbox/` | `.agent/engineering-agents/inbox-mike/` |
| Onboarding Jen | Brand guide wizard, settings, org setup, slugs | `src/app/dashboard/settings/` | `.agent/engineering-agents/onboarding-jen/` |
| Sync Sam | Alleaves POS sync, segments, spending index, data pipeline | `src/server/services/alleaves/` | `.agent/engineering-agents/sync-sam/` |
| Creative Larry | Creative Studio, FLUX.1, image generation, templates | `src/app/dashboard/creative/` | `.agent/engineering-agents/creative-larry/` |
| Brand Pages Willie | Public brand pages, ISR, proxy, age gate | `src/app/[brand]/` | `.agent/engineering-agents/brand-pages-willie/` |
| Menu Maya | Menu command center, products, COGS, reordering | `src/app/dashboard/menu/` | `.agent/engineering-agents/menu-maya/` |
| Campaign Carlos | Campaign wizard, Craig tooling, dispatch, Deebo gate | `src/app/dashboard/campaigns/` | `.agent/engineering-agents/campaign-carlos/` |
| Loyalty Luis | Loyalty dashboard, points engine, tier logic | `src/app/dashboard/loyalty/` | `.agent/engineering-agents/loyalty-luis/` |
| Intel Ivan | Competitive intelligence, Ezal, market reporting | `src/app/dashboard/intelligence/` | `.agent/engineering-agents/intel-ivan/` |
| Platform Pat | Crons, heartbeat, secrets, Firebase App Hosting | `src/app/api/cron/` | `.agent/engineering-agents/platform-pat/` |
| Security Soren | Security hardening, RBAC, prompt guards, secret hygiene | `src/server/security/` | `.agent/engineering-agents/security-soren/` |
| Playbook Pablo | Playbook templates, trigger editor, execution cron | `src/app/dashboard/playbooks/` | `.agent/engineering-agents/playbook-pablo/` |
| Drive Dana | Drive UI, viewer/editor, AI actions, inbox bridge | `src/app/dashboard/drive/` | `.agent/engineering-agents/drive-dana/` |
| Delivery Dante | Delivery dashboard, driver app, ETA, NY OCM flow | `src/app/dashboard/delivery/` | `.agent/engineering-agents/delivery-dante/` |
| Boardroom Bob | CEO dashboard, executive agents, QA, morning briefing | `src/app/dashboard/ceo/` | `.agent/engineering-agents/boardroom-bob/` |

## Inbox Mike

- Domain: Inbox system, agent-runner, artifacts, thread routing, PuffChat.
- Read next: `.agent/engineering-agents/inbox-mike/IDENTITY.md`, `.agent/engineering-agents/inbox-mike/memory/architecture.md`, `.agent/engineering-agents/inbox-mike/memory/patterns.md`, `.agent/engineering-agents/inbox-mike/memory/dependencies.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/inbox")`, `search_symbols(query="agent runner")`, `search_text(query="SKIP_ROUTING_PERSONAS")`.

## Onboarding Jen

- Domain: Brand guide wizard, settings pages, org profile setup, brand extraction, slug management.
- Read next: `.agent/engineering-agents/onboarding-jen/IDENTITY.md`, `.agent/engineering-agents/onboarding-jen/memory/architecture.md`, `.agent/engineering-agents/onboarding-jen/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/settings")`, `search_symbols(query="OrgProfile")`, `search_text(query="slug")`.

## Sync Sam

- Domain: Alleaves sync, product catalog, customer segments, spending index, cron-fed data pipelines.
- Read next: `.agent/engineering-agents/sync-sam/IDENTITY.md`, `.agent/engineering-agents/sync-sam/memory/architecture.md`, `.agent/engineering-agents/sync-sam/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/server/services/alleaves")`, `search_symbols(query="alleaves")`, `search_text(query="customer_spending")`.

## Creative Larry

- Domain: Creative Studio, FLUX.1 pipeline, pre-generated brand images, campaign creative templates.
- Read next: `.agent/engineering-agents/creative-larry/IDENTITY.md`, `.agent/engineering-agents/creative-larry/memory/architecture.md`, `.agent/engineering-agents/creative-larry/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/creative")`, `search_symbols(query="creative")`, `search_text(query="flux")`.

## Brand Pages Willie

- Domain: Public brand and dispensary pages, ISR, proxy/middleware, age gate, crawler-facing routes.
- Read next: `.agent/engineering-agents/brand-pages-willie/IDENTITY.md`, `.agent/engineering-agents/brand-pages-willie/memory/architecture.md`, `.agent/engineering-agents/brand-pages-willie/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/[brand]")`, `search_symbols(query="proxy")`, `search_text(query="age gate")`.

## Menu Maya

- Domain: Menu command center, products table, COGS, drag-reorder flow, staff guide tooling.
- Read next: `.agent/engineering-agents/menu-maya/IDENTITY.md`, `.agent/engineering-agents/menu-maya/memory/architecture.md`, `.agent/engineering-agents/menu-maya/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/menu")`, `search_symbols(query="menu")`, `search_text(query="COGS")`.

## Campaign Carlos

- Domain: Campaign wizard, Craig integrations, SMS/email dispatch, Deebo compliance gate, TCPA-safe dedup.
- Read next: `.agent/engineering-agents/campaign-carlos/IDENTITY.md`, `.agent/engineering-agents/campaign-carlos/memory/architecture.md`, `.agent/engineering-agents/campaign-carlos/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/campaigns")`, `search_symbols(query="campaign")`, `search_text(query="Deebo")`.

## Loyalty Luis

- Domain: Loyalty dashboard, points engine, tier advancement, spending-index-driven customer state.
- Read next: `.agent/engineering-agents/loyalty-luis/IDENTITY.md`, `.agent/engineering-agents/loyalty-luis/memory/architecture.md`, `.agent/engineering-agents/loyalty-luis/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/loyalty")`, `search_symbols(query="loyalty")`, `search_text(query="points")`.

## Intel Ivan

- Domain: Competitive intelligence, Ezal tooling, CannMenus/Jina ingestion, recurring market reports.
- Read next: `.agent/engineering-agents/intel-ivan/IDENTITY.md`, `.agent/engineering-agents/intel-ivan/memory/architecture.md`, `.agent/engineering-agents/intel-ivan/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/intelligence")`, `search_symbols(query="competitive")`, `search_text(query="CannMenus")`.

## Platform Pat

- Domain: Cron endpoints, heartbeat, auto-escalation, Firebase App Hosting, secrets, platform operations.
- Read next: `.agent/engineering-agents/platform-pat/IDENTITY.md`, `.agent/engineering-agents/platform-pat/memory/architecture.md`, `.agent/engineering-agents/platform-pat/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/api/cron")`, `search_symbols(query="heartbeat")`, `search_text(query="CRON_SECRET")`.

## Security Soren

- Domain: Security hardening, auth/RBAC, prompt guardrails, secret hygiene, vulnerability response.
- Read next: `.agent/engineering-agents/security-soren/IDENTITY.md`, `.agent/engineering-agents/security-soren/memory/architecture.md`, `.agent/engineering-agents/security-soren/memory/patterns.md`, `.agent/engineering-agents/security-soren/golden-sets/security.json`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/server/security")`, `search_symbols(query="requireSuperUser")`, `search_text(query="RBAC")`.

## Playbook Pablo

- Domain: Playbook templates, trigger editor, assignment management, execution cron, ROI tracking.
- Read next: `.agent/engineering-agents/playbook-pablo/IDENTITY.md`, `.agent/engineering-agents/playbook-pablo/memory/architecture.md`, `.agent/engineering-agents/playbook-pablo/memory/patterns.md`, `src/app/dashboard/playbooks/CLAUDE.md`.
- Key roots: `src/app/dashboard/playbooks/`, `src/server/actions/playbooks.ts`, `src/server/actions/dispensary-playbooks.ts`, `src/app/api/cron/playbook-runner/route.ts`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/playbooks")`, `search_symbols(query="createPlaybook")`, `search_symbols(query="updatePlaybookAssignmentConfig")`, `search_symbols(query="executePlaybook")`.

## Drive Dana

- Domain: BakedBot Drive UI, file viewer/editor, AI Magic Button, Drive-to-inbox bridge.
- Read next: `.agent/engineering-agents/drive-dana/IDENTITY.md`, `.agent/engineering-agents/drive-dana/memory/architecture.md`, `.agent/engineering-agents/drive-dana/memory/patterns.md`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/drive")`, `search_symbols(query="drive")`, `search_text(query="Magic Button")`.

## Delivery Dante

- Domain: Delivery dashboard, driver app, QR check-in, ETA calculation, NY OCM compliance flow.
- Read next: `.agent/engineering-agents/delivery-dante/IDENTITY.md`, `.agent/engineering-agents/delivery-dante/memory/architecture.md`, `.agent/engineering-agents/delivery-dante/memory/patterns.md`, `.agent/engineering-agents/delivery-dante/golden-sets/delivery-behavior.json`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/delivery")`, `search_symbols(query="delivery")`, `search_text(query="driver")`.

## Boardroom Bob

- Domain: CEO boardroom, executive agent surfaces, CRM, QA, morning briefing.
- Read next: `.agent/engineering-agents/boardroom-bob/IDENTITY.md`, `.agent/engineering-agents/boardroom-bob/memory/architecture.md`, `.agent/engineering-agents/boardroom-bob/memory/patterns.md`, `.agent/engineering-agents/boardroom-bob/golden-sets/boardroom-behavior.json`.
- Start with `jcodemunch`: `get_file_tree(path_prefix="src/app/dashboard/ceo")`, `search_symbols(query="morning briefing")`, `search_text(query="QA bug")`.

