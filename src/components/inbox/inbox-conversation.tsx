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
    Bot,
    User,
    MoreHorizontal,
    Archive,
    Trash2,
    Edit2,
    Sparkles,
    RefreshCw,
    Paperclip,
    FileText,
    X,
    Pin,
    Tag as TagIcon,
    FolderKanban,
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
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import type { InboxThread, InboxArtifact, InboxAgentPersona } from '@/types/inbox';
import { getThreadTypeLabel, getThreadTypeIcon } from '@/types/inbox';
import { InboxCarouselCard } from './artifacts/carousel-card';
import { InboxBundleCard } from './artifacts/bundle-card';
import { InboxCreativeCard } from './artifacts/creative-card';
import { InboxIntegrationCard } from './artifacts/integration-card';
import { InboxResearchCard } from './artifacts/inbox-research-card';
import { InboxTaskFeed, AGENT_PULSE_CONFIG } from './inbox-task-feed';
import { QRCodeGeneratorInline } from './qr-code-generator-inline';
import { CarouselGeneratorInline } from './carousel-generator-inline';
import { HeroGeneratorInline } from './hero-generator-inline';
import { BundleGeneratorInline } from './bundle-generator-inline';
import { SocialPostGeneratorInline } from './social-post-generator-inline';
import { DynamicPricingGeneratorInline } from './dynamic-pricing-generator-inline';
import { formatDistanceToNow } from 'date-fns';
import { runInboxAgentChat, addMessageToInboxThread } from '@/server/actions/inbox';
import { generateQRCode } from '@/server/actions/qr-code';
import { toggleHeroActive } from '@/app/actions/heroes';
import { getBrandSlug } from '@/server/actions/slug-management';
import { useJobPoller } from '@/hooks/use-job-poller';
import { AttachmentPreviewList, type AttachmentItem } from '@/components/ui/attachment-preview';
import { useToast } from '@/hooks/use-toast';

// ============ Pending Input Store ============
// Module-level map so other components (empty state, sidebar) can pre-populate
// the chat input before a thread is activated. Read once on mount, then cleared.
export const _pendingInputs = new Map<string, string>();

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
}: {
    message: ChatMessage;
    agentPersona: InboxAgentPersona;
    artifacts: InboxArtifact[];
}) {
    const isUser = message.type === 'user';
    const agent = AGENT_NAMES[agentPersona] || AGENT_NAMES.auto;

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
                                                            {typeof step === 'string' ? step : step.action || step.tool || JSON.stringify(step)}
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
                        <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
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
                </div>

                {/* Inline Artifact Cards */}
                {messageArtifacts.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {messageArtifacts.map((artifact) => (
                            <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
                        ))}
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
        default:
            return null;
    }
}

// ============ Thread Header ============

function ThreadHeader({ thread }: { thread: InboxThread }) {
    const { archiveThread, deleteThread, updateThread, togglePinThread } = useInboxStore();
    const agent = AGENT_NAMES[thread.primaryAgent] || AGENT_NAMES.auto;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Agent Avatar with colored ring */}
                <div className={cn(
                    'p-2 rounded-xl ring-2 ring-offset-2 ring-offset-background',
                    agent.bgColor,
                    agent.ringColor
                )}>
                    {agent.avatar.startsWith('http') ? <img src={agent.avatar} alt={agent.name} className="w-6 h-6 object-contain rounded" /> : <span className="text-xl">{agent.avatar}</span>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {thread.isPinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                        <h2 className="font-semibold truncate">{thread.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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

            <div className="flex items-center gap-1">
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

// File upload constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
];

export function InboxConversation({ thread, artifacts, className }: InboxConversationProps) {
    // Lazy init: pick up any pending input set by the empty state or sidebar before
    // activating this thread, then immediately clear it from the map.
    const hasPendingAutoSubmit = useRef(false);
    const [input, setInput] = useState<string>(() => {
        const pending = _pendingInputs.get(thread.id);
        if (pending) {
            _pendingInputs.delete(thread.id);
            hasPendingAutoSubmit.current = true; // auto-submit on mount
            return pending;
        }
        return '';
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [showQRGenerator, setShowQRGenerator] = useState(false);
    const [showCarouselGenerator, setShowCarouselGenerator] = useState(false);
    const [showHeroGenerator, setShowHeroGenerator] = useState(false);
    const [showBundleGenerator, setShowBundleGenerator] = useState(false);
    const [showSocialPostGenerator, setShowSocialPostGenerator] = useState(false);
    const [showPricingGenerator, setShowPricingGenerator] = useState(false);
    const [carouselInitialPrompt, setCarouselInitialPrompt] = useState('');
    const [heroInitialPrompt, setHeroInitialPrompt] = useState('');
    const [bundleInitialPrompt, setBundleInitialPrompt] = useState('');
    const [socialPostInitialPrompt, setSocialPostInitialPrompt] = useState('');
    const [pricingInitialPrompt, setPricingInitialPrompt] = useState('');
    const [lastCreatedHeroId, setLastCreatedHeroId] = useState<string | null>(null);
    const [lastCreatedHeroOrgId, setLastCreatedHeroOrgId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAutoShownQR = useRef<boolean>(false);
    const hasAutoShownCarousel = useRef<boolean>(false);
    const hasAutoShownHero = useRef<boolean>(false);
    const hasAutoShownBundle = useRef<boolean>(false);
    const hasAutoShownSocialPost = useRef<boolean>(false);
    const hasAutoShownPricing = useRef<boolean>(false);

    const { addMessageToThread, addArtifacts, isThreadPending } = useInboxStore();
    const isPending = isThreadPending(thread.id);
    const { toast } = useToast();

    // Use Firestore real-time job polling instead of broken HTTP polling
    const { job, isComplete, error: jobError } = useJobPoller(currentJobId ?? undefined);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thread.messages.length]);

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

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    title: 'File too large',
                    description: `${file.name} exceeds 10MB limit`,
                    variant: 'destructive',
                });
                continue;
            }

            // Validate file type
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                toast({
                    title: 'Unsupported file type',
                    description: `${file.type || 'Unknown type'} is not supported. Use images or PDFs.`,
                    variant: 'destructive',
                });
                continue;
            }

            // Read file as data URL
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const newAttachment: AttachmentItem = {
                    id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    file,
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    preview: file.type.startsWith('image/') ? dataUrl : undefined,
                    content: !file.type.startsWith('image/') ? dataUrl : undefined,
                    name: file.name,
                };
                setAttachments((prev) => [...prev, newAttachment]);
            };
            reader.readAsDataURL(file);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // Remove attachment
    const handleRemoveAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    // Handle job completion via Firestore real-time listener (useJobPoller)
    useEffect(() => {
        if (!currentJobId || !isComplete || !job) return;

        // Job completed - add response message
        setCurrentJobId(null);
        setIsSubmitting(false);

        if (job.status === 'completed' && job.result?.content) {
            const agentMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: job.result.content,
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, agentMessage);
        } else if (job.status === 'failed') {
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: `I encountered an error: ${job.error || 'Unknown error'}. Please try again.`,
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, errorMessage);
        }
    }, [currentJobId, isComplete, job, thread.id, addMessageToThread]);

    // Handle job polling errors
    useEffect(() => {
        if (jobError && currentJobId) {
            console.error('[InboxConversation] Job polling error:', jobError);
            setCurrentJobId(null);
            setIsSubmitting(false);
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: 'Sorry, I lost connection while processing your request. Please try again.',
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, errorMessage);
        }
    }, [jobError, currentJobId, thread.id, addMessageToThread]);

    // Auto-open QR generator for qr_code threads
    useEffect(() => {
        if (thread.type === 'qr_code') {
            if (!showQRGenerator) {
                setShowQRGenerator(true);
            }
            hasAutoShownQR.current = true;
        } else {
            if (showQRGenerator) {
                setShowQRGenerator(false);
            }
            hasAutoShownQR.current = false;
        }
    }, [thread.id, thread.type, showQRGenerator]);

    // Auto-open Carousel generator for carousel threads
    useEffect(() => {
        if (thread.type === 'carousel') {
            if (!showCarouselGenerator) {
                setShowCarouselGenerator(true);
            }
            hasAutoShownCarousel.current = true;
        } else {
            if (showCarouselGenerator) {
                setShowCarouselGenerator(false);
            }
            hasAutoShownCarousel.current = false;
        }
    }, [thread.id, thread.type, showCarouselGenerator]);

    // Auto-open Hero generator for hero threads
    useEffect(() => {
        if (thread.type === 'hero') {
            if (!showHeroGenerator) {
                setShowHeroGenerator(true);
            }
            hasAutoShownHero.current = true;
        } else {
            if (showHeroGenerator) {
                setShowHeroGenerator(false);
            }
            hasAutoShownHero.current = false;
        }
    }, [thread.id, thread.type, showHeroGenerator]);

    // Auto-open Bundle generator for bundle threads
    useEffect(() => {
        if (thread.type === 'bundle') {
            if (!showBundleGenerator) {
                setShowBundleGenerator(true);
            }
            hasAutoShownBundle.current = true;
        } else {
            if (showBundleGenerator) {
                setShowBundleGenerator(false);
            }
            hasAutoShownBundle.current = false;
        }
    }, [thread.id, thread.type, showBundleGenerator]);

    // Auto-open Social Post generator for creative threads
    useEffect(() => {
        if (thread.type === 'creative') {
            if (!showSocialPostGenerator) {
                setShowSocialPostGenerator(true);
            }
            hasAutoShownSocialPost.current = true;
        } else {
            if (showSocialPostGenerator) {
                setShowSocialPostGenerator(false);
            }
            hasAutoShownSocialPost.current = false;
        }
    }, [thread.id, thread.type, showSocialPostGenerator]);

    // Auto-open Dynamic Pricing generator for inventory_promo threads
    useEffect(() => {
        if (thread.type === 'inventory_promo') {
            if (!showPricingGenerator) {
                setShowPricingGenerator(true);
            }
            hasAutoShownPricing.current = true;
        } else {
            if (showPricingGenerator) {
                setShowPricingGenerator(false);
            }
            hasAutoShownPricing.current = false;
        }
    }, [thread.id, thread.type, showPricingGenerator]);

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
        const messageAttachments = attachments.map((att) => ({
            id: att.id,
            name: att.file?.name || att.name || 'file',
            type: att.file?.type || (att.type === 'image' ? 'image/jpeg' : 'application/octet-stream'),
            url: att.preview || att.content || '',
            preview: att.preview,
        }));

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'user',
            content: input.trim() || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : ''),
            timestamp: new Date(),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };

        // Add user message to local state
        addMessageToThread(thread.id, userMessage);

        // Persist user message to server
        await addMessageToInboxThread(thread.id, userMessage);

        // Prepare attachments for agent (base64 format)
        const agentAttachments = attachments.map((att) => ({
            name: att.file?.name || att.name || 'file',
            type: att.file?.type || (att.type === 'image' ? 'image/jpeg' : 'application/octet-stream'),
            base64: att.preview || att.content || '',
        }));

        const messageContent = input.trim();
        setInput('');
        if (textareaRef.current) {
            textareaRef.current.value = '';
        }
        setAttachments([]); // Clear attachments after sending

        // Slight delay before disabling the input to ensure the clear renders
        setTimeout(() => setIsSubmitting(true), 10);

        try {
            // Call the inbox agent chat with attachments
            const result = await runInboxAgentChat(
                thread.id,
                messageContent || 'Please analyze the attached file(s).',
                agentAttachments.length > 0 ? agentAttachments : undefined
            );

            if (!result.success) {
                const errorMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    type: 'agent',
                    content: `I encountered an error: ${result.error || 'Unknown error'}. Please try again.`,
                    timestamp: new Date(),
                };
                addMessageToThread(thread.id, errorMessage);
                setIsSubmitting(false);
                return;
            }

            // If we got a job ID, start polling
            if (result.jobId) {
                setCurrentJobId(result.jobId);
                return;
            }

            // If we got an immediate response with message
            if (result.message) {
                addMessageToThread(thread.id, result.message);

                // Add any artifacts that were created
                if (result.artifacts && result.artifacts.length > 0) {
                    addArtifacts(result.artifacts);
                }
            }

            setIsSubmitting(false);
        } catch (error: any) {
            console.error('Failed to send message:', error);
            const errorDetails = error?.message || error?.toString() || 'Unknown error';
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: `Sorry, I encountered an unexpected error: ${errorDetails}\n\nPlease try again or contact support if this persists.`,
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, errorMessage);
            setIsSubmitting(false);
        }
    };

    // Auto-submit if the user typed a message before the thread was open
    // (pending input set by inbox-empty-state or sidebar)
    useEffect(() => {
        if (hasPendingAutoSubmit.current) {
            hasPendingAutoSubmit.current = false;
            handleSubmit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const handleCompletePricing = async (rule: any) => {
        setShowPricingGenerator(false);

        const confirmationMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'agent',
            content: `✅ **Dynamic Pricing Rule Activated!**\n\n"${rule.name}" is now optimizing prices based on:\n• ${rule.strategy.charAt(0).toUpperCase() + rule.strategy.slice(1)} strategy\n• ${rule.priceAdjustment.value * 100}% discount adjustment\n${rule.conditions.inventoryAge ? '• Inventory age monitoring\n' : ''}${rule.conditions.competitorPrice ? '• Competitor price tracking\n' : ''}${rule.conditions.timeRange ? '• Time-based pricing\n' : ''}${rule.conditions.customerTier ? '• Customer tier pricing\n' : ''}\n\nMonitor performance in your [Pricing Dashboard](/dashboard/pricing).`,
            timestamp: new Date(),
        };
        addMessageToThread(thread.id, confirmationMessage);
        setPricingInitialPrompt('');
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
                            {!showQRGenerator && !showCarouselGenerator && !showHeroGenerator && !showBundleGenerator && !showSocialPostGenerator && !showPricingGenerator && (
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
                        </>
                    ) : (
                        <>
                            {thread.messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    agentPersona={thread.primaryAgent}
                                    artifacts={artifacts}
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
                                    isRunning={isSubmitting}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 bg-background">
                <div className="max-w-3xl mx-auto">
                    {/* Attachment Preview */}
                    {attachments.length > 0 && (
                        <div className="mb-3">
                            <AttachmentPreviewList
                                attachments={attachments}
                                onRemove={handleRemoveAttachment}
                            />
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Attachment button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting || isPending}
                            title="Attach files (images, PDFs)"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>

                        <div className="flex-1 relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isPending
                                    ? 'Setting up conversation...'
                                    : `Message ${AGENT_NAMES[thread.primaryAgent]?.name || 'assistant'}...`
                                }
                                className="min-h-[44px] max-h-[200px] resize-none"
                                rows={1}
                                disabled={isSubmitting || isPending}
                            />
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={(!input.trim() && attachments.length === 0) || isSubmitting || isPending}
                            size="icon"
                            className="h-11 w-11"
                        >
                            {isSubmitting || isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {isPending
                            ? 'Preparing your conversation...'
                            : attachments.length > 0
                                ? `${attachments.length} file(s) attached. Press Enter to send.`
                                : 'Press Enter to send, Shift+Enter for new line. Use 📎 to attach files.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default InboxConversation;
