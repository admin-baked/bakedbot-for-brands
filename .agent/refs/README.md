# Agent Reference Files

Detailed documentation for AI agents working in this codebase.

**Rule:** Load refs on-demand. Don't load everything at once — conserve context.

---

## Quick Lookup: What to Read

| If You're Working On... | Read This First |
|-------------------------|-----------------|
| Agent logic (any agent) | `agents.md` |
| Ground truth, Smokey grounding | `ground-truth.md` |
| Memory/Letta integration | `bakedbot-intelligence.md` |
| Browser automation/RTRVR | `autonomous-browsing.md` |
| Auth, login, sessions | `authentication.md` |
| Roles, permissions, RBAC | `roles.md` |
| **Team management, org switching, multi-org** | **`super-users.md`** |
| **Firebase secrets, App Hosting config** | **`firebase-secrets.md`** |
| **Lead magnets, CEO Dashboard, analytics** | **`lead-magnets.md`** |
| **NY OCM delivery system, driver management** | **`delivery-system.md`** |
| **Slack integration, user mentions** | **`.agent/prime.md` (Phase 4 section)** |
| **Firebase build monitoring, deployment alerts** | **`.agent/prime.md` (Build Monitor section)** |
| Academy, email automation, scoring | `academy.md` |
| Super User dashboard, BakedBot Drive | `super-users.md` |
| API routes | `api.md` |
| Server actions, services | `backend.md` |
| React components, UI | `frontend.md` |
| Tests, Jest, coverage | `testing.md` |
| External APIs (Blackleaf, etc.) | `integrations.md` |
| Playbooks, automation | `workflows.md` |
| Media generation, cost tracking | `media-generation.md` |
| Vibe Builder, domains, publishing | `vibe-builder-spec.md` |
| Past decisions | `work-archive.md` |

---

## Full Index

### Core Systems
| File | What's Inside |
|------|---------------|
| `agents.md` | All agents, their tools, architecture, Pulse/Interrupt model |
| `backend.md` | Services, server actions, Firestore, custom domains |
| `api.md` | API routes, patterns, authentication |
| `frontend.md` | Components, layouts, ShadCN, menu embeds |

### Intelligence & Memory
| File | What's Inside |
|------|---------------|
| `ground-truth.md` | **v1.0** - QA grounding, recommendation strategies, Smokey |
| `bakedbot-intelligence.md` | Letta memory service, Hive Mind, shared blocks |
| `bakedbot-discovery.md` | Web search, Firecrawl scraping |
| `autonomous-browsing.md` | RTRVR browser automation, session management |
| `context-os.md` | Decision lineage tracking |
| `intuition-os.md` | System 1/2 routing, confidence scoring |
| `intention-os.md` | Intent parsing, task decomposition |

### Auth & Permissions
| File | What's Inside |
|------|---------------|
| `authentication.md` | Firebase Auth, session management, login flow |
| `roles.md` | Role hierarchy, permissions, RBAC |
| `super-users.md` | Super User protocol, owner access |

### Features & Pages
| File | What's Inside |
|------|---------------|
| `demo-page.md` | Homepage demo chat implementation |
| `onboarding.md` | Claim flow, brand/dispensary setup |
| `pages-brand.md` | Brand dashboard structure |
| `pages-dispensary.md` | Dispensary console structure |
| `pages-location.md` | Location/discovery pages |
| `pilot-setup.md` | Quick provisioning for pilots |
| `delivery-system.md` | **NY OCM-compliant cannabis delivery** - checkout, driver mgmt, GPS tracking, ID verification, analytics |
| `vibe-builder-spec.md` | Vibe Builder visual editor, templates, publishing, domains |

### Lead Generation
| File | What's Inside |
|------|---------------|
| `lead-magnets.md` | **INTEGRATION ARCHITECTURE** - Unified lead system (Academy, Vibe, Training), CEO Dashboard, Firestore collections, scoring |
| `academy.md` | Cannabis Marketing AI Academy - curriculum, email automation, video tracking, analytics dashboard |
| (see prime.md) | Vibe Studio lead magnet documentation |

### Development
| File | What's Inside |
|------|---------------|
| `agentic-coding.md` | Best practices for agents coding in this repo |
| `testing.md` | Jest patterns, test strategies, coverage |
| `tools.md` | Genkit tool definitions, executors |
| `workflows.md` | Playbooks, automation recipes |
| `media-generation.md` | AI image/video generation, cost tracking, playbook templates |

### Operations & Monitoring
| File | What's Inside |
|------|---------------|
| `firebase-secrets.md` | **Firebase App Hosting secret management** - IAM bindings, version pinning, debugging checklist |
| `prime.md` (Phase 4) | **Slack user mention resolution** - agent context enrichment from @mentions |
| `prime.md` (Build Monitor) | **Firebase build monitoring** - 24/7 failure detection, Linus agent diagnostics, Cloud Scheduler integration |
| `work-archive.md` | Historical decisions, artifact storage |
| `session-handoff.md` | Continuing work mid-session |
| `integrations.md` | External APIs (Blackleaf, Mailjet, CannMenus, etc.) |

---

## Loading Strategy

### Always Start With
1. `CLAUDE.md` (auto-loaded)
2. `.agent/prime.md` (read at session start)

### Load On Demand
Only load specific refs when you're about to work in that area.

### Don't Load
- Multiple refs at once (wastes context)
- Refs for areas you won't touch this session
- Everything "just in case"

---

## Keeping Refs Updated

After significant changes to a subsystem:
1. Update the relevant ref file
2. Include: current state, key files, patterns
3. Note any breaking changes or migrations
4. Cross-reference related docs
