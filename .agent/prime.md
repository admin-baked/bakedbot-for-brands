# BakedBot AI Builder Agent - Prime Context

**Loaded automatically on agent startup**

---

## 🎯 Codebase Context

You are working on **BakedBot AI**, a multi-agent cannabis commerce platform.

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Backend | Firebase (Firestore, Auth, App Hosting) |
| AI Core | Google Genkit, Gemini 2.5/3 |
| Testing | Jest + Playwright |
| Styling | Tailwind CSS, ShadCN UI |

### Key Abilities (New)
| Capability | Implementation |
|------------|----------------|
| **Task Decomposition** | `TaskManager` (Camel-style Evolve/Decompose) |
| **Multimodal Inputs** | Native Genkit (`agent-runner.ts` handles PDF/Images) |
| **Knowledge Base** | Vector RAG (Firestore `findNearest`) |
| **Deep Research** | Owl Sidecar (`research.deep` tool) |

---

## 📋 Critical Protocols

### Before ANY Code Changes:
```bash
git pull origin main --rebase
```

### The 4-Step Exploration Sequence:
1. **Directory Tree** - `list_dir` on relevant directories
2. **Related Files** - `find_by_name`, `grep_search` for patterns
3. **Deep Read** - `view_file` each relevant file (NEVER assume)
4. **Pattern Summary** - Document patterns before implementing

### Fix → Test → Ship Loop:
1. Make change
2. Run test (`npm test -- <file>.test.ts`)
3. If fail → analyze + retry (max 3x)
4. If pass → update backlog + commit

---

## 🎛️ Orchestrator Mode

For complex multi-step tasks, read `.agent/orchestrator.md` for:
- Task prioritization logic
- Workflow chain execution
- Agent coordination protocols

### Available Workflows (`.agent/workflows/`)
| Workflow | Trigger | Description |
|----------|---------|-------------|
| `fix-test.yaml` | Test failing | Diagnose → Fix → Validate |
| `review.yaml` | Pre-commit | Types → Tests → Commit |
| `deploy.yaml` | Main updated | Build → Stage → Prod |

---

## 🛠️ Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Fix Test | `/fix <task_id>` | Auto-diagnose and fix failing test |
| Review | `/review` | Validate all changes before commit |
| Type Check | `/types` | Run `npm run check:types` |
| Deploy | `/deploy` | Execute deployment workflow |
| Optimize | `/optimize` | Improve workflows based on metrics |
| Generate Skill | `/generate-skill` | Create new skill from gap |
| Manage Backlog | `/backlog` | Prioritize and manage tasks |

---

## 🚀 Deployment

**This project uses Firebase App Hosting**, which deploys automatically via **git push**, NOT `firebase deploy`.

### How to Deploy:
```bash
git push origin main
```

### What `firebase deploy` Does (Limited):
- Deploys Firestore security rules
- Deploys legacy Cloud Functions (if any)
- Does **NOT** deploy the Next.js application

### What `git push` Does (Full Deploy):
- Triggers Firebase App Hosting rollout
- Builds the Next.js app in Google Cloud Build
- Deploys to production CDN
- Takes ~5-10 minutes

### Monitor Deployment:
- [Firebase Console → App Hosting](https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting)
- Production URL: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app`


## 🤖 Autonomous Mode

Check `.agent/protocols/autonomous-mode.md` for:
- Autonomy levels (0-4)
- Trust score calculation
- Human oversight triggers
- Kill switch

**Current Level**: Check `metrics.json` → `autonomy.level`

| Purpose | Path |
|---------|------|
| Task Backlog | `dev/backlog.json` |
| Test Commands | `dev/test_matrix.json` |
| Progress Log | `dev/progress_log.md` |
| Swarm Rules | `dev/SWARM_RULES.md` |
| Session State | `.agent/state/session.json` |
| Communication | `.agent/state/communication.json` |
| Metrics | `.agent/learning/metrics.json` |

---

## 🔄 Session State

Check `.agent/state/session.json` for:
- Current task being worked on
- Tests that have been run
- Validation status

Update session state after each significant action.

---

## ✅ Pre-Commit Checklist

Before EVERY commit:
- [ ] `npm run check:types` passes
- [ ] Added unit tests
- [ ] Affected tests pass
- [ ] Updated `dev/progress_log.md`
- [ ] Updated `dev/backlog.json` status
- [ ] Conventional commit message

---

## 🚫 Never Do

- Skip Exploration Sequence
- Commit without running tests
- Assume file contents
- Leave `console.log` in production code
- Mark task "passing" without running test

---

## 6. Super User Protocol
- **Absolute Access**: The Super User (Owner) MUST have access to EVERYTHING. No features, tools, intelligence levels, or UI elements should ever be locked or hidden for the Super User.
- **Projects**: Projects are a core feature built around the knowledge base and must be accessible to the Super User.

---

## 7. National Rollout Strategy
- **Objective**: Mass release of SEO-friendly Location and Brand pages into new markets (National Discovery Layer).
- **Mechanism**: Pages are generated to gain search traffic. Owners discover their pages and "Claim" them.
- **Super User Exemption**: Super Users do NOT need a "Claim Pack" or subscription. They have unrestricted access to manage, debug, and oversee this infrastructure.


