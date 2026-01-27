/**
 * Inbox Components Index
 *
 * Re-exports all inbox-related components for easier imports.
 */

export { UnifiedInbox } from './unified-inbox';
export { InboxSidebar } from './inbox-sidebar';
export { InboxConversation } from './inbox-conversation';
export { InboxArtifactPanel } from './inbox-artifact-panel';
export { InboxEmptyState } from './inbox-empty-state';

// New modernized components
export { InboxTaskFeed, AGENT_PULSE_CONFIG } from './inbox-task-feed';
export { ArtifactPipelineBar, ArtifactPipelineCompact } from './artifact-pipeline-bar';
export { InboxCTABanner, InboxCTAInline } from './inbox-cta-banner';

// Artifact Cards
export { InboxCarouselCard } from './artifacts/carousel-card';
export { InboxBundleCard } from './artifacts/bundle-card';
export { InboxCreativeCard } from './artifacts/creative-card';
