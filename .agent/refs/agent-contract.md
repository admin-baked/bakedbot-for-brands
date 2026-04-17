# BakedBot Agent Contract

`src/config/agent-contract.ts` is the canonical machine-readable source of truth for
agent identity, domains, supported roles, visibility, and maturity.

`src/lib/agents/registry.ts` derives its non-visual metadata from that contract and
adds only UI-specific fields like icons, metrics, images, and hrefs.

## Visibility

- `squad`: listed in the standard business-facing squad surfaces
- `internal`: intentionally visible only in internal or super-user experiences
- `hidden`: canonical agent that is not listed in standard UI catalogs

## Field Agents

| ID | Display Name | Title | Domains | Access | Visibility | Maturity |
|----|--------------|-------|---------|--------|------------|----------|
| `smokey` | Smokey | AI Budtender & Headless Menu | `commerce` | `brand`, `dispensary`, `owner`, `admin`, `customer`, `concierge` | `squad` | `active` |
| `craig` | Craig | Email & SMS Hustler | `marketing` | `brand`, `dispensary`, `owner`, `admin`, `editor` | `squad` | `active` |
| `pops` | Pops | Analytics & Forecasting | `analytics` | `brand`, `dispensary`, `owner`, `admin`, `super_admin` | `squad` | `active` |
| `ezal` | Ezal | Competitive Monitoring | `competitive_intel` | `brand`, `dispensary`, `owner`, `admin` | `squad` | `active` |
| `money_mike` | Money Mike | Pricing & Margin Brain | `pricing` | `brand`, `dispensary`, `owner`, `admin` | `squad` | `active` |
| `mrs_parker` | Mrs. Parker | Customer Success | `loyalty` | `brand`, `dispensary`, `owner`, `admin` | `squad` | `active` |
| `deebo` | Deebo | Regulation OS | `compliance` | `brand`, `dispensary`, `owner`, `admin`, `editor`, `super_admin` | `squad` | `active` |
| `day_day` | Day Day | SEO & Growth Manager | `growth` | `brand`, `dispensary`, `owner`, `admin` | `squad` | `active` |

## System Agents

| ID | Display Name | Title | Domains | Access | Visibility | Maturity | Notes |
|----|--------------|-------|---------|--------|------------|----------|-------|
| `puff` | Puff | System Agent | `system` | `super_admin` | `internal` | `active` | Canonical system orchestration agent, intentionally excluded from the standard business squad. |
| `general` | Assistant | General Assistant | `system` | `brand`, `dispensary`, `owner`, `admin`, `super_admin`, `customer`, `editor`, `concierge` | `hidden` | `active` | Canonical fallback assistant that is not listed in the standard squad surfaces. |

## Executive Agents

| ID | Display Name | Title | Domains | Access | Visibility | Maturity |
|----|--------------|-------|---------|--------|------------|----------|
| `marty` | Marty Benjamins | CEO - Growth, Strategy & Company Operations | `operations`, `revenue` | `super_admin` | `internal` | `active` |
| `leo` | Leo | COO - Operations Chief | `operations` | `super_admin` | `internal` | `active` |
| `jack` | Jack | CRO - Revenue Chief | `revenue` | `super_admin` | `internal` | `active` |
| `linus` | Linus | CTO - Technical Chief | `technology` | `super_admin` | `internal` | `active` |
| `glenda` | Glenda | CMO - Marketing Chief | `marketing` | `super_admin` | `internal` | `active` |
| `mike_exec` | Mike | CFO - Finance Chief | `pricing` | `super_admin` | `internal` | `active` |
| `roach` | Roach | Research Librarian | `research` | `super_admin` | `internal` | `active` |
| `felisha` | Felisha | Meetings & Operations | `operations` | `super_admin` | `internal` | `active` |
| `uncle_elroy` | Uncle Elroy | Adversarial Data Auditor | `analytics` | `super_admin` | `internal` | `active` |
| `openclaw` | OpenClaw | WhatsApp & Task Automation | `operations` | `super_admin` | `internal` | `active` |

## Notes

- `money_mike` and `mike_exec` are intentionally distinct agents:
  `money_mike` is the field pricing agent for customer-org work, while `mike_exec`
  is the super-user CFO persona for company-level finance.
- `general` remains canonical even though it is hidden from standard squad views.
- `marty`, `felisha`, `uncle_elroy`, `openclaw`, and other executive agents stay
  represented in the contract even when the business-facing UI does not list them.

## Maintenance Rule

When agent identity or access metadata changes, update `src/config/agent-contract.ts`
first, then refresh this mirror document if the human-readable summary needs to change.
