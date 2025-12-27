# BakedBot Version Log

All updates should be incremented by .1 for minor fixes and .2 or greater for major features.

## [1.6.0] - 2025-12-27
### Added
- **Agent Playground (Homepage)**: Interactive AI demo in hero section as lead magnet
  - Tabbed interface: Smokey, Craig, Pops, Ezal
  - Rate limiting: 5 free demos/day per IP
  - Result gating: 3 shown, 10 locked behind email
  - Lead capture modal with Mailjet welcome email
  - Media rules: Images free, video requires login
  - 15 unit tests covering demo flow

- **Natural Language Playbook Creation**: AI-powered playbook generation from natural language
  - Detection patterns in agent-runner for "create a playbook that..."
  - `parseNaturalLanguage` function for AI conversion
  - Integration with existing playbook CRUD

- **Editable Playbooks System**: n8n/Zapier-style playbook editing
  - Ownership model with `ownerId`, `ownerName`, `isCustom`
  - Smart approval detection for customer-facing emails
  - Visual step builder UI (`playbook-editor.tsx`)
  - Create from scratch, template, or AI modes

- **Enhanced Craig Responses**: Smart content creation detection
  - Multi-variation outputs (Professional, Casual, Educational)
  - Hashtags, posting times, compliance notes

### Fixed
- Build error: Made `detectApprovalRequired` async for Turbopack compatibility
- Type errors in playbook editor, default playbooks, craig agent

## [1.5.5] - 2025-12-23
### Added
- **Knowledge Base Training System**: Multi-tier knowledge base with Firestore Vector Search support
  - System-level KB for Super Admin global agent training (new "Knowledge" tab in HQ)
  - Plan-based usage limits (Free: 5 docs, Claim Pro: 50, Starter+: 500+)
  - Multiple input methods: copy/paste, URL scrape (Google Drive pending)
- **Centralized Version Display**: Created `src/lib/version.ts` with `APP_VERSION_DISPLAY` for consistent footer versioning

### Changed
- Extended `KnowledgeBaseOwnerType` to support `system | brand | dispensary | customer`
- Added `isSuperUser()` helper to auth module

## [1.5.4] - 2025-12-23
### Fixed
- **Build Blockage**: Fixed `TS2614` type error in `AgentInterface` by correcting `FootTrafficTab` import from named to default.

## [1.5.3] - 2025-12-23
### Fixed
- **Asset Accessibility**: Corrected Google Cloud Storage URLs for "Verify Access" spinner GIF from internal `storage.cloud.google.com` to public `storage.googleapis.com`.
- **Unit Testing**: Added `tests/components/ui/spinner.test.tsx` to verify spinner asset loading and size classes.

## [1.5.2] - 2025-12-23
### Added
- **Command Center Dashboard**: New default view for Brands featuring `SetupHealth`, `QuickStartCards`, and `TaskFeed` alongside modular widgets.
- **Classic Fallback**: Dashboard view toggle to switch between "Command Center" and "Classic" (modular-only) views.
- **SuperAdmin HQ Refactor**: Tabbed interface for Super Admins in `AgentInterface`, including:
    - **HQ Chat**: Full-screen agent interaction.
    - **Accounts**: Account & Organization Deletion system (AccountManagementTab).
    - **Foot Traffic**: SEO Page management (FootTrafficTab).
- **Owner Support**: `QuickStartCards` now visible and functional for users with the `owner` role.

### Fixed
- **Hydration (React #418)**: Fixed mismatch in `AgentChat` by using `useHasMounted` hook to delay rendering until client-side hydration.
- **Playbooks Serialization**: Fixed "Failed to load playbooks" error by ensuring Firestore `Timestamp` objects are converted to `Date` objects in the `listBrandPlaybooks` server action.
- **SuperAdmin HQ Layout**: Fixed fullscreen layout issues in the agent workspace.

## [1.5.1] - 2025-12-23
### Added
- Implemented versioning system (v1.5.1).
- Version display in footer.
- Comprehensive unit tests for deletion system and dashboard widgets.
- Increased build memory to 8GB.

### Fixed
- TypeScript build errors in deletion actions.
- Branded loading animations (Spinner GIF).
- Duplicate pricing section in `page.tsx`.
