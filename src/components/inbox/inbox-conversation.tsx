'use client';

/**
 * Inbox Conversation
 *
 * Chat interface adapted from PuffChat for inbox threads.
 * Handles message display, input, and artifact generation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Loader2,
    User,
    MoreHorizontal,
    Archive,
    Trash2,
    Edit2,
    Sparkles,
    Paperclip,
    FileText,
    X,
    Pin,
    Tag as TagIcon,
    FolderKanban,
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { CustomerContextCard, parseCrmCustomers } from './crm/customer-context-card';
import { SegmentSummaryCard, parseCrmSegments } from './crm/segment-summary-card';
import {
    CampaignDraftCard, CampaignPerformanceCard,
    parseCampaignDrafts, parseCampaignPerformance,
} from './campaign/campaign-inline-card';
import { GoogleIntegrationStatus, parseGoogleIntegrationStatus } from './artifacts/google-integration-status';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import type { InboxThread, InboxArtifact, InboxAgentPersona } from '@/types/inbox';
import { getThreadTypeLabel, INLINE_GENERATOR_THREAD_TYPES } from '@/types/inbox';
import { InboxCarouselCard } from './artifacts/carousel-card';
import { InboxBundleCard } from './artifacts/bundle-card';
import { InboxCreativeCard } from './artifacts/creative-card';
import { InboxIntegrationCard } from './artifacts/integration-card';
import { InboxResearchCard } from './artifacts/inbox-research-card';
import { PriceMatchCard } from './artifacts/price-match-card';
import type { ExecProactiveCheckData } from './artifacts/executive-proactive-check-artifact';
import { InboxTaskFeed } from './inbox-task-feed';
import { QRCodeGeneratorInline } from './qr-code-generator-inline';
import { CarouselGeneratorInline } from './carousel-generator-inline';
import { HeroGeneratorInline } from './hero-generator-inline';
import { BundleGeneratorInline } from './bundle-generator-inline';
import { LaunchCoordinatorInline } from './launch-coordinator-inline';
import { ImageGeneratorInline } from './image-generator-inline';
import { SocialPostGeneratorInline } from './social-post-generator-inline';
import { DynamicPricingGeneratorInline } from './dynamic-pricing-generator-inline';
import { VideoGeneratorInline } from './video-generator-inline';
import { CampaignPlannerInline } from './campaign-planner-inline';
import { PerformanceReviewInline } from './performance-review-inline';
import { OutreachGeneratorInline } from './outreach-generator-inline';
import { EventPlannerInline } from './event-planner-inline';
import { CrmCampaignInline } from './crm-campaign-inline';
import { ProductDiscoveryInline } from './product-discovery-inline';
import { WholesaleInventoryInline } from './wholesale-inventory-inline';
import { ChatMediaPreview } from '@/components/chat/chat-media-preview';
import { VmRunView } from '@/components/artifacts';
import { formatDistanceToNow } from 'date-fns';
import {
    runInboxAgentChat,
    addMessageToInboxThread,
    cancelInboxAgentJob,
    createInboxArtifact,
    updateInboxVmRunArtifact,
} from '@/server/actions/inbox';
import { generateQRCode } from '@/server/actions/qr-code';
import { toggleHeroActive } from '@/app/actions/heroes';
import { getBrandSlug } from '@/server/actions/slug-management';
import { useJobPoller } from '@/hooks/use-job-poller';
import { AttachmentPreviewList, type AttachmentItem } from '@/components/ui/attachment-preview';
import {
    createAttachmentItemFromFile,
    createPastedTextAttachment,
    shouldConvertPastedTextToAttachment,
    toAgentAttachmentPayloads,
    toChatMessageAttachment,
    validateComposerAttachmentFile,
} from '@/components/ui/chat-attachments';
import { useToast } from '@/hooks/use-toast';
import type { CreativeContent } from '@/types/creative-content';
import {
    createVmRunArtifactData,
    extractVmApprovalsFromToolCalls,
    getDefaultRuntimeBackend,
    mapThoughtsToVmRunSteps,
    mapVmRunStatusToInboxStatus,
    normalizeRoleScope,
    upsertVmRunOutput,
    type VmRunArtifactData,
    type VmRunStep,
    type VmRunStatus,
} from '@/types/agent-vm';

// ============ Pending Input Store ============
// Module-level map so other components (empty state, sidebar) can pre-populate
// the chat input before a thread is activated. Read once on mount, then cleared.
export const _pendingInputs = new Map<string, string>();

type ThinkingDisplayStep = string | VmRunStep | {
    action?: string;
    description?: string;
    detail?: string;
    title?: string;
    toolName?: string;
    tool?: string;
    name?: string;
};

function getThinkingStepLabel(step: ThinkingDisplayStep | null | undefined): string {
    if (typeof step === 'string') {
        return step;
    }

    if (!step || typeof step !== 'object') {
        return 'Working...';
    }

    const stepRecord = step as Record<string, unknown>;
    const primaryLabel = [
        stepRecord.action,
        stepRecord.description,
        stepRecord.detail,
        stepRecord.title,
        stepRecord.toolName,
        stepRecord.tool,
        stepRecord.name,
    ].find((value) => typeof value === 'string' && value.trim().length > 0);

    if (typeof primaryLabel === 'string') {
        return primaryLabel;
    }

    return 'Working...';
}

function getVmRunStatusForJob(status: string | undefined, isComplete: boolean): VmRunStatus {
    if (status === 'failed') {
        return 'failed';
    }

    if (status === 'cancelled') {
        return 'cancelled';
    }

    if (isComplete && status === 'completed') {
        return 'completed';
    }

    return 'running';
}

// ============ Agent Name Mapping ============

const AGENT_NAMES: Record<InboxAgentPersona, {
    name: string;
    avatar: string;
    color: string;
    bgColor: string;
    ringColor: string;
}> = {
    // Field Agents
    smokey: { name: 'Smokey', avatar: 'https://storage.googleapis.com/bakedbot-global-assets/avatars/smokey-mascot.png', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', ringColor: 'ring-emerald-500/50' },
    money_mike: { name: 'Money Mike', avatar: '💰', color: 'text-amber-500', bgColor: 'bg-amber-500/10', ringColor: 'ring-amber-500/50' },
    craig: { name: 'Craig', avatar: '📣', color: 'text-blue-500', bgColor: 'bg-blue-500/10', ringColor: 'ring-blue-500/50' },
    ezal: { name: 'Ezal', avatar: '🔍', color: 'text-purple-500', bgColor: 'bg-purple-500/10', ringColor: 'ring-purple-500/50' },
    deebo: { name: 'Deebo', avatar: '🛡️', color: 'text-red-500', bgColor: 'bg-red-500/10', ringColor: 'ring-red-500/50' },
    pops: { name: 'Pops', avatar: '📊', color: 'text-orange-500', bgColor: 'bg-orange-500/10', ringColor: 'ring-orange-500/50' },
    day_day: { name: 'Day Day', avatar: '📦', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', ringColor: 'ring-cyan-500/50' },
    mrs_parker: { name: 'Mrs. Parker', avatar: '💜', color: 'text-pink-500', bgColor: 'bg-pink-500/10', ringColor: 'ring-pink-500/50' },
    big_worm: { name: 'Big Worm', avatar: '🐛', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', ringColor: 'ring-indigo-500/50' },
    roach: { name: 'Roach', avatar: '📚', color: 'text-teal-500', bgColor: 'bg-teal-500/10', ringColor: 'ring-teal-500/50' },
    // Executive Agents
    leo: { name: 'Leo', avatar: '⚙️', color: 'text-slate-400', bgColor: 'bg-slate-500/10', ringColor: 'ring-slate-500/50' },
    jack: { name: 'Jack', avatar: '📈', color: 'text-violet-500', bgColor: 'bg-violet-500/10', ringColor: 'ring-violet-500/50' },
    linus: { name: 'Linus', avatar: '🖥️', color: 'text-sky-500', bgColor: 'bg-sky-500/10', ringColor: 'ring-sky-500/50' },
    glenda: { name: 'Glenda', avatar: '✨', color: 'text-rose-500', bgColor: 'bg-rose-500/10', ringColor: 'ring-rose-500/50' },
    mike: { name: 'Mike', avatar: '💵', color: 'text-lime-500', bgColor: 'bg-lime-500/10', ringColor: 'ring-lime-500/50' },
    // Auto-routing
    auto: { name: 'Assistant', avatar: '🤖', color: 'text-primary', bgColor: 'bg-primary/10', ringColor: 'ring-primary/50' },
};

// ============ Props ============

interface InboxConversationProps {
    thread: InboxThread;
    artifacts: InboxArtifact[];
    className?: string;
}

// ============ Message Component ============

function MessageBubble({
    message,
    agentPersona,
    artifacts,
    threadId,
}: {
    message: ChatMessage;
    agentPersona: InboxAgentPersona;
    artifacts: InboxArtifact[];
    threadId?: string;
}) {
    const isUser = message.type === 'user';
    const agent = AGENT_NAMES[agentPersona] || AGENT_NAMES.auto;
    const [msgFeedback, setMsgFeedback] = React.useState<'up' | 'down' | null>(null);

    const handleMsgFeedback = async (e: React.MouseEvent, rating: 'up' | 'down') => {
        e.stopPropagation();
        if (msgFeedback) return;
        setMsgFeedback(rating);
        const { submitInsightFeedback } = await import('@/server/actions/insights');
        await submitInsightFeedback(rating, {
            messageId: message.id,
            threadId,
            agentId: agentPersona,
            contentSnippet: message.content,
        });
    };
    const thinkingSteps = message.thinking?.steps ?? [];
    const recentThinkingSteps = thinkingSteps.slice(-3);
    const latestThinkingStepLabel = recentThinkingSteps.length > 0
        ? getThinkingStepLabel(recentThinkingSteps[recentThinkingSteps.length - 1])
        : null;

    // Find any artifacts associated with this message (by checking message content for artifact references)
    const messageArtifacts = artifacts.filter((a) =>
        message.content.includes(a.id) || message.artifacts?.some((ma) => ma.id === a.id)
    );

    // Parse CRM markers from agent responses
    const { customers: crmCustomers, cleanedContent: afterCustomerParse } = !isUser
        ? parseCrmCustomers(message.content)
        : { customers: [], cleanedContent: message.content };
    const { segments: crmSegments, cleanedContent: afterSegmentParse } = !isUser
        ? parseCrmSegments(afterCustomerParse)
        : { segments: [], cleanedContent: afterCustomerParse };
    // Parse campaign markers
    const { drafts: campaignDrafts, cleanedContent: afterCampaignDraftParse } = !isUser
        ? parseCampaignDrafts(afterSegmentParse)
        : { drafts: [], cleanedContent: afterSegmentParse };
    const { performances: campaignPerfs, cleanedContent: afterCampaignPerfParse } = !isUser
        ? parseCampaignPerformance(afterCampaignDraftParse)
        : { performances: [], cleanedContent: afterCampaignDraftParse };
    // Parse Google integration status markers
    const { status: googleIntegrationStatus, cleanedContent: displayContent } = !isUser
        ? parseGoogleIntegrationStatus(afterCampaignPerfParse)
        : { status: null, cleanedContent: afterCampaignPerfParse };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3 py-4', isUser && 'flex-row-reverse')}
        >
            {/* Avatar with colored ring and thinking steps tooltip */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm cursor-help',
                                'ring-2 ring-offset-2 ring-offset-background transition-all duration-200',
                                isUser
                                    ? 'bg-primary text-primary-foreground ring-primary/50'
                                    : cn(agent.bgColor, agent.ringColor)
                            )}
                        >
                            {isUser ? <User className="h-4 w-4" /> : agent.avatar.startsWith('http') ? <img src={agent.avatar} alt={agent.name} className="w-6 h-6 object-contain rounded" /> : <span className="text-base">{agent.avatar}</span>}
                        </div>
                    </TooltipTrigger>
                    {(message.thinking || message.metadata) && (
                        <TooltipContent side="left" className="max-w-md">
                            <div className="space-y-2">
                                {/* Agent & Model Info */}
                                <div className="space-y-1">
                                    <div className="font-semibold text-xs uppercase text-muted-foreground">
                                        {agent.name}
                                    </div>
                                    {(message.metadata?.model || message.metadata?.media?.model || message.metadata?.agentName) && (
                                        <div className="text-xs">
                                            <span className="text-muted-foreground">Model: </span>
                                            <code className="text-xs bg-muted px-1 rounded">
                                                {message.metadata?.model || message.metadata?.media?.model || message.metadata?.agentName || 'Unknown'}
                                            </code>
                                        </div>
                                    )}
                                </div>

                                {/* Thinking Steps */}
                                {message.thinking && (message.thinking.steps?.length > 0 || message.thinking.plan?.length > 0) && (
                                    <div className="space-y-1 border-t pt-2">
                                        <div className="font-semibold text-xs uppercase text-muted-foreground">
                                            {message.thinking.isThinking ? '🧠 Thinking...' : '✅ Processing Complete'}
                                        </div>

                                        {/* Plan Steps */}
                                        {message.thinking.plan && message.thinking.plan.length > 0 && (
                                            <div className="space-y-0.5">
                                                <div className="text-xs font-medium">Plan:</div>
                                                <ol className="text-xs space-y-0.5 list-decimal list-inside">
                                                    {message.thinking.plan.map((step, idx) => (
                                                        <li key={idx} className="text-muted-foreground">
                                                            {typeof step === 'string' ? step : JSON.stringify(step)}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}

                                        {/* Execution Steps */}
                                        {message.thinking.steps && message.thinking.steps.length > 0 && (
                                            <div className="space-y-0.5">
                                                <div className="text-xs font-medium">Execution:</div>
                                                <ol className="text-xs space-y-0.5 list-decimal list-inside">
                                                    {message.thinking.steps.map((step, idx) => (
                                                        <li key={idx} className="text-muted-foreground">
                                                            {getThinkingStepLabel(step)}
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Fallback if no thinking data */}
                                {!message.thinking && (
                                    <div className="text-xs text-muted-foreground italic">
                                        No processing details available
                                    </div>
                                )}
                            </div>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>

            {/* Content */}
            <div className={cn('flex-1 max-w-[80%]', isUser && 'text-right')}>
                {/* Header */}
                <div className={cn('flex items-center gap-2 mb-1', isUser && 'flex-row-reverse')}>
                    <span className={cn('text-sm font-medium', !isUser && agent.color)}>
                        {isUser ? 'You' : agent.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                </div>

                {/* Message Content */}
                <div
                    className={cn(
                        'rounded-lg px-4 py-3',
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                    )}
                >
                    {message.thinking?.isThinking ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{latestThinkingStepLabel || 'Thinking...'}</span>
                            </div>

                            {recentThinkingSteps.length > 0 && (
                                <div className="space-y-1.5 rounded-md border border-border/60 bg-background/50 px-3 py-2">
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Live progress
                                    </div>
                                    {recentThinkingSteps.map((step, idx) => (
                                        <div
                                            key={`${message.id}-live-step-${idx}`}
                                            className="flex items-start gap-2 text-xs text-muted-foreground"
                                        >
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
                                            <span>{getThinkingStepLabel(step)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {displayContent.trim().length > 0 && (
                                <div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {displayContent}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                            {/* Inline CRM Customer Cards */}
                            {crmCustomers.map((customer, idx) => (
                                <CustomerContextCard key={`crm-cust-${idx}`} customer={customer} />
                            ))}
                            {/* Inline CRM Segment Cards */}
                            {crmSegments.map((seg, idx) => (
                                <SegmentSummaryCard key={`crm-seg-${idx}`} data={seg} />
                            ))}
                            {/* Inline Campaign Cards */}
                            {campaignDrafts.map((draft, idx) => (
                                <CampaignDraftCard key={`camp-draft-${idx}`} data={draft} />
                            ))}
                            {campaignPerfs.map((perf, idx) => (
                                <CampaignPerformanceCard key={`camp-perf-${idx}`} data={perf} />
                            ))}
                            {/* Google Integration Status */}
                            {googleIntegrationStatus && (
                                <div className="mt-3">
                                    <GoogleIntegrationStatus data={googleIntegrationStatus} />
                                </div>
                            )}
                        </>
                    )}

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {message.attachments.map((att) => (
                                <div key={att.id} className="relative rounded-lg overflow-hidden border bg-background/50">
                                    {att.type.startsWith('image/') ? (
                                        <img
                                            src={att.url || att.preview}
                                            alt={att.name}
                                            className="w-full h-24 object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 p-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-xs truncate">{att.name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {message.metadata?.media && (
                        <div className="mt-3">
                            <ChatMediaPreview
                                type={message.metadata.media.type}
                                url={message.metadata.media.url}
                                prompt={message.metadata.media.prompt}
                                duration={message.metadata.media.duration}
                                model={message.metadata.media.model}
                            />
                        </div>
                    )}
                </div>

                {/* Inline Artifact Cards */}
                {messageArtifacts.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {messageArtifacts.map((artifact) => (
                            <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
                        ))}
                    </div>
                )}

                {/* Thumbs feedback — agent messages only, shown on hover */}
                {!isUser && !message.thinking?.isThinking && (
                    <div className={cn(
                        'mt-1 flex items-center gap-1 transition-opacity duration-150',
                        msgFeedback ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}>
                        {msgFeedback ? (
                            <span className="text-[10px] text-muted-foreground">
                                {msgFeedback === 'up' ? 'Thanks!' : 'Got it — we\'ll improve.'}
                            </span>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => handleMsgFeedback(e, 'up')}
                                    className="rounded p-0.5 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                    aria-label="Helpful"
                                >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => handleMsgFeedback(e, 'down')}
                                    className="rounded p-0.5 text-muted-foreground/60 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    aria-label="Not helpful"
                                >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============ Artifact Preview Card ============

function ArtifactPreviewCard({ artifact }: { artifact: InboxArtifact }) {
    switch (artifact.type) {
        case 'carousel':
            return <InboxCarouselCard artifact={artifact} />;
        case 'bundle':
            return <InboxBundleCard artifact={artifact} />;
        case 'creative_content':
            return <InboxCreativeCard artifact={artifact} />;
        case 'integration_request':
            return <InboxIntegrationCard artifact={artifact} />;
        case 'research_report':
            return <InboxResearchCard artifact={artifact} />;
        case 'competitor_price_match':
            return <PriceMatchCard artifact={artifact} orgId={artifact.orgId ?? ''} />;
        case 'vm_run':
            return (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <VmRunView
                        vmRun={artifact.data as VmRunArtifactData}
                        fallbackContent={artifact.rationale}
                    />
                </div>
            );
        case 'executive_proactive_check': {
            const d = artifact.data as unknown as ExecProactiveCheckData;
            return (
                <div className="p-3 rounded-lg bg-white/5 border border-white/8">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-semibold">Executive Intelligence Brief — {d.dateLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {d.executiveRecommendations.length} agent{d.executiveRecommendations.length !== 1 ? 's' : ''} reported
                        {d.meetings.length > 0 ? ` · ${d.meetings.length} meeting${d.meetings.length !== 1 ? 's' : ''}` : ''}
                        {d.emailDigest ? ` · ${d.emailDigest.unreadCount} unread` : ''}
                    </p>
                </div>
            );
        }
        default:
            return null;
    }
}

// ============ Thread Header ============

function ThreadHeader({ thread }: { thread: InboxThread }) {
    const { archiveThread, deleteThread, updateThread, togglePinThread, setActiveThread } = useInboxStore();
    const isMobile = useIsMobile();
    const agent = AGENT_NAMES[thread.primaryAgent] || AGENT_NAMES.auto;

    return (
        <div className="flex items-start justify-between gap-3 border-b border-white/5 bg-background/80 px-4 py-3.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:py-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Mobile back button */}
                {isMobile && (
                    <button
                        onClick={() => setActiveThread(null)}
                        className="shrink-0 -ml-1 mt-0.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Back to briefing"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
                {/* Agent Avatar with colored ring */}
                <div className={cn(
                    'p-2 rounded-xl ring-2 ring-offset-2 ring-offset-background',
                    agent.bgColor,
                    agent.ringColor
                )}>
                    {agent.avatar.startsWith('http') ? <img src={agent.avatar} alt={agent.name} className="w-6 h-6 object-contain rounded" /> : <span className="text-xl">{agent.avatar}</span>}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {thread.isPinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                        <h2 className="font-semibold truncate">{thread.title}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 border-white/10">
                            {getThreadTypeLabel(thread.type)}
                        </Badge>
                        <span>with <span className={agent.color}>{agent.name}</span></span>
                        {thread.projectId && (
                            <Badge variant="outline" className="h-5 px-1.5 bg-primary/10 text-primary border-primary/20">
                                <FolderKanban className="h-3 w-3 mr-1" />
                                Project
                            </Badge>
                        )}
                        {thread.status === 'draft' && (
                            <Badge variant="secondary" className="h-5 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                Has Drafts
                            </Badge>
                        )}
                        {thread.tags && thread.tags.length > 0 && (
                            <Badge variant="outline" className="h-5 px-1.5">
                                <TagIcon className="h-3 w-3 mr-1" />
                                {thread.tags.length}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 self-start shrink-0">
                {/* Pin Toggle Button */}
                <Button
                    variant={thread.isPinned ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => togglePinThread(thread.id)}
                    title={thread.isPinned ? "Unpin thread" : "Pin thread"}
                >
                    <Pin className={cn("h-4 w-4", thread.isPinned && "fill-current")} />
                </Button>

                {/* More Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {/* TODO: Edit title */ }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Title
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Manage tags */ }}>
                            <TagIcon className="h-4 w-4 mr-2" />
                            Manage Tags
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => archiveThread(thread.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => deleteThread(thread.id)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Thread
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// ============ Main Component ============

export function InboxConversation({ thread, artifacts, className }: InboxConversationProps) {
    // Lazy init: pick up any pending input set by the empty state or sidebar before
    // activating this thread, then immediately clear it from the map.
    const hasPendingAutoSubmit = useRef(false);
    const [input, setInput] = useState<string>(() => {
        const pending = _pendingInputs.get(thread.id);
        if (pending && !INLINE_GENERATOR_THREAD_TYPES.has(thread.type)) {
            _pendingInputs.delete(thread.id);
            hasPendingAutoSubmit.current = true; // auto-submit on mount
            return pending;
        }
        return '';
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [currentThinkingMessageId, setCurrentThinkingMessageId] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [showQRGenerator, setShowQRGenerator] = useState(false);
    const [showCarouselGenerator, setShowCarouselGenerator] = useState(false);
    const [showHeroGenerator, setShowHeroGenerator] = useState(false);
    const [showBundleGenerator, setShowBundleGenerator] = useState(false);
    const [showLaunchCoordinator, setShowLaunchCoordinator] = useState(false);
    const [showImageGenerator, setShowImageGenerator] = useState(false);
    const [showSocialPostGenerator, setShowSocialPostGenerator] = useState(false);
    const [showPricingGenerator, setShowPricingGenerator] = useState(false);
    const [showVideoGenerator, setShowVideoGenerator] = useState(false);
    const [showCampaignPlanner, setShowCampaignPlanner] = useState(false);
    const [showPerformanceReview, setShowPerformanceReview] = useState(false);
    const [showOutreachGenerator, setShowOutreachGenerator] = useState(false);
    const [showEventPlanner, setShowEventPlanner] = useState(false);
    const [showCrmCoordinator, setShowCrmCoordinator] = useState(false);
    const [showProductDiscovery, setShowProductDiscovery] = useState(false);
    const [showWholesaleInventory, setShowWholesaleInventory] = useState(false);

    const [carouselInitialPrompt, setCarouselInitialPrompt] = useState('');
    const [heroInitialPrompt, setHeroInitialPrompt] = useState('');
    const [bundleInitialPrompt, setBundleInitialPrompt] = useState('');
    const [launchInitialPrompt, setLaunchInitialPrompt] = useState('');
    const [imageInitialPrompt, setImageInitialPrompt] = useState('');
    const [socialPostInitialPrompt, setSocialPostInitialPrompt] = useState('');
    const [pricingInitialPrompt, setPricingInitialPrompt] = useState('');
    const [videoInitialPrompt, setVideoInitialPrompt] = useState('');
    const [campaignInitialPrompt, setCampaignInitialPrompt] = useState('');
    const [performanceInitialPrompt, setPerformanceInitialPrompt] = useState('');
    const [outreachInitialPrompt, setOutreachInitialPrompt] = useState('');
    const [eventInitialPrompt, setEventInitialPrompt] = useState('');
    const [crmInitialPrompt, setCrmInitialPrompt] = useState('');
    const [productDiscoveryInitialPrompt, setProductDiscoveryInitialPrompt] = useState('');
    const [wholesaleInventoryInitialPrompt, setWholesaleInventoryInitialPrompt] = useState('');
    const [lastCreatedHeroId, setLastCreatedHeroId] = useState<string | null>(null);
    const [lastCreatedHeroOrgId, setLastCreatedHeroOrgId] = useState<string | null>(null);
    const [currentVmArtifactId, setCurrentVmArtifactId] = useState<string | null>(null);
    const vmPersistTimeoutRef = useRef<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomAnchorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAutoShownQR = useRef<boolean>(false);
    const hasAutoShownCarousel = useRef<boolean>(false);
    const hasAutoShownHero = useRef<boolean>(false);
    const hasAutoShownBundle = useRef<boolean>(false);
    const hasAutoShownLaunch = useRef<boolean>(false);
    const hasAutoShownImage = useRef<boolean>(false);
    const hasAutoShownSocialPost = useRef<boolean>(false);
    const hasAutoShownPricing = useRef<boolean>(false);
    const hasAutoShownVideo = useRef<boolean>(false);
    const hasAutoShownCampaign = useRef<boolean>(false);
    const hasAutoShownPerformance = useRef<boolean>(false);
    const hasAutoShownOutreach = useRef<boolean>(false);
    const hasAutoShownEvent = useRef<boolean>(false);
    const hasAutoShownCrm = useRef<boolean>(false);
    const hasAutoShownProductDiscovery = useRef<boolean>(false);
    const hasAutoShownWholesaleInventory = useRef<boolean>(false);

    const {
        addMessageToThread,
        addArtifacts,
        isThreadPending,
        setSelectedArtifact,
        setArtifactPanelOpen,
        updateThread,
        updateArtifact,
        updateMessageInThread,
    } = useInboxStore();
    const isPending = isThreadPending(thread.id);
    const { toast } = useToast();
    const resetInlineGenerators = React.useCallback(() => {
        setShowQRGenerator(false);
        setShowCarouselGenerator(false);
        setShowHeroGenerator(false);
        setShowBundleGenerator(false);
        setShowLaunchCoordinator(false);
        setShowImageGenerator(false);
        setShowSocialPostGenerator(false);
        setShowPricingGenerator(false);
        setShowVideoGenerator(false);
        setShowCampaignPlanner(false);
        setShowPerformanceReview(false);
        setShowOutreachGenerator(false);
        setShowEventPlanner(false);
        setShowCrmCoordinator(false);
        setShowProductDiscovery(false);
        setShowWholesaleInventory(false);

        hasAutoShownQR.current = false;
        hasAutoShownCarousel.current = false;
        hasAutoShownHero.current = false;
        hasAutoShownBundle.current = false;
        hasAutoShownLaunch.current = false;
        hasAutoShownImage.current = false;
        hasAutoShownSocialPost.current = false;
        hasAutoShownPricing.current = false;
        hasAutoShownVideo.current = false;
        hasAutoShownCampaign.current = false;
        hasAutoShownPerformance.current = false;
        hasAutoShownOutreach.current = false;
        hasAutoShownEvent.current = false;
        hasAutoShownCrm.current = false;
        hasAutoShownProductDiscovery.current = false;
        hasAutoShownWholesaleInventory.current = false;
    }, []);

    // Use Firestore real-time job polling instead of broken HTTP polling
    const { job, thoughts, isComplete, error: jobError } = useJobPoller(currentJobId ?? undefined);
    const currentVmArtifact = currentVmArtifactId
        ? artifacts.find((artifact) => artifact.id === currentVmArtifactId)
        : undefined;
    const resumableVmArtifact = React.useMemo(() => {
        return artifacts
            .filter((artifact) => artifact.type === 'vm_run')
            .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
            .find((artifact) => {
                const vmRun = artifact.data as VmRunArtifactData;
                return !!vmRun.jobId && (vmRun.status === 'queued' || vmRun.status === 'running');
            });
    }, [artifacts]);
    const roleScope = thread.type === 'yield_analysis' || thread.type === 'wholesale_inventory' || thread.type === 'brand_outreach'
        ? 'grower'
        : normalizeRoleScope(
            thread.brandId
                ? 'brand'
                : thread.dispensaryId
                    ? 'dispensary'
                    : thread.assignedToRole || undefined
        );
    const latestThoughtLabel = thoughts.length > 0
        ? (thoughts[thoughts.length - 1].detail?.trim() || thoughts[thoughts.length - 1].title)
        : undefined;

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
        bottomAnchorRef.current?.scrollIntoView({ block: 'end', behavior });
    }, []);

    const finalizeThinkingMessage = React.useCallback((
        messageId: string | null,
        updates: Partial<ChatMessage>,
        options?: {
            syncPreview?: boolean;
        }
    ) => {
        if (!messageId) {
            return;
        }

        updateMessageInThread(thread.id, messageId, updates);
        if (options?.syncPreview && typeof updates.content === 'string') {
            updateThread(thread.id, {
                preview: updates.content.slice(0, 50),
                lastActivityAt: updates.timestamp ?? new Date(),
            });
        }
    }, [thread.id, updateMessageInThread, updateThread]);

    const buildCurrentVmRun = React.useCallback((status: VmRunStatus): VmRunArtifactData | null => {
        if (!currentJobId) return null;

        const existing = currentVmArtifact?.data as VmRunArtifactData | undefined;
        const nextSteps = thoughts.length > 0 ? mapThoughtsToVmRunSteps(thoughts, status) : (existing?.steps || []);

        return {
            ...(existing || createVmRunArtifactData({
                runId: `vm-${currentJobId}`,
                threadId: thread.id,
                jobId: currentJobId,
                agentId: thread.primaryAgent,
                roleScope,
                runtimeBackend: getDefaultRuntimeBackend(thread.primaryAgent),
                title: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} VM Run`,
                summary: 'Starting agent work...',
            })),
            status,
            steps: nextSteps,
            updatedAt: new Date().toISOString(),
            completedAt:
                status === 'completed' || status === 'failed' || status === 'cancelled'
                    ? new Date().toISOString()
                    : existing?.completedAt,
        };
    }, [currentJobId, currentVmArtifact, thoughts, thread.id, thread.primaryAgent, roleScope]);

    useEffect(() => {
        if (currentJobId) return;

        const candidateArtifact =
            currentVmArtifact?.type === 'vm_run'
            && ((currentVmArtifact.data as VmRunArtifactData).status === 'queued'
                || (currentVmArtifact.data as VmRunArtifactData).status === 'running')
                ? currentVmArtifact
                : resumableVmArtifact;
        if (!candidateArtifact || candidateArtifact.type !== 'vm_run') {
            return;
        }

        const vmRun = candidateArtifact.data as VmRunArtifactData;
        if (!vmRun.jobId || (vmRun.status !== 'queued' && vmRun.status !== 'running')) {
            return;
        }

        setCurrentVmArtifactId(candidateArtifact.id);
        setCurrentJobId(vmRun.jobId);
    }, [currentJobId, currentVmArtifact, resumableVmArtifact]);

    useEffect(() => {
        return () => {
            if (vmPersistTimeoutRef.current) {
                window.clearTimeout(vmPersistTimeoutRef.current);
                vmPersistTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        resetInlineGenerators();
    }, [thread.id, resetInlineGenerators]);

    useEffect(() => {
        if (vmPersistTimeoutRef.current) {
            window.clearTimeout(vmPersistTimeoutRef.current);
            vmPersistTimeoutRef.current = null;
        }
        setIsSubmitting(false);
        setCurrentJobId(null);
        setCurrentThinkingMessageId(null);
        setCurrentVmArtifactId(null);
    }, [thread.id]);

    useEffect(() => {
        if (!currentJobId || currentThinkingMessageId) {
            return;
        }

        const existingThinkingMessage = thread.messages.find((message) => message.thinking?.isThinking);
        if (existingThinkingMessage) {
            setCurrentThinkingMessageId(existingThinkingMessage.id);
            return;
        }

        const resumedThinkingMessage: ChatMessage = {
            id: `thinking-${thread.id}-${currentJobId}`,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: [] },
            metadata: { agentName: AGENT_NAMES[thread.primaryAgent]?.name || 'Assistant' },
        };

        addMessageToThread(thread.id, resumedThinkingMessage);
        setCurrentThinkingMessageId(resumedThinkingMessage.id);
    }, [currentJobId, currentThinkingMessageId, thread.id, thread.messages, thread.primaryAgent, addMessageToThread]);

    useEffect(() => {
        const pending = _pendingInputs.get(thread.id);
        if (!pending || !INLINE_GENERATOR_THREAD_TYPES.has(thread.type)) {
            return;
        }

        _pendingInputs.delete(thread.id);

        switch (thread.type) {
            case 'carousel':
                setCarouselInitialPrompt(pending);
                setShowCarouselGenerator(true);
                break;
            case 'hero':
                setHeroInitialPrompt(pending);
                setShowHeroGenerator(true);
                break;
            case 'bundle':
                setBundleInitialPrompt(pending);
                setShowBundleGenerator(true);
                break;
            case 'launch':
                setLaunchInitialPrompt(pending);
                setShowLaunchCoordinator(true);
                break;
            case 'launch_campaign':
                setLaunchInitialPrompt(pending);
                setShowLaunchCoordinator(true);
                break;
            case 'creative':
                setSocialPostInitialPrompt(pending);
                setShowSocialPostGenerator(true);
                break;
            case 'image':
                setImageInitialPrompt(pending);
                setShowImageGenerator(true);
                break;
            case 'inventory_promo':
                setPricingInitialPrompt(pending);
                setShowPricingGenerator(true);
                break;
            case 'video':
                setVideoInitialPrompt(pending);
                setShowVideoGenerator(true);
                break;
            case 'campaign':
                setCampaignInitialPrompt(pending);
                setShowCampaignPlanner(true);
                break;
            case 'performance':
                setPerformanceInitialPrompt(pending);
                setShowPerformanceReview(true);
                break;
            case 'outreach':
                setOutreachInitialPrompt(pending);
                setShowOutreachGenerator(true);
                break;
            case 'event':
                setEventInitialPrompt(pending);
                setShowEventPlanner(true);
                break;
            case 'crm_customer':
                setCrmInitialPrompt(pending);
                setShowCrmCoordinator(true);
                break;
            case 'product_discovery':
                setProductDiscoveryInitialPrompt(pending);
                setShowProductDiscovery(true);
                break;
            case 'wholesale_inventory':
                setWholesaleInventoryInitialPrompt(pending);
                setShowWholesaleInventory(true);
                break;
            case 'qr_code':
                setShowQRGenerator(true);
                break;
            default:
                break;
        }
    }, [thread.id, thread.type]);

    // Keep the latest reply and thought stream in view while the conversation is active.
    useEffect(() => {
        scrollToBottom(isSubmitting ? 'smooth' : 'auto');
    }, [
        thread.messages.length,
        thread.messages[thread.messages.length - 1]?.content,
        thread.messages[thread.messages.length - 1]?.thinking?.isThinking,
        thoughts.length,
        isSubmitting,
        scrollToBottom,
    ]);

    // Focus textarea and move cursor to end when thread opens with pre-populated input
    useEffect(() => {
        if (input && textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount only

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const appendAttachmentFiles = async (files: File[]) => {
        const validFiles = files.filter((file) => {
            const error = validateComposerAttachmentFile(file);
            if (!error) {
                return true;
            }

            toast({
                title: error.title,
                description: error.description,
                variant: 'destructive',
            });

            return false;
        });

        if (validFiles.length === 0) {
            return;
        }

        try {
            const nextAttachments = await Promise.all(
                validFiles.map((file) => createAttachmentItemFromFile(file))
            );
            setAttachments((prev) => [...prev, ...nextAttachments]);
        } catch (error) {
            toast({
                title: 'Attachment failed',
                description: error instanceof Error ? error.message : 'Failed to process attachment',
                variant: 'destructive',
            });
        }
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        await appendAttachmentFiles(Array.from(files));

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // Remove attachment
    const handleRemoveAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        const pastedFiles = Array.from(e.clipboardData.files || []);

        if (pastedFiles.length > 0) {
            e.preventDefault();
            await appendAttachmentFiles(pastedFiles);
            return;
        }

        if (pastedText && shouldConvertPastedTextToAttachment(pastedText)) {
            e.preventDefault();
            setAttachments((prev) => [...prev, createPastedTextAttachment(pastedText)]);
        }
    };

    // Handle job completion via Firestore real-time listener (useJobPoller)
    useEffect(() => {
        if (!currentJobId || !currentVmArtifactId) return;

        const nextStatus = getVmRunStatusForJob(job?.status, isComplete);

        const nextVmRun = buildCurrentVmRun(nextStatus);
        if (!nextVmRun) return;

        updateArtifact(currentVmArtifactId, {
            data: nextVmRun,
            status: mapVmRunStatusToInboxStatus(nextVmRun.status),
        });

        if (vmPersistTimeoutRef.current) {
            window.clearTimeout(vmPersistTimeoutRef.current);
            vmPersistTimeoutRef.current = null;
        }

        if (nextStatus === 'running') {
            vmPersistTimeoutRef.current = window.setTimeout(() => {
                void updateInboxVmRunArtifact(currentVmArtifactId, nextVmRun);
            }, 800);
        }
    }, [currentJobId, currentVmArtifactId, thoughts, isComplete, job?.status, updateArtifact, buildCurrentVmRun]);

    useEffect(() => {
        if (!currentJobId || !currentThinkingMessageId) {
            return;
        }

        const hasThoughts = thoughts.length > 0;
        const hasDraftContent = typeof job?.draftContent === 'string' && job.draftContent.trim().length > 0;
        const thinkingStatus = getVmRunStatusForJob(job?.status, isComplete);
        const isTerminal = thinkingStatus !== 'running';

        if (!hasThoughts && !hasDraftContent && !isTerminal) {
            return;
        }

        finalizeThinkingMessage(currentThinkingMessageId, {
            ...(hasDraftContent ? { content: job?.draftContent } : {}),
            thinking: {
                isThinking: !isTerminal,
                steps: hasThoughts ? mapThoughtsToVmRunSteps(thoughts, thinkingStatus) : [],
                plan: [],
            },
        });
    }, [currentJobId, currentThinkingMessageId, thoughts, job?.draftContent, job?.status, isComplete, finalizeThinkingMessage]);

    useEffect(() => {
        if (!currentJobId || !isComplete || !job) return;

        const finalizeJob = async () => {
            const terminalStatus = getVmRunStatusForJob(job.status, true);
            const terminalSteps = mapThoughtsToVmRunSteps(thoughts, terminalStatus);
            if (vmPersistTimeoutRef.current) {
                window.clearTimeout(vmPersistTimeoutRef.current);
                vmPersistTimeoutRef.current = null;
            }

            try {
                if (job.status === 'completed') {
                    const approvalRequests = extractVmApprovalsFromToolCalls(job.result?.toolCalls);
                    const vmStatus: VmRunStatus = approvalRequests.length > 0 ? 'awaiting_approval' : 'completed';
                    const completionContent = job.result?.content?.trim() || job.draftContent?.trim() || (
                        currentVmArtifactId
                            ? 'Done. I wrapped up the run and saved the output in the artifact panel.'
                            : 'Done. I finished the request.'
                    );

                    if (currentVmArtifactId) {
                        const completedVmRun = upsertVmRunOutput(
                            {
                                ...(buildCurrentVmRun(vmStatus) || createVmRunArtifactData({
                                    runId: `vm-${job.id}`,
                                    threadId: thread.id,
                                    jobId: job.id,
                                    agentId: thread.primaryAgent,
                                    roleScope,
                                    runtimeBackend: getDefaultRuntimeBackend(thread.primaryAgent),
                                    title: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} VM Run`,
                                })),
                                approvals: approvalRequests,
                                summary: approvalRequests.length > 0 ? 'Waiting for approval' : 'Completed',
                            },
                            {
                                kind: 'markdown',
                                title: 'Final Output',
                                content: completionContent,
                            },
                            vmStatus
                        );

                        updateArtifact(currentVmArtifactId, {
                            data: completedVmRun,
                            status: mapVmRunStatusToInboxStatus(completedVmRun.status),
                        });

                        try {
                            await updateInboxVmRunArtifact(currentVmArtifactId, completedVmRun);
                        } catch (error) {
                            console.error('[InboxConversation] Failed to persist completed VM artifact:', error);
                        }

                        if (approvalRequests.length > 0) {
                            setSelectedArtifact(currentVmArtifactId);
                            setArtifactPanelOpen(true);
                        }
                    }

                    const persistedMessage: ChatMessage = {
                        id: `job-${job.id}`,
                        type: 'agent',
                        content: completionContent,
                        timestamp: new Date(),
                        thinking: {
                            isThinking: false,
                            steps: terminalSteps,
                            plan: [],
                        },
                        metadata: job.result?.metadata,
                    };

                    if (currentThinkingMessageId) {
                        finalizeThinkingMessage(currentThinkingMessageId, persistedMessage, { syncPreview: true });
                    } else {
                        addMessageToThread(thread.id, persistedMessage);
                    }
                } else if (job.status === 'failed' || job.status === 'cancelled') {
                    const terminalStatus: VmRunStatus = job.status === 'cancelled' ? 'cancelled' : 'failed';

                    if (currentVmArtifactId) {
                        const failedVmRun = upsertVmRunOutput(
                            buildCurrentVmRun(terminalStatus) || createVmRunArtifactData({
                                runId: `vm-${job.id}`,
                                threadId: thread.id,
                                jobId: job.id,
                                agentId: thread.primaryAgent,
                                roleScope,
                                runtimeBackend: getDefaultRuntimeBackend(thread.primaryAgent),
                                title: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} VM Run`,
                            }),
                            {
                                kind: 'markdown',
                                title: job.status === 'cancelled' ? 'Cancelled' : 'Failure',
                                content: job.error || (job.status === 'cancelled' ? 'Cancelled by user' : 'Unknown error'),
                            },
                            terminalStatus
                        );

                        updateArtifact(currentVmArtifactId, {
                            data: failedVmRun,
                            status: mapVmRunStatusToInboxStatus(failedVmRun.status),
                        });

                        try {
                            await updateInboxVmRunArtifact(currentVmArtifactId, failedVmRun);
                        } catch (error) {
                            console.error('[InboxConversation] Failed to persist failed VM artifact:', error);
                        }
                    }

                    const terminalMessage: ChatMessage = {
                        id: job.status === 'cancelled' ? `job-cancelled-${job.id}` : `job-error-${job.id}`,
                        type: 'agent',
                        content: job.status === 'cancelled'
                            ? 'Stopped. You can send a new message whenever you are ready.'
                            : `I encountered an error: ${job.error || 'Unknown error'}. Please try again.`,
                        timestamp: new Date(),
                        thinking: {
                            isThinking: false,
                            steps: terminalSteps,
                            plan: [],
                        },
                    };

                    if (currentThinkingMessageId) {
                        finalizeThinkingMessage(currentThinkingMessageId, terminalMessage, { syncPreview: true });
                    } else {
                        addMessageToThread(thread.id, terminalMessage);
                    }

                    if (job.status === 'cancelled') {
                        try {
                            await addMessageToInboxThread(thread.id, terminalMessage);
                        } catch (error) {
                            console.error('[InboxConversation] Failed to persist cancelled assistant message:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('[InboxConversation] Failed to finalize job:', error);

                const fallbackMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    type: 'agent',
                    content: 'I finished processing, but I hit a problem while saving the final response. Please try again or refresh this thread.',
                    timestamp: new Date(),
                    thinking: {
                        isThinking: false,
                        steps: terminalSteps,
                        plan: [],
                    },
                };

                if (currentThinkingMessageId) {
                    finalizeThinkingMessage(currentThinkingMessageId, fallbackMessage, { syncPreview: true });
                } else {
                    addMessageToThread(thread.id, fallbackMessage);
                }
            } finally {
                setCurrentJobId(null);
                setCurrentVmArtifactId(null);
                setCurrentThinkingMessageId(null);
                setIsSubmitting(false);
            }
        };

        void finalizeJob();
    }, [
        currentJobId,
        currentVmArtifactId,
        currentThinkingMessageId,
        isComplete,
        job,
        thoughts,
        thread.id,
        thread.primaryAgent,
        roleScope,
        addMessageToThread,
        buildCurrentVmRun,
        finalizeThinkingMessage,
        setArtifactPanelOpen,
        setSelectedArtifact,
        updateArtifact,
    ]);

    // Handle job polling errors
    useEffect(() => {
        if (jobError && currentJobId) {
            const persistPollingError = async () => {
                console.error('[InboxConversation] Job polling error:', jobError);
                const terminalSteps = mapThoughtsToVmRunSteps(thoughts, 'failed');

                if (vmPersistTimeoutRef.current) {
                    window.clearTimeout(vmPersistTimeoutRef.current);
                    vmPersistTimeoutRef.current = null;
                }

                if (currentVmArtifactId) {
                    const failedVmRun = upsertVmRunOutput(
                        buildCurrentVmRun('failed') || createVmRunArtifactData({
                            runId: `vm-${currentJobId}`,
                            threadId: thread.id,
                            jobId: currentJobId,
                            agentId: thread.primaryAgent,
                            roleScope,
                            runtimeBackend: getDefaultRuntimeBackend(thread.primaryAgent),
                            title: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} VM Run`,
                        }),
                        {
                            kind: 'markdown',
                            title: 'Polling Error',
                            content: jobError,
                        },
                        'failed'
                    );

                    updateArtifact(currentVmArtifactId, {
                        data: failedVmRun,
                        status: mapVmRunStatusToInboxStatus(failedVmRun.status),
                    });

                    try {
                        await updateInboxVmRunArtifact(currentVmArtifactId, failedVmRun);
                    } catch (error) {
                        console.error('[InboxConversation] Failed to persist polling-error VM artifact:', error);
                    }
                }

                const errorMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    type: 'agent',
                    content: 'Sorry, I lost connection while processing your request. Please try again.',
                    timestamp: new Date(),
                    thinking: {
                        isThinking: false,
                        steps: terminalSteps,
                        plan: [],
                    },
                };

                if (currentThinkingMessageId) {
                    finalizeThinkingMessage(currentThinkingMessageId, errorMessage, { syncPreview: true });
                } else {
                    addMessageToThread(thread.id, errorMessage);
                }

                setCurrentVmArtifactId(null);
                setCurrentJobId(null);
                setCurrentThinkingMessageId(null);
                setIsSubmitting(false);
            };

            void persistPollingError();
        }
    }, [
        jobError,
        currentJobId,
        currentVmArtifactId,
        currentThinkingMessageId,
        thoughts,
        thread.id,
        thread.primaryAgent,
        roleScope,
        addMessageToThread,
        buildCurrentVmRun,
        finalizeThinkingMessage,
        updateArtifact,
    ]);

    // Auto-open QR generator for qr_code threads
    useEffect(() => {
        if (thread.type === 'qr_code') {
            if (!showQRGenerator) {
                setShowQRGenerator(true);
            }
            hasAutoShownQR.current = true;
        }
    }, [thread.type, showQRGenerator]);

    // Auto-open Carousel generator for carousel threads
    useEffect(() => {
        if (thread.type === 'carousel') {
            if (!showCarouselGenerator) {
                setShowCarouselGenerator(true);
            }
            hasAutoShownCarousel.current = true;
        }
    }, [thread.type, showCarouselGenerator]);

    // Auto-open Hero generator for hero threads
    useEffect(() => {
        if (thread.type === 'hero') {
            if (!showHeroGenerator) {
                setShowHeroGenerator(true);
            }
            hasAutoShownHero.current = true;
        }
    }, [thread.type, showHeroGenerator]);

    // Auto-open Bundle generator for bundle threads
    useEffect(() => {
        if (thread.type === 'bundle') {
            if (!showBundleGenerator) {
                setShowBundleGenerator(true);
            }
            hasAutoShownBundle.current = true;
        }
    }, [thread.type, showBundleGenerator]);

    // Auto-open Launch coordinator for launch threads
    useEffect(() => {
        if (thread.type === 'launch' || thread.type === 'launch_campaign') {
            if (!showLaunchCoordinator) {
                setShowLaunchCoordinator(true);
            }
            hasAutoShownLaunch.current = true;
        }
    }, [thread.type, showLaunchCoordinator]);

    // Auto-open Image generator for image threads
    useEffect(() => {
        if (thread.type === 'image') {
            if (!showImageGenerator) {
                setShowImageGenerator(true);
            }
            hasAutoShownImage.current = true;
        }
    }, [thread.type, showImageGenerator]);

    // Auto-open Social Post generator for creative threads
    useEffect(() => {
        if (thread.type === 'creative') {
            if (!showSocialPostGenerator) {
                setShowSocialPostGenerator(true);
            }
            hasAutoShownSocialPost.current = true;
        }
    }, [thread.type, showSocialPostGenerator]);

    // Auto-open Dynamic Pricing generator for inventory_promo threads
    useEffect(() => {
        if (thread.type === 'inventory_promo') {
            if (!showPricingGenerator) {
                setShowPricingGenerator(true);
            }
            hasAutoShownPricing.current = true;
        }
    }, [thread.type, showPricingGenerator]);

    // Auto-open Video generator for video threads
    useEffect(() => {
        if (thread.type === 'video') {
            if (!showVideoGenerator) setShowVideoGenerator(true);
            hasAutoShownVideo.current = true;
        }
    }, [thread.type, showVideoGenerator]);

    // Auto-open Campaign planner for campaign threads
    useEffect(() => {
        if (thread.type === 'campaign') {
            if (!showCampaignPlanner) setShowCampaignPlanner(true);
            hasAutoShownCampaign.current = true;
        }
    }, [thread.type, showCampaignPlanner]);

    // Auto-open Performance review for performance threads
    useEffect(() => {
        if (thread.type === 'performance') {
            if (!showPerformanceReview) setShowPerformanceReview(true);
            hasAutoShownPerformance.current = true;
        }
    }, [thread.type, showPerformanceReview]);

    // Auto-open Outreach generator for outreach threads
    useEffect(() => {
        if (thread.type === 'outreach') {
            if (!showOutreachGenerator) setShowOutreachGenerator(true);
            hasAutoShownOutreach.current = true;
        }
    }, [thread.type, showOutreachGenerator]);

    // Auto-open Event planner for event threads
    useEffect(() => {
        if (thread.type === 'event') {
            if (!showEventPlanner) setShowEventPlanner(true);
            hasAutoShownEvent.current = true;
        }
    }, [thread.type, showEventPlanner]);

    // Auto-open CRM coordinator for crm_customer threads
    useEffect(() => {
        if (thread.type === 'crm_customer') {
            if (!showCrmCoordinator) setShowCrmCoordinator(true);
            hasAutoShownCrm.current = true;
        }
    }, [thread.type, showCrmCoordinator]);

    // Auto-open Product Discovery for product_discovery threads
    useEffect(() => {
        if (thread.type === 'product_discovery') {
            if (!showProductDiscovery) setShowProductDiscovery(true);
            hasAutoShownProductDiscovery.current = true;
        }
    }, [thread.type, showProductDiscovery]);

    // Auto-open Wholesale Inventory for wholesale_inventory threads
    useEffect(() => {
        if (thread.type === 'wholesale_inventory') {
            if (!showWholesaleInventory) setShowWholesaleInventory(true);
            hasAutoShownWholesaleInventory.current = true;
        }
    }, [thread.type, showWholesaleInventory]);

    const handleSubmit = async () => {
        if ((!input.trim() && attachments.length === 0) || isSubmitting || isPending) return;

        // Detect QR code creation intent
        const lowerInput = input.toLowerCase().trim();
        const qrCodeKeywords = ['create qr', 'qr code', 'generate qr', 'make qr', 'new qr'];
        const isQRCodeRequest = qrCodeKeywords.some(keyword => lowerInput.includes(keyword));

        if (isQRCodeRequest && thread.primaryAgent === 'craig') {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setShowQRGenerator(true);
            setInput('');
            return;
        }

        // Detect Carousel creation intent
        const carouselKeywords = ['create carousel', 'carousel', 'featured products', 'product carousel', 'make carousel', 'new carousel'];
        const isCarouselRequest = carouselKeywords.some(keyword => lowerInput.includes(keyword));

        if (isCarouselRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setCarouselInitialPrompt(input.trim());
            setShowCarouselGenerator(true);
            setInput('');
            return;
        }

        const launchKeywords = ['product launch', 'launch package', 'launch plan', 'launch brief', 'go to market', 'new sku launch', 'new product drop'];
        const isLaunchRequest = launchKeywords.some((keyword) => lowerInput.includes(keyword));

        if (isLaunchRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setLaunchInitialPrompt(input.trim());
            setShowLaunchCoordinator(true);
            setInput('');
            return;
        }

        // Detect Hero banner creation intent
        const heroKeywords = ['create hero', 'hero banner', 'hero image', 'make hero', 'new hero', 'brand hero'];
        const isHeroRequest = heroKeywords.some(keyword => lowerInput.includes(keyword));

        if (isHeroRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setHeroInitialPrompt(input.trim());
            setShowHeroGenerator(true);
            setInput('');
            return;
        }

        const imageKeywords = ['create image', 'generate image', 'make image', 'product photo', 'lifestyle image', 'marketing image'];
        const isImageRequest = imageKeywords.some((keyword) => lowerInput.includes(keyword));

        if (isImageRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setImageInitialPrompt(input.trim());
            setShowImageGenerator(true);
            setInput('');
            return;
        }

        const videoKeywords = ['create video', 'generate video', 'make video', 'video ad', 'reel', 'tiktok', 'instagram video'];
        const isVideoRequest = videoKeywords.some((keyword) => lowerInput.includes(keyword));

        if (isVideoRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setVideoInitialPrompt(input.trim());
            setShowVideoGenerator(true);
            setInput('');
            return;
        }

        const crmKeywords = ['win back customers', 'birthday campaign', 'vip appreciation', 'segment analysis', 'restock alert', 'customer retention', 'crm campaign', 'customer lifecycle'];
        const isCrmRequest = crmKeywords.some((keyword) => lowerInput.includes(keyword));

        if (thread.type === 'crm_customer' && isCrmRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setCrmInitialPrompt(input.trim());
            setShowCrmCoordinator(true);
            setInput('');
            return;
        }

        const productDiscoveryKeywords = [
            'find product',
            'find products',
            'recommend product',
            'recommend products',
            'product recommendation',
            'what should i buy',
            'menu recommendation',
            'suggest bundles',
            'bundle ideas',
            'product pairings',
            'pair products',
            'entourage effect',
        ];
        const isProductDiscoveryRequest = productDiscoveryKeywords.some((keyword) => lowerInput.includes(keyword));

        if (isProductDiscoveryRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setProductDiscoveryInitialPrompt(input.trim());
            setShowProductDiscovery(true);
            setInput('');
            return;
        }

        const wholesaleKeywords = [
            'wholesale inventory',
            'wholesale availability',
            'availability list',
            'retail buyers',
            'wholesale stock',
            'leaflink inventory',
        ];
        const isWholesaleInventoryRequest = wholesaleKeywords.some((keyword) => lowerInput.includes(keyword));

        if (isWholesaleInventoryRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setWholesaleInventoryInitialPrompt(input.trim());
            setShowWholesaleInventory(true);
            setInput('');
            return;
        }

        // Detect Hero banner publish intent
        const publishHeroKeywords = ['publish hero', 'activate hero', 'make hero live', 'publish my hero', 'activate my hero', 'push hero live'];
        const isPublishHeroRequest = publishHeroKeywords.some(keyword => lowerInput.includes(keyword));

        if (isPublishHeroRequest && lastCreatedHeroId && lastCreatedHeroOrgId) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setInput('');

            // Activate the hero
            setIsSubmitting(true);
            try {
                const result = await toggleHeroActive(lastCreatedHeroId, true);

                if (result.success) {
                    // Get menu URL
                    let menuUrl = '';
                    try {
                        const slug = await getBrandSlug(lastCreatedHeroOrgId);
                        if (slug) {
                            menuUrl = `\n\n🌐 **[Visit Your Live Menu](/${slug})** to see it in action!`;
                        }
                    } catch (error) {
                        console.error('Error getting menu URL:', error);
                    }

                    const successMessage: ChatMessage = {
                        id: `msg-${Date.now()}`,
                        type: 'agent',
                        content: `🚀 **Hero Banner Published!**\n\nYour hero banner is now live on your menu. Customers will see it when they visit your page.${menuUrl}`,
                        timestamp: new Date(),
                    };
                    addMessageToThread(thread.id, successMessage);

                    // Clear the stored hero ID after publishing
                    setLastCreatedHeroId(null);
                    setLastCreatedHeroOrgId(null);
                } else {
                    throw new Error(result.error || 'Failed to publish hero');
                }
            } catch (error: any) {
                const errorMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    type: 'agent',
                    content: `❌ **Failed to publish hero banner**\n\n${error.message || 'Please try again from the Heroes Dashboard.'}`,
                    timestamp: new Date(),
                };
                addMessageToThread(thread.id, errorMessage);
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Detect Bundle creation intent
        const bundleKeywords = ['create bundle', 'bundle', 'bundle deal', 'bogo', 'mix and match', 'mix & match', 'promotional bundle', 'make bundle', 'new bundle'];
        const isBundleRequest = bundleKeywords.some(keyword => lowerInput.includes(keyword));

        if (isBundleRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setBundleInitialPrompt(input.trim());
            setShowBundleGenerator(true);
            setInput('');
            return;
        }

        // Detect Social Post creation intent
        const socialPostKeywords = ['create post', 'social post', 'social media', 'instagram post', 'tiktok post', 'linkedin post', 'make post', 'new post', 'write post'];
        const isSocialPostRequest = socialPostKeywords.some(keyword => lowerInput.includes(keyword));

        if (isSocialPostRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setSocialPostInitialPrompt(input.trim());
            setShowSocialPostGenerator(true);
            setInput('');
            return;
        }

        // Detect Dynamic Pricing creation intent
        const pricingKeywords = ['dynamic pricing', 'price optimization', 'pricing strategy', 'competitor pricing', 'clearance pricing', 'optimize prices', 'adjust prices', 'pricing rules'];
        const isPricingRequest = pricingKeywords.some(keyword => lowerInput.includes(keyword));

        if (isPricingRequest) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'user',
                content: input.trim(),
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, userMessage);
            setPricingInitialPrompt(input.trim());
            setShowPricingGenerator(true);
            setInput('');
            return;
        }

        // Prepare attachments for the message
        const pendingAttachments = attachments;
        const messageAttachments = pendingAttachments.map((att) => toChatMessageAttachment(att));

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'user',
            content: input.trim() || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : ''),
            timestamp: new Date(),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };

        // Add user message to local state immediately (hides briefing, shows conversation)
        addMessageToThread(thread.id, userMessage);

        // Prepare attachments for agent (base64 format)
        const messageContent = input.trim();

        // Show thinking indicator immediately — before any async work so the user
        // sees feedback right away. The Firestore write runs in parallel.
        const thinkingMessage: ChatMessage = {
            id: `thinking-${Date.now()}`,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: [] },
            metadata: { agentName: AGENT_NAMES[thread.primaryAgent]?.name || 'Assistant' },
        };
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.value = '';
        }
        setAttachments([]);
        addMessageToThread(thread.id, thinkingMessage);
        setCurrentThinkingMessageId(thinkingMessage.id);
        scrollToBottom('smooth');
        setIsSubmitting(true);

        try {
            // Persist user message to Firestore in parallel with agent dispatch.
            // We don't await this — a failed write won't block the agent response.
            void addMessageToInboxThread(thread.id, userMessage);

            const agentAttachments = await toAgentAttachmentPayloads(pendingAttachments);

            // Call the inbox agent chat with attachments
            const result = await runInboxAgentChat(
                thread.id,
                messageContent || 'Please analyze the attached file(s).',
                agentAttachments.length > 0 ? agentAttachments : undefined
            );

            if (!result.success) {
                const errorMessage: ChatMessage = {
                    ...thinkingMessage,
                    id: `msg-${Date.now()}`,
                    content: `I encountered an error: ${result.error || 'Unknown error'}. Please try again.`,
                    timestamp: new Date(),
                    thinking: { isThinking: false, steps: [], plan: [] },
                };
                finalizeThinkingMessage(thinkingMessage.id, errorMessage, { syncPreview: true });
                void addMessageToInboxThread(thread.id, errorMessage);
                setCurrentThinkingMessageId(null);
                setIsSubmitting(false);
                return;
            }

            // If we got a job ID, start polling
            if (result.jobId) {
                const initialVmRun = createVmRunArtifactData({
                    runId: `vm-${result.jobId}`,
                    threadId: thread.id,
                    jobId: result.jobId,
                    agentId: thread.primaryAgent,
                    roleScope,
                    runtimeBackend: getDefaultRuntimeBackend(thread.primaryAgent),
                    title: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} VM Run`,
                    summary: messageContent || 'Agent is working on your request.',
                });

                setCurrentJobId(result.jobId);
                void (async () => {
                    try {
                        const vmArtifactResult = await createInboxArtifact({
                            threadId: thread.id,
                            type: 'vm_run',
                            data: initialVmRun,
                            rationale: `${AGENT_NAMES[thread.primaryAgent]?.name || 'Agent'} is working on your request.`,
                        });

                        if (vmArtifactResult.success && vmArtifactResult.artifact) {
                            addArtifacts([vmArtifactResult.artifact]);
                            updateThread(thread.id, {
                                artifactIds: thread.artifactIds.includes(vmArtifactResult.artifact.id)
                                    ? thread.artifactIds
                                    : [...thread.artifactIds, vmArtifactResult.artifact.id],
                                status: 'draft',
                            });
                            setCurrentVmArtifactId(vmArtifactResult.artifact.id);
                            setSelectedArtifact(vmArtifactResult.artifact.id);
                        }
                    } catch (error) {
                        toast({
                            title: 'Agent run started',
                            description: error instanceof Error
                                ? `Live response is still running, but the artifact panel could not be prepared: ${error.message}`
                                : 'Live response is still running, but the artifact panel could not be prepared.',
                            variant: 'destructive',
                        });
                    }
                })();
                return;
            }

            // If we got an immediate response with message
            if (result.message) {
                if (thinkingMessage) {
                    finalizeThinkingMessage(thinkingMessage.id, {
                        ...result.message,
                        thinking: result.message.thinking ?? { isThinking: false, steps: [], plan: [] },
                    }, { syncPreview: true });
                } else {
                    addMessageToThread(thread.id, {
                        ...result.message,
                        thinking: result.message.thinking ?? { isThinking: false, steps: [], plan: [] },
                    });
                }

                // Add any artifacts that were created
                if (result.artifacts && result.artifacts.length > 0) {
                    addArtifacts(result.artifacts);
                }
            }

            setCurrentThinkingMessageId(null);
            setIsSubmitting(false);
        } catch (error: any) {
            console.error('Failed to send message:', error);
            const errorDetails = error?.message || error?.toString() || 'Unknown error';
            const errorMessage: ChatMessage = {
                ...thinkingMessage,
                id: `msg-${Date.now()}`,
                content: `Sorry, I encountered an unexpected error: ${errorDetails}\n\nPlease try again or contact support if this persists.`,
                timestamp: new Date(),
                thinking: { isThinking: false, steps: [], plan: [] },
            };
            finalizeThinkingMessage(thinkingMessage.id, errorMessage, { syncPreview: true });
            void addMessageToInboxThread(thread.id, errorMessage);
            setCurrentThinkingMessageId(null);
            setIsSubmitting(false);
        }
    };

    // Auto-submit if the user typed a message before the thread was open
    // (pending input set by inbox-empty-state or sidebar)
    useEffect(() => {
        if (hasPendingAutoSubmit.current && !isPending && !isSubmitting) {
            hasPendingAutoSubmit.current = false;
            void handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPending, isSubmitting]);

    const handleCompleteCarousel = async (carouselData: any) => {
        setShowCarouselGenerator(false);

        // Get the menu URL
        let menuUrl = '';
        try {
            const slug = await getBrandSlug(carouselData.orgId);
            if (slug) {
                menuUrl = `\n\n🌐 **[View Live Menu](/${slug})** - Your carousel is now visible to customers!`;
            }
        } catch (error) {
            console.error('Error getting menu URL:', error);
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Carousel Created Successfully!**\n\n"${carouselData.title}" has been added to your menu with ${carouselData.productIds.length} products. You can view and manage it in the [Carousel Dashboard](/dashboard/carousels).${menuUrl}`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setCarouselInitialPrompt('');
    };

    const handleCompleteHero = async (heroData: any) => {
        setShowHeroGenerator(false);

        // Get the menu URL
        let menuUrl = '';
        try {
            const slug = await getBrandSlug(heroData.orgId);
            if (slug) {
                menuUrl = `\n\n🌐 Your live menu: [bakedbot.ai/${slug}](/${slug})`;
            }
        } catch (error) {
            console.error('Error getting menu URL:', error);
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Hero Banner Created Successfully!**\n\n"${heroData.brandName}" hero banner has been created as a draft.\n\n📋 **Next Steps:**\n- Review it in the [Heroes Dashboard](/dashboard/heroes)\n- When ready, activate it to show on your menu${menuUrl}\n\n💡 *Tip: Reply "publish my hero banner" to activate it now, or manage it from the dashboard.*`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setHeroInitialPrompt('');

        // Store the hero ID for potential quick activation
        setLastCreatedHeroId(heroData.id);
        setLastCreatedHeroOrgId(heroData.orgId);
    };

    const handleCompleteBundle = async (bundleData: any) => {
        setShowBundleGenerator(false);

        const bundleTypeLabelMap: Record<string, string> = {
            bogo: 'BOGO',
            mix_match: 'Mix & Match',
            percentage: 'Percentage Off',
            fixed_price: 'Fixed Price',
            tiered: 'Tiered Discount'
        };
        const bundleTypeLabel = bundleTypeLabelMap[bundleData.type] || bundleData.type;

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Bundle Created Successfully!**\n\n"${bundleData.name}" (${bundleTypeLabel}) is now live on your menu. Customers can now take advantage of this promotional deal. You can view and manage it in the [Bundle Dashboard](/dashboard/bundles).`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setBundleInitialPrompt('');
    };

    const handleCompleteSocialPost = async (posts: any) => {
        setShowSocialPostGenerator(false);

        const platformCount = Object.keys(posts).filter(k => ['instagram', 'tiktok', 'linkedin'].includes(k)).length;

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Social Media Posts Ready!**\n\n${platformCount} platform-optimized posts have been generated:\n\n📸 **Instagram** - ${posts.instagram?.characterCount || 0} characters\n🎵 **TikTok** - ${posts.tiktok?.characterCount || 0} characters\n💼 **LinkedIn** - ${posts.linkedin?.characterCount || 0} characters\n\nYour posts are ready to copy and publish across your social channels!`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setSocialPostInitialPrompt('');
    };

    const handleCompletePricing = async (rule: any, pushRecommendation?: boolean) => {
        setShowPricingGenerator(false);

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Dynamic Pricing Rule Activated!**\n\n"${rule.name}" is now optimizing prices based on:\n• ${rule.strategy.charAt(0).toUpperCase() + rule.strategy.slice(1)} strategy\n• ${rule.priceAdjustment.value * 100}% discount adjustment\n${rule.conditions.inventoryAge ? '• Inventory age monitoring\n' : ''}${rule.conditions.competitorPrice ? '• Competitor price tracking\n' : ''}${rule.conditions.timeRange ? '• Time-based pricing\n' : ''}${rule.conditions.customerTier ? '• Customer tier pricing\n' : ''}\n\nMonitor performance in your [Pricing Dashboard](/dashboard/pricing).`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setPricingInitialPrompt('');

        if (pushRecommendation) {
            setOutreachInitialPrompt(`Draft a campaign to announce our new "${rule.name}" pricing to customers. Highlight our competitive prices.`);
            setShowOutreachGenerator(true);
        }
    };

    /* const handleCompleteVideo = async (videoData: any) => {
        setShowVideoGenerator(false);
        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `🎬 **Video Concept Ready!**\n\nTitle: "${videoData.title}"\nYour video script and concept have been generated. You can pass this to your creative team or record it yourself!`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setVideoInitialPrompt('');
    }; */

    const persistGeneratedCreativeDraft = async (
        draft: CreativeContent,
        media: {
            type: 'image' | 'video';
            url: string;
            prompt: string;
            duration?: number;
            model: string;
        },
        content: string,
        rationale: string,
    ) => {
        const result = await createInboxArtifact({
            threadId: thread.id,
            type: 'creative_content',
            data: draft,
            rationale,
        });

        if (!result.success || !result.artifact) {
            throw new Error(result.error || 'Failed to save creative draft.');
        }

        addArtifacts([result.artifact]);
        updateThread(thread.id, {
            artifactIds: [...thread.artifactIds, result.artifact.id],
            status: 'draft',
        });
        setSelectedArtifact(result.artifact.id);
        setArtifactPanelOpen(true);

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content,
            timestamp: new Date(),
            metadata: {
                agentName: AGENT_NAMES[thread.primaryAgent]?.name,
                model: media.model,
                media,
            },
        };
        addMessageToThread(thread.id, confirmationMessage);
    };

    const handleCompleteImage = async (imageData: {
        draft: CreativeContent;
        media: {
            type: 'image';
            url: string;
            prompt: string;
            model: string;
        };
    }) => {
        await persistGeneratedCreativeDraft(
            imageData.draft,
            imageData.media,
            `🖼️ **Image Draft Saved!**\n\nYour marketing image is ready in the artifact panel and previewed inline here for review.`,
            'Generated inline with the inbox image tool.',
        );
        setShowImageGenerator(false);
        setImageInitialPrompt('');
    };

    const handleOpenLaunchAsset = (
        asset: 'carousel' | 'bundle' | 'image' | 'video' | 'campaign',
        assetPrompt: string,
    ) => {
        switch (asset) {
            case 'carousel':
                setCarouselInitialPrompt(assetPrompt);
                setShowCarouselGenerator(true);
                break;
            case 'bundle':
                setBundleInitialPrompt(assetPrompt);
                setShowBundleGenerator(true);
                break;
            case 'image':
                setImageInitialPrompt(assetPrompt);
                setShowImageGenerator(true);
                break;
            case 'video':
                setVideoInitialPrompt(assetPrompt);
                setShowVideoGenerator(true);
                break;
            case 'campaign':
                setCampaignInitialPrompt(assetPrompt);
                setShowCampaignPlanner(true);
                break;
            default:
                break;
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `🚀 **Launch Asset Ready**\n\nOpening the ${asset} workflow with a coordinated prompt from your launch brief.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
    };

    const handleOpenCrmAction = (
        action: 'campaign' | 'outreach' | 'performance',
        actionPrompt: string,
    ) => {
        switch (action) {
            case 'campaign':
                setCampaignInitialPrompt(actionPrompt);
                setShowCampaignPlanner(true);
                break;
            case 'outreach':
                setOutreachInitialPrompt(actionPrompt);
                setShowOutreachGenerator(true);
                break;
            case 'performance':
                setPerformanceInitialPrompt(actionPrompt);
                setShowPerformanceReview(true);
                break;
            default:
                break;
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `📬 **CRM Action Ready**\n\nOpening the ${action} workflow with prompts grounded in your CRM data.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
    };

    const handleOpenProductDiscoveryAction = (
        action: 'bundle' | 'outreach',
        actionPrompt: string,
    ) => {
        switch (action) {
            case 'bundle':
                setBundleInitialPrompt(actionPrompt);
                setShowBundleGenerator(true);
                break;
            case 'outreach':
                setOutreachInitialPrompt(actionPrompt);
                setShowOutreachGenerator(true);
                break;
            default:
                break;
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `🔎 **Product Discovery Action Ready**\n\nOpening the ${action} workflow with prompts grounded in your current catalog.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
    };

    const handleOpenWholesaleInventoryAction = (
        action: 'outreach',
        actionPrompt: string,
    ) => {
        switch (action) {
            case 'outreach':
                setOutreachInitialPrompt(actionPrompt);
                setShowOutreachGenerator(true);
                break;
            default:
                break;
        }

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `📦 **Wholesale Action Ready**\n\nOpening the ${action} workflow with prompts grounded in your live inventory snapshot.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
    };

    const handleSaveVideoDraft = async (videoData: {
        draft: CreativeContent;
        media: {
            type: 'video';
            url: string;
            prompt: string;
            duration: number;
            model: string;
        };
    }) => {
        await persistGeneratedCreativeDraft(
            videoData.draft,
            videoData.media,
            `🎬 **Video Draft Saved!**\n\nYour rendered video is ready in the artifact panel and previewed inline here for review.`,
            'Generated inline with the inbox video tool.',
        );
        setShowVideoGenerator(false);
        setVideoInitialPrompt('');
    };

    const handleCompleteCampaign = async (campaignData: any) => {
        setShowCampaignPlanner(false);
        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `🚀 **Campaign Plan Approved!**\n\n"${campaignData.name}" has been outlined. We will coordinate across ${campaignData.channels.join(', ')}.\n\nLet me know when you'd like to start drafting the individual assets!`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setCampaignInitialPrompt('');
    };

    const handleCompletePerformance = async (reportData: any) => {
        setShowPerformanceReview(false);
        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `📊 **Analysis Complete**\n\nRecommendation acknowledged: ${reportData.recommendation}\n\nI'll monitor this metric and alert you of any significant changes.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setPerformanceInitialPrompt('');
    };

    const handleCompleteOutreach = async (draftData: any) => {
        setShowOutreachGenerator(false);
        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `📨 **Outreach Ready for Review!**\n\nYour ${draftData.channel} blast to ${draftData.audience} is staged and ready to be scheduled through your messaging platform.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setOutreachInitialPrompt('');
    };

    const handleCompleteEvent = async (eventData: any) => {
        setShowEventPlanner(false);
        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `🎉 **Event Marketing Plan Confirmed!**\n\nWe're officially gearing up for "${eventData.name}" on ${eventData.date}. I have the promo schedule logged in our calendar.`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setEventInitialPrompt('');
    };

    const handleCompleteQRCode = async (qrCodeData: {
        url: string;
        campaignName: string;
        foregroundColor: string;
        backgroundColor: string;
        imageDataUrl: string;
    }) => {
        setShowQRGenerator(false);

        const result = await generateQRCode({
            type: 'custom',
            title: qrCodeData.campaignName || 'QR Code',
            description: `QR code for ${qrCodeData.url}`,
            targetUrl: qrCodeData.url,
            style: 'branded',
            primaryColor: qrCodeData.foregroundColor,
            backgroundColor: qrCodeData.backgroundColor,
            campaign: qrCodeData.campaignName,
            tags: ['inbox', 'craig'],
        });

        if (result.success && result.qrCode) {
            const confirmationMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: `✅ QR Code created successfully with tracking enabled!\n\n**Campaign:** ${result.qrCode.title}\n**Target URL:** ${result.qrCode.targetUrl}\n**Tracking URL:** \`${process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai'}/qr/${result.qrCode.shortCode}\`\n\nYour QR code has been saved and will track:\n• Total scans\n• Unique visitors\n• Device types\n• Geographic location\n\nView analytics in your dashboard!`,
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, confirmationMessage);
        } else {
            const confirmationMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: `✅ QR Code created!\n\n**Campaign:** ${qrCodeData.campaignName || 'QR Code'}\n**Target URL:** ${qrCodeData.url}\n\nYour QR code has been downloaded. You can use it in your marketing materials!`,
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, confirmationMessage);
        }
    };

    const handleStop = async () => {
        if (!currentJobId) {
            return;
        }

        try {
            const result = await cancelInboxAgentJob(currentJobId);
            if (!result.success) {
                throw new Error(result.error || 'Please try again in a moment.');
            }
        } catch (error) {
            toast({
                title: 'Unable to stop right now',
                description: error instanceof Error ? error.message : 'Please try again in a moment.',
                variant: 'destructive',
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <ThreadHeader thread={thread} />

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-4">
                <div className="max-w-3xl mx-auto py-4">
                    {thread.messages.length === 0 ? (
                        <>
                            {!showQRGenerator && !showCarouselGenerator && !showHeroGenerator && !showBundleGenerator && !showLaunchCoordinator && !showImageGenerator && !showSocialPostGenerator && !showPricingGenerator && !showVideoGenerator && !showCampaignPlanner && !showPerformanceReview && !showOutreachGenerator && !showEventPlanner && !showCrmCoordinator && !showProductDiscovery && !showWholesaleInventory && (
                                <div className="text-center py-12">
                                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                    <h3 className="font-medium text-lg mb-2">Start the conversation</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        Describe what you'd like to create and {AGENT_NAMES[thread.primaryAgent]?.name || 'your assistant'} will help you build it.
                                    </p>
                                </div>
                            )}

                            {/* Show QR Code Generator inline for empty QR threads */}
                            {showQRGenerator && (
                                <div className="mt-4">
                                    <QRCodeGeneratorInline
                                        onComplete={handleCompleteQRCode}
                                    />
                                </div>
                            )}

                            {/* Show Carousel Generator inline for empty carousel threads */}
                            {showCarouselGenerator && (
                                <div className="mt-4">
                                    <CarouselGeneratorInline
                                        onComplete={handleCompleteCarousel}
                                        initialPrompt={carouselInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Hero Generator inline for empty hero threads */}
                            {showHeroGenerator && (
                                <div className="mt-4">
                                    <HeroGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteHero}
                                        initialPrompt={heroInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Bundle Generator inline for empty bundle threads */}
                            {!showBundleGenerator && thread.type === 'bundle' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowBundleGenerator(true)}
                                    className="mt-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Show Bundle Creator
                                </Button>
                            )}

                            {showBundleGenerator && (
                                <div className="mt-4">
                                    <BundleGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteBundle}
                                        initialPrompt={bundleInitialPrompt}
                                    />
                                </div>
                            )}

                            {showLaunchCoordinator && (
                                <div className="mt-4">
                                    <LaunchCoordinatorInline
                                        orgId={thread.orgId}
                                        initialPrompt={launchInitialPrompt}
                                        onOpenAsset={handleOpenLaunchAsset}
                                    />
                                </div>
                            )}

                            {showImageGenerator && (
                                <div className="mt-4">
                                    <ImageGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteImage}
                                        initialPrompt={imageInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Social Post Generator inline for empty social post threads */}
                            {showSocialPostGenerator && (
                                <div className="mt-4">
                                    <SocialPostGeneratorInline
                                        onComplete={handleCompleteSocialPost}
                                        initialPrompt={socialPostInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Dynamic Pricing Generator inline for empty pricing threads */}
                            {showPricingGenerator && (
                                <div className="mt-4">
                                    <DynamicPricingGeneratorInline
                                        onComplete={handleCompletePricing}
                                        initialPrompt={pricingInitialPrompt}
                                    />
                                </div>
                            )}

                            {showVideoGenerator && (
                                <div className="mt-4">
                                    <VideoGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleSaveVideoDraft}
                                        initialPrompt={videoInitialPrompt}
                                    />
                                </div>
                            )}

                            {showCampaignPlanner && (
                                <div className="mt-4">
                                    <CampaignPlannerInline
                                        onComplete={handleCompleteCampaign}
                                        initialPrompt={campaignInitialPrompt}
                                    />
                                </div>
                            )}

                            {showPerformanceReview && (
                                <div className="mt-4">
                                    <PerformanceReviewInline
                                        onComplete={handleCompletePerformance}
                                        initialPrompt={performanceInitialPrompt}
                                    />
                                </div>
                            )}

                            {showOutreachGenerator && (
                                <div className="mt-4">
                                    <OutreachGeneratorInline
                                        onComplete={handleCompleteOutreach}
                                        initialPrompt={outreachInitialPrompt}
                                    />
                                </div>
                            )}

                            {showEventPlanner && (
                                <div className="mt-4">
                                    <EventPlannerInline
                                        onComplete={handleCompleteEvent}
                                        initialPrompt={eventInitialPrompt}
                                    />
                                </div>
                            )}

                            {showCrmCoordinator && (
                                <div className="mt-4">
                                    <CrmCampaignInline
                                        orgId={thread.orgId}
                                        initialPrompt={crmInitialPrompt}
                                        customerId={thread.customerId}
                                        customerEmail={thread.customerEmail}
                                        onOpenAction={handleOpenCrmAction}
                                    />
                                </div>
                            )}

                            {showProductDiscovery && (
                                <div className="mt-4">
                                    <ProductDiscoveryInline
                                        orgId={thread.orgId}
                                        initialPrompt={productDiscoveryInitialPrompt}
                                        onOpenAction={handleOpenProductDiscoveryAction}
                                    />
                                </div>
                            )}

                            {showWholesaleInventory && (
                                <div className="mt-4">
                                    <WholesaleInventoryInline
                                        orgId={thread.orgId}
                                        initialPrompt={wholesaleInventoryInitialPrompt}
                                        onOpenAction={handleOpenWholesaleInventoryAction}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {thread.messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    agentPersona={thread.primaryAgent}
                                    artifacts={artifacts}
                                    threadId={thread.id}
                                />
                            ))}

                            {/* Show QR Code Generator inline after messages */}
                            {showQRGenerator && (
                                <div className="mt-4">
                                    <QRCodeGeneratorInline
                                        onComplete={handleCompleteQRCode}
                                    />
                                </div>
                            )}

                            {/* Show Carousel Generator inline after messages */}
                            {showCarouselGenerator && (
                                <div className="mt-4">
                                    <CarouselGeneratorInline
                                        onComplete={handleCompleteCarousel}
                                        initialPrompt={carouselInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Hero Generator inline after messages */}
                            {showHeroGenerator && (
                                <div className="mt-4">
                                    <HeroGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteHero}
                                        initialPrompt={heroInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Bundle Generator inline after messages */}
                            {showBundleGenerator && (
                                <div className="mt-4">
                                    <BundleGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteBundle}
                                        initialPrompt={bundleInitialPrompt}
                                    />
                                </div>
                            )}

                            {showLaunchCoordinator && (
                                <div className="mt-4">
                                    <LaunchCoordinatorInline
                                        orgId={thread.orgId}
                                        initialPrompt={launchInitialPrompt}
                                        onOpenAsset={handleOpenLaunchAsset}
                                    />
                                </div>
                            )}

                            {showImageGenerator && (
                                <div className="mt-4">
                                    <ImageGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleCompleteImage}
                                        initialPrompt={imageInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Social Post Generator inline after messages */}
                            {showSocialPostGenerator && (
                                <div className="mt-4">
                                    <SocialPostGeneratorInline
                                        onComplete={handleCompleteSocialPost}
                                        initialPrompt={socialPostInitialPrompt}
                                    />
                                </div>
                            )}

                            {/* Show Dynamic Pricing Generator inline after messages */}
                            {showPricingGenerator && (
                                <div className="mt-4">
                                    <DynamicPricingGeneratorInline
                                        onComplete={handleCompletePricing}
                                        initialPrompt={pricingInitialPrompt}
                                    />
                                </div>
                            )}

                            {showVideoGenerator && (
                                <div className="mt-4">
                                    <VideoGeneratorInline
                                        orgId={thread.orgId}
                                        onComplete={handleSaveVideoDraft}
                                        initialPrompt={videoInitialPrompt}
                                    />
                                </div>
                            )}

                            {showCampaignPlanner && (
                                <div className="mt-4">
                                    <CampaignPlannerInline
                                        onComplete={handleCompleteCampaign}
                                        initialPrompt={campaignInitialPrompt}
                                    />
                                </div>
                            )}

                            {showPerformanceReview && (
                                <div className="mt-4">
                                    <PerformanceReviewInline
                                        onComplete={handleCompletePerformance}
                                        initialPrompt={performanceInitialPrompt}
                                    />
                                </div>
                            )}

                            {showOutreachGenerator && (
                                <div className="mt-4">
                                    <OutreachGeneratorInline
                                        onComplete={handleCompleteOutreach}
                                        initialPrompt={outreachInitialPrompt}
                                    />
                                </div>
                            )}

                            {showEventPlanner && (
                                <div className="mt-4">
                                    <EventPlannerInline
                                        onComplete={handleCompleteEvent}
                                        initialPrompt={eventInitialPrompt}
                                    />
                                </div>
                            )}

                            {showCrmCoordinator && (
                                <div className="mt-4">
                                    <CrmCampaignInline
                                        orgId={thread.orgId}
                                        initialPrompt={crmInitialPrompt}
                                        customerId={thread.customerId}
                                        customerEmail={thread.customerEmail}
                                        onOpenAction={handleOpenCrmAction}
                                    />
                                </div>
                            )}

                            {showProductDiscovery && (
                                <div className="mt-4">
                                    <ProductDiscoveryInline
                                        orgId={thread.orgId}
                                        initialPrompt={productDiscoveryInitialPrompt}
                                        onOpenAction={handleOpenProductDiscoveryAction}
                                    />
                                </div>
                            )}

                            {showWholesaleInventory && (
                                <div className="mt-4">
                                    <WholesaleInventoryInline
                                        orgId={thread.orgId}
                                        initialPrompt={wholesaleInventoryInitialPrompt}
                                        onOpenAction={handleOpenWholesaleInventoryAction}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* TaskFeed with Agent Pulse - shown while agent is thinking */}
                    <AnimatePresence>
                        {isSubmitting && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="py-4"
                            >
                                <InboxTaskFeed
                                    agentPersona={thread.primaryAgent}
                                    thoughts={thoughts}
                                    isRunning={isSubmitting}
                                    currentAction={latestThoughtLabel}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={bottomAnchorRef} />
                </div>
            </ScrollArea>

            {/* Input Area — inline style overrides pb-* to handle iOS home indicator */}
            <div
                className="bg-background px-3 pt-1"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
                <div className="max-w-3xl mx-auto">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,text/markdown,application/json,.md,.markdown,.csv,.json,.js,.jsx,.ts,.tsx,.py,.sh,.yaml,.yml,.xml,.html,.css"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {attachments.length > 0 && (
                        <div className="mb-2">
                            <AttachmentPreviewList
                                attachments={attachments}
                                onRemove={handleRemoveAttachment}
                            />
                        </div>
                    )}

                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            placeholder={isPending
                                ? 'Setting up conversation...'
                                : `Message ${AGENT_NAMES[thread.primaryAgent]?.name || 'assistant'}...`
                            }
                            className="min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            rows={1}
                            disabled={isSubmitting || isPending}
                        />

                        <div className="flex items-center justify-between px-3 pb-2.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting || isPending}
                                title="Attach files (images, PDFs)"
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={isSubmitting ? handleStop : handleSubmit}
                                disabled={isPending || (!isSubmitting && !input.trim() && attachments.length === 0)}
                                size="icon"
                                variant={isSubmitting ? 'destructive' : 'default'}
                                className="h-8 w-8 rounded-xl"
                                title={isSubmitting ? 'Stop response' : 'Send message'}
                            >
                                {isSubmitting || isPending ? (
                                    isSubmitting ? (
                                        <X className="h-4 w-4" />
                                    ) : (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InboxConversation;
