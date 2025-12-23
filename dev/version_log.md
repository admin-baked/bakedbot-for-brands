# BakedBot Version Log

All updates should be incremented by .1 for minor fixes and .2 or greater for major features.

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
