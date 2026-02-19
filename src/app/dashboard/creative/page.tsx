"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  LayoutGrid,
  MessageSquare,
  HelpCircle,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Palette,
  Upload,
  BarChart3,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCreativeContent } from "@/hooks/use-creative-content";
import { toast } from "sonner";
import type { SocialPlatform, GenerateContentRequest } from "@/types/creative-content";
import { useRouter } from "next/navigation";
import { getMenuData } from "@/app/dashboard/menu/actions";
import { logger } from "@/lib/logger";
import { approveAtLevel, rejectAtLevel } from "@/server/actions/creative-content";
import { EngagementAnalytics } from "@/components/creative/engagement-analytics";
import { useUser } from "@/firebase/auth/use-user";
import { DeeboCompliancePanel } from "./components/deebo-compliance-panel";
import { useBrandGuide, useBrandVoice, useBrandColors } from "@/hooks/use-brand-guide";
import { sendCreativeToInbox } from "@/server/actions/creative-inbox";
import { CreativeChatPanel } from "./components/creative-chat-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type for menu products
interface MenuProduct {
  id: string;
  name: string;
  brandName?: string;
  brand?: string;
}

// Valid creative style types
type CreativeStyle = NonNullable<GenerateContentRequest['style']>;

// Left panel sections
type LeftPanel = 'generate' | 'templates' | 'brandkit' | 'upload' | 'calendar' | 'analytics' | 'help';

// Feature flag: Gauntlet compliance verification system
const GAUNTLET_ENABLED = true;

// Left panel icon config
const LEFT_PANELS: { id: LeftPanel; icon: React.ElementType; label: string }[] = [
  { id: 'generate', icon: Sparkles, label: 'Generate' },
  { id: 'templates', icon: LayoutGrid, label: 'Templates' },
  { id: 'brandkit', icon: Palette, label: 'Brand Kit' },
  { id: 'upload', icon: Upload, label: 'Media' },
  { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'help', icon: HelpCircle, label: 'Help' },
];

// Platform aspect ratios for canvas preview
const PLATFORM_ASPECT: Record<SocialPlatform | string, string> = {
  instagram: 'aspect-[4/5]',
  tiktok: 'aspect-[9/16]',
  linkedin: 'aspect-[1.91/1]',
  twitter: 'aspect-square',
  facebook: 'aspect-[1.91/1]',
};

// --- Main Page ---

export default function CreativeCommandCenter() {
  const router = useRouter();
  const { user } = useUser();

  // Brand guide integration
  const brandId = (user as any)?.brandId || (user as any)?.orgId || '';
  const { brandGuide } = useBrandGuide(brandId);
  const brandVoiceData = useBrandVoice(brandGuide);
  const brandColors = useBrandColors(brandGuide);

  // Serialised brand voice string for Craig
  const brandVoiceString = brandVoiceData
    ? [
        brandVoiceData.tone ? `Tone: ${brandVoiceData.tone}` : '',
        brandVoiceData.personality?.length ? `Personality: ${brandVoiceData.personality.join(', ')}` : '',
        brandVoiceData.doWrite?.length ? `Do write: ${brandVoiceData.doWrite.join('; ')}` : '',
        brandVoiceData.dontWrite?.length ? `Don't write: ${brandVoiceData.dontWrite.join('; ')}` : '',
      ].filter(Boolean).join('\n')
    : undefined;

  // Generate panel mode: form or chat
  const [generateMode, setGenerateMode] = useState<'form' | 'chat'>('form');

  // Inbox draft badge state
  const [inboxDraft, setInboxDraft] = useState<{ threadId: string; artifactId: string } | null>(null);

  // Optimistic local content — shown immediately after generate() returns, even if the
  // Firestore real-time listener hasn't fired yet (handles permission/index edge cases).
  const [localContent, setLocalContent] = useState<import('@/types/creative-content').CreativeContent | null>(null);

  // Left panel state
  const [activeLeftPanel, setActiveLeftPanel] = useState<LeftPanel | null>('generate');

  // Platform state
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");

  // Form state
  const [campaignPrompt, setCampaignPrompt] = useState("");
  const [contentType, setContentType] = useState("social-post");
  const [tone, setTone] = useState<CreativeStyle>("professional");
  const [menuItem, setMenuItem] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  // Caption editing state
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");

  // Scheduling state
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Campaign templates
  const campaignTemplates = [
    { label: "Product Launch", prompt: "Exciting new product launch! Highlighting unique features and benefits.", tone: "hype" as const },
    { label: "Weekend Special", prompt: "Weekend unwind promotion focusing on relaxation and quality time.", tone: "professional" as const },
    { label: "Educational", prompt: "Educational content about terpene profiles, effects, and proper usage.", tone: "educational" as const },
    { label: "Event Promo", prompt: "Upcoming event announcement with details and registration information.", tone: "hype" as const },
  ];

  // Hashtag suggestions per platform
  const hashtagSuggestions: Record<SocialPlatform, Array<{ tag: string; category: string }>> = {
    instagram: [
      { tag: "cannabiscommunity", category: "Community" },
      { tag: "cannabisculture", category: "Community" },
      { tag: "cannabislifestyle", category: "Lifestyle" },
      { tag: "terpenes", category: "Education" },
      { tag: "cannabiseducation", category: "Education" },
      { tag: "plantsoverpills", category: "Wellness" },
      { tag: "cannabiswellness", category: "Wellness" },
      { tag: "420life", category: "Lifestyle" },
    ],
    tiktok: [
      { tag: "cannabistiktok", category: "Platform" },
      { tag: "cannabischeck", category: "Trending" },
      { tag: "cannabiseducation", category: "Education" },
      { tag: "terpenes", category: "Education" },
      { tag: "weedtok", category: "Platform" },
      { tag: "420", category: "Community" },
      { tag: "cannabislifestyle", category: "Lifestyle" },
    ],
    linkedin: [
      { tag: "cannabisindustry", category: "Industry" },
      { tag: "cannabisbusiness", category: "Business" },
      { tag: "cannabisregulation", category: "Compliance" },
      { tag: "cannabisinnovation", category: "Innovation" },
      { tag: "hempindustry", category: "Industry" },
      { tag: "cannabismarketing", category: "Business" },
    ],
    twitter: [
      { tag: "cannabis", category: "General" },
      { tag: "cannabiscommunity", category: "Community" },
      { tag: "cannabisnews", category: "News" },
      { tag: "420", category: "Community" },
      { tag: "cannabisreform", category: "Advocacy" },
      { tag: "legalcannabis", category: "Advocacy" },
    ],
    facebook: [
      { tag: "cannabis", category: "General" },
      { tag: "cannabiscommunity", category: "Community" },
      { tag: "cannabiseducation", category: "Education" },
      { tag: "cannabiswellness", category: "Wellness" },
      { tag: "plantsoverpills", category: "Wellness" },
    ],
  };

  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);

  // Batch mode state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchPlatforms, setBatchPlatforms] = useState<SocialPlatform[]>([]);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Menu items
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; brandName?: string }>>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Fetch menu items on mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoadingMenu(true);
      try {
        const menuData = await getMenuData();
        const items = menuData.products.map((p: MenuProduct) => ({
          id: p.id,
          name: p.name,
          brandName: p.brandName || p.brand,
        }));
        setMenuItems(items);
      } catch (err) {
        logger.error('[Creative] Failed to fetch menu items', { error: String(err) });
        setMenuItems([]);
      } finally {
        setIsLoadingMenu(false);
      }
    };
    fetchMenuItems();
  }, []);

  // Creative content hook
  const {
    content,
    loading,
    error,
    generate,
    approve,
    revise,
    editCaption,
    isGenerating,
    isApproving,
  } = useCreativeContent({
    platform: selectedPlatform,
    statusFilter: ["pending", "draft"],
    realtime: true,
  });

  // content[0] from Firestore listener takes precedence; fall back to optimistic local state
  const currentContent = content[0] || localContent || null;

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!campaignPrompt.trim()) { toast.error("Please enter a campaign description"); return; }
    try {
      const enhancedPrompt = selectedHashtags.length > 0
        ? `${campaignPrompt}\n\nSuggested hashtags: ${selectedHashtags.map(tag => `#${tag}`).join(' ')}`
        : campaignPrompt;
      const result = await generate({
        platform: selectedPlatform,
        prompt: enhancedPrompt,
        style: tone,
        includeHashtags: true,
        productName: menuItem || undefined,
        tier: "free",
        brandVoice: brandVoiceString,
        logoUrl: brandGuide?.visualIdentity?.logo?.primary,
      });
      if (result) {
        setLocalContent(result); // Show immediately — don't wait for Firestore listener
        toast.success("Content generated! Craig & Pinky worked their magic ✨");
        setSelectedHashtags([]);
        // Auto-draft to inbox (fire-and-forget)
        sendCreativeToInbox(result, selectedPlatform)
          .then(r => { if (r.success && r.threadId && r.artifactId) setInboxDraft({ threadId: r.threadId, artifactId: r.artifactId }); })
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred while generating content");
    }
  };

  const handleContentFromChat = (chatContent: { caption: string; hashtags: string[]; platform: SocialPlatform; mediaPrompt?: string }) => {
    // Populate form fields from chat-generated content so user can see/refine it on canvas
    setCampaignPrompt(chatContent.caption);
    setSelectedHashtags(chatContent.hashtags.map(h => h.replace(/^#/, '')).slice(0, 10));
    toast.success("Content loaded to canvas! Hit Generate to publish ✨");
    setGenerateMode('form');
  };

  const handleSendToInbox = async () => {
    if (!currentContent) { toast.error("Generate content first"); return; }
    const result = await sendCreativeToInbox(currentContent, selectedPlatform);
    if (result.success && result.threadId && result.artifactId) {
      setInboxDraft({ threadId: result.threadId, artifactId: result.artifactId });
      toast.success("Sent to Inbox! View it in your draft queue.");
    } else {
      toast.error(result.error || "Failed to send to Inbox");
    }
  };

  const handleApprove = async () => {
    if (!currentContent) return;
    try {
      await approve(currentContent.id, date ? date.toISOString() : undefined);
      toast.success(date ? "Content scheduled for publishing!" : "Content approved and published!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve content");
    }
  };

  const handleRevise = async () => {
    if (!currentContent || !revisionNote.trim()) { toast.error("Please enter revision notes"); return; }
    try {
      await revise(currentContent.id, revisionNote);
      setRevisionNote("");
      toast.success("Revision request sent to Craig!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send revision request");
    }
  };

  const handleAcceptSafeVersion = async () => {
    if (!currentContent) return;
    try {
      const safeCaption = "May help with relaxation.";
      await editCaption(currentContent.id, safeCaption);
      toast.success("Safe version accepted! Caption updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept safe version");
    }
  };

  const handleStartEditCaption = () => {
    if (currentContent) { setEditedCaption(currentContent.caption); setIsEditingCaption(true); }
  };

  const handleSaveCaption = async () => {
    if (!currentContent || !editedCaption.trim()) return;
    await editCaption(currentContent.id, editedCaption);
    setIsEditingCaption(false);
    toast.success("Caption updated!");
  };

  const handleCancelEditCaption = () => { setIsEditingCaption(false); setEditedCaption(""); };

  const handleSelectTemplate = (template: typeof campaignTemplates[0]) => {
    setCampaignPrompt(template.prompt);
    setTone(template.tone);
    toast.success(`${template.label} template loaded!`);
  };

  const handleToggleHashtag = (tag: string) => {
    setSelectedHashtags(prev => {
      if (prev.includes(tag)) return prev.filter(t => t !== tag);
      if (prev.length >= 10) { toast.error("Maximum 10 hashtags allowed"); return prev; }
      return [...prev, tag];
    });
  };

  const handleClearHashtags = () => { setSelectedHashtags([]); };

  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== fileArray.length) toast.error("Some files were not images and were skipped");
    if (uploadedImages.length + validFiles.length > 10) { toast.error("Maximum 10 images allowed"); return; }
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => { const dataUrl = e.target?.result as string; setUploadedImages(prev => [...prev, dataUrl]); };
      reader.readAsDataURL(file);
    });
    toast.success(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} uploaded`);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleImageUpload(e.dataTransfer.files); };
  const handleRemoveImage = (index: number) => { setUploadedImages(prev => prev.filter((_, i) => i !== index)); };

  const handleToggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    if (!isBatchMode) { setBatchPlatforms(['instagram', 'tiktok', 'linkedin']); toast.success("Batch mode enabled!"); }
    else { setBatchPlatforms([]); }
  };

  const handleToggleBatchPlatform = (platform: SocialPlatform) => {
    setBatchPlatforms(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
  };

  const handleBatchGenerate = async () => {
    if (!campaignPrompt.trim()) { toast.error("Please enter a campaign description"); return; }
    if (batchPlatforms.length === 0) { toast.error("Please select at least one platform"); return; }
    toast.success(`Generating content for ${batchPlatforms.length} platforms...`);
    try {
      const results = await Promise.all(
        batchPlatforms.map(platform => generate({ platform, prompt: campaignPrompt, style: tone, includeHashtags: true, productName: menuItem || undefined, tier: "free" }))
      );
      toast.success(`Generated ${results.filter(r => r !== null).length}/${batchPlatforms.length} campaigns!`);
      setSelectedHashtags([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate batch content");
    }
  };

  const handleApprovalChainApprove = async (notes: string) => {
    if (!currentContent || !user?.uid) return;
    const tenantId = (user as any)?.tenantId || (user as any)?.brandId;
    if (!tenantId) { toast.error("Unable to determine tenant ID"); return; }
    const result = await approveAtLevel(currentContent.id, tenantId, user.uid, user.displayName || user.email || 'Unknown User', (user as any)?.role || 'user', notes);
    if (result.success) toast.success("Content approved at this level!");
    else toast.error(result.error || "Failed to approve content");
  };

  const handleApprovalChainReject = async (notes: string) => {
    if (!currentContent || !user?.uid) return;
    const tenantId = (user as any)?.tenantId || (user as any)?.brandId;
    if (!tenantId) { toast.error("Unable to determine tenant ID"); return; }
    const result = await rejectAtLevel(currentContent.id, tenantId, user.uid, user.displayName || user.email || 'Unknown User', (user as any)?.role || 'user', notes);
    if (result.success) toast.success("Content rejected and sent for revision");
    else toast.error(result.error || "Failed to reject content");
  };

  // ─────────────────────────────────────────────
  //  RENDER — Canva-inspired 3-panel layout
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden rounded-lg border border-border">

      {/* ══ CANVA-STYLE TOP BAR ══ */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/90 backdrop-blur-sm z-20">
        {/* Left: Studio identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Creative Studio</p>
            <p className="text-[11px] text-muted-foreground truncate">Powered by Craig &amp; Pinky</p>
          </div>
        </div>

        {/* Center: Platform selector pills */}
        <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg p-1">
          {(['instagram', 'tiktok', 'linkedin', 'facebook'] as SocialPlatform[]).map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                selectedPlatform === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Right: Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Inbox badge — appears after auto-draft */}
          {inboxDraft && (
            <button
              onClick={() => router.push(`/dashboard/inbox?threadId=${inboxDraft.threadId}`)}
              className="hidden sm:flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> View in Inbox
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", isGenerating ? "bg-yellow-500 animate-pulse" : "bg-green-500")} />
            <span className="text-xs text-muted-foreground">
              {isGenerating ? "Generating..." : "Craig ready"}
            </span>
          </div>

          <Button
            variant={isBatchMode ? "default" : "ghost"}
            size="sm"
            onClick={handleToggleBatchMode}
            className={cn(
              "h-8 text-xs font-medium",
              isBatchMode ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Batch
          </Button>

          <Button
            size="sm"
            onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
            disabled={isGenerating || !campaignPrompt.trim()}
            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Generate</>
            )}
          </Button>

          {/* Publish dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={!currentContent || isApproving !== null}
                className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold gap-1 disabled:opacity-40"
                title={!currentContent ? "Generate content first" : ""}
              >
                <Send className="w-3.5 h-3.5" />
                {date ? "Schedule" : "Publish"}
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleApprove}>
                <Send className="w-3.5 h-3.5 mr-2 text-green-500" />
                {date ? "Schedule" : "Publish Now"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendToInbox}>
                <ArrowUpRight className="w-3.5 h-3.5 mr-2 text-primary" />
                Send to Inbox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ══ MAIN 3-PANEL WORKSPACE ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT ICON STRIP (56px) ── */}
        <aside className="w-14 border-r border-border flex flex-col items-center pt-3 pb-2 gap-1 bg-muted/20 shrink-0">
          {LEFT_PANELS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveLeftPanel(activeLeftPanel === id ? null : id)}
              title={label}
              className={cn(
                "w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all",
                activeLeftPanel === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px] font-medium leading-none">{label}</span>
            </button>
          ))}
        </aside>

        {/* ── LEFT EXPANDABLE PANEL (slides in) ── */}
        <AnimatePresence mode="wait">
          {activeLeftPanel && (
            <motion.div
              key={activeLeftPanel}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="border-r border-border bg-card overflow-hidden shrink-0"
            >
              <div className="w-[280px] h-full flex flex-col">

                {/* ╌ Panel: AI Generate ╌ */}
                {activeLeftPanel === 'generate' && (
                  <div className="flex flex-col h-full min-h-0">
                    {/* Header + mode toggle */}
                    <div className="p-4 pb-3 border-b border-border shrink-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">AI Generate</h3>
                      </div>
                      {/* Form / Chat pill toggle */}
                      <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
                        {(['form', 'chat'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setGenerateMode(m)}
                            className={cn(
                              "flex-1 text-xs py-1.5 rounded-md font-medium transition-all",
                              generateMode === m
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {m === 'form' ? '⚡ Form' : '💬 Chat'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat mode */}
                    {generateMode === 'chat' && (
                      <div className="flex-1 min-h-0">
                        <CreativeChatPanel
                          platform={selectedPlatform}
                          brandVoice={brandVoiceString}
                          brandColors={brandColors ?? undefined}
                          onContentFromChat={handleContentFromChat}
                        />
                      </div>
                    )}

                    {/* Form mode */}
                    {generateMode === 'form' && (
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">

                      {/* Quick templates */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Quick Templates
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {campaignTemplates.map(t => (
                            <button
                              key={t.label}
                              onClick={() => handleSelectTemplate(t)}
                              className="px-2 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/40 transition-all text-left leading-tight"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Campaign prompt */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campaign Idea</label>
                        <Textarea
                          value={campaignPrompt}
                          onChange={e => setCampaignPrompt(e.target.value)}
                          placeholder="Describe your campaign idea..."
                          className="bg-background border-border resize-none h-28 text-xs placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                        />
                      </div>

                      {/* Type + Tone */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                          <Select value={contentType} onValueChange={setContentType}>
                            <SelectTrigger className="h-8 text-xs bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-muted border-border text-foreground">
                              <SelectItem value="social-post">Social Post</SelectItem>
                              <SelectItem value="blog">Blog</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tone</label>
                          <Select value={tone} onValueChange={v => setTone(v as CreativeStyle)}>
                            <SelectTrigger className="h-8 text-xs bg-background border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-muted border-border text-foreground">
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="hype">Hype</SelectItem>
                              <SelectItem value="educational">Educational</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hashtags</label>
                          {selectedHashtags.length > 0 && (
                            <button onClick={handleClearHashtags} className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors">
                              Clear {selectedHashtags.length}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {hashtagSuggestions[selectedPlatform]?.map(({ tag }) => {
                            const isSelected = selectedHashtags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleHashtag(tag)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all",
                                  isSelected
                                    ? "bg-primary/15 border-primary text-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                        {selectedHashtags.length > 0 && (
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {selectedHashtags.map(t => `#${t}`).join(' ')}
                          </p>
                        )}
                      </div>

                      {/* Product */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Product</label>
                        <Select value={menuItem} onValueChange={setMenuItem}>
                          <SelectTrigger className="h-8 text-xs bg-background border-border">
                            <SelectValue placeholder={isLoadingMenu ? "Loading..." : "Select product (optional)"} />
                          </SelectTrigger>
                          <SelectContent className="bg-muted border-border text-foreground max-h-48">
                            {menuItems.map(item => (
                              <SelectItem key={item.id} value={item.name} className="text-xs">
                                {item.name}
                                {item.brandName && <span className="ml-1.5 text-muted-foreground">· {item.brandName}</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Batch platforms (visible when batch mode on) */}
                      {isBatchMode && (
                        <div className="p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg space-y-2">
                          <label className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Batch Platforms</label>
                          <div className="flex flex-wrap gap-1.5">
                            {(['instagram', 'tiktok', 'linkedin'] as SocialPlatform[]).map(p => (
                              <button
                                key={p}
                                onClick={() => handleToggleBatchPlatform(p)}
                                className={cn(
                                  "px-2.5 py-1 rounded-md text-xs border capitalize transition-all",
                                  batchPlatforms.includes(p)
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : "bg-background border-border text-muted-foreground hover:border-purple-400",
                                )}
                              >
                                {batchPlatforms.includes(p) && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />}
                                {p}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-purple-300/70">{batchPlatforms.length} platform{batchPlatforms.length !== 1 ? 's' : ''} selected</p>
                        </div>
                      )}

                      {/* CTA */}
                      <Button
                        onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
                        disabled={isGenerating || !campaignPrompt.trim()}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate with Craig</>
                        )}
                      </Button>
                    </div>
                  </ScrollArea>
                    )}
                  </div>
                )}

                {/* ╌ Panel: Templates ╌ */}
                {activeLeftPanel === 'templates' && (
                  <div className="flex flex-col h-full">
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Templates</h3>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                          placeholder="Search templates..."
                        />
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recently Used</p>
                          <div className="grid grid-cols-2 gap-2">
                            {campaignTemplates.map(t => (
                              <div
                                key={t.label}
                                onClick={() => handleSelectTemplate(t)}
                                className="aspect-square rounded-xl bg-gradient-to-br from-primary/20 to-muted border border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all group p-2"
                              >
                                <Sparkles className="w-6 h-6 text-primary/50 group-hover:text-primary transition-colors mb-1.5" />
                                <span className="text-[10px] text-muted-foreground text-center leading-tight font-medium">{t.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Templates</p>
                          <p className="text-xs text-muted-foreground text-center py-4">More templates coming soon</p>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* ╌ Panel: Brand Kit ╌ */}
                {activeLeftPanel === 'brandkit' && (
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Brand Kit</h3>
                      </div>

                      {!brandGuide ? (
                        <div className="border border-dashed border-border rounded-xl p-6 text-center space-y-2">
                          <Palette className="w-6 h-6 mx-auto text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground">No brand guide found. Set one up in Settings → Brand to unlock live colors, voice, and logo here.</p>
                        </div>
                      ) : (
                        <>
                          {/* Logo */}
                          {brandGuide.visualIdentity?.logo?.primary && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Logo</label>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={brandGuide.visualIdentity.logo.primary} alt="Brand logo" className="h-12 object-contain rounded-lg border border-border p-1 bg-muted/30" />
                            </div>
                          )}

                          {/* Colors */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brand Colors</label>
                            <div className="flex flex-wrap gap-2">
                              {brandColors && Object.entries(brandColors).map(([key, hex]) => hex ? (
                                <div key={key} className="flex flex-col items-center gap-1">
                                  <div
                                    className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                                    style={{ backgroundColor: hex }}
                                    title={`${key}: ${hex}`}
                                  />
                                  <span className="text-[8px] text-muted-foreground capitalize">{key}</span>
                                </div>
                              ) : null)}
                            </div>
                          </div>

                          {/* Voice */}
                          {brandVoiceData && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brand Voice</label>
                              {brandVoiceData.tone && (
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20 capitalize">
                                  {brandVoiceData.tone}
                                </div>
                              )}
                              {brandVoiceData.personality && brandVoiceData.personality.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {brandVoiceData.personality.map((trait: string) => (
                                    <span key={trait} className="px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground capitalize">
                                      {trait}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tagline */}
                          {brandGuide.messaging?.tagline && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tagline</label>
                              <p className="text-xs text-foreground italic leading-snug">"{brandGuide.messaging.tagline}"</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {/* ╌ Panel: Upload ╌ */}
                {activeLeftPanel === 'upload' && (
                  <div className="p-4 space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Upload Files</h3>
                    </div>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/20",
                      )}
                    >
                      <input type="file" accept="image/*" multiple className="hidden" id="image-upload-panel" onChange={e => handleImageUpload(e.target.files)} />
                      <label htmlFor="image-upload-panel" className="cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Plus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{isDragging ? "Drop here!" : "Upload files"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">or drag and drop</p>
                        </div>
                      </label>
                    </div>
                    {uploadedImages.length > 0 && (
                      <div className="space-y-2 flex-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Your Uploads ({uploadedImages.length}/10)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border border-border" />
                              <button
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ╌ Panel: Calendar ╌ */}
                {activeLeftPanel === 'calendar' && (
                  <div className="p-4 space-y-3 flex flex-col">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Content Calendar</h3>
                    </div>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-xl border border-border bg-background w-full p-3"
                      classNames={{
                        head_cell: "text-muted-foreground font-normal text-[0.7rem]",
                        cell: "text-center text-sm p-0 relative",
                        day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors text-foreground text-xs",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        day_today: "bg-border/50 text-foreground",
                        nav_button: "border border-border hover:bg-muted transition-colors h-6 w-6",
                      }}
                    />
                    {date && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Scheduled: <span className="text-foreground font-medium">
                            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ╌ Panel: Analytics ╌ */}
                {activeLeftPanel === 'analytics' && (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Analytics</h3>
                    </div>
                    {currentContent?.engagementMetrics ? (
                      <EngagementAnalytics metrics={currentContent.engagementMetrics} platform={selectedPlatform} />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No analytics yet</p>
                        <p className="text-xs mt-1">Publish content to see engagement stats</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ╌ Panel: Help ╌ */}
                {activeLeftPanel === 'help' && (
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">Help &amp; Shortcuts</h3>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workflow</p>
                        {[
                          ['1', 'Open Generate panel (left strip)'],
                          ['2', 'Describe your campaign idea'],
                          ['3', 'Click Generate with Craig'],
                          ['4', 'Review Deebo compliance (right rail)'],
                          ['5', 'Hit Publish or Schedule'],
                        ].map(([step, desc]) => (
                          <div key={step} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {step}
                            </div>
                            <span className="text-xs text-muted-foreground leading-tight">{desc}</span>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Deebo Compliance</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Deebo automatically reviews all content against NY OCM regulations. Green = cleared. Amber = caution. Red = flagged and must be revised.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CENTER CANVAS ── */}
        <main className="flex-1 flex flex-col items-center justify-start overflow-auto bg-muted/10 p-6">

          {/* Format pills */}
          <div className="flex items-center gap-1.5 mb-6 flex-wrap justify-center">
            {['Post', 'Story', 'Reel', 'Carousel'].map(fmt => (
              <button
                key={fmt}
                className="px-3 py-1 text-xs rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Canvas frame — platform-aware aspect ratio */}
          <motion.div
            key={currentContent?.id ?? 'empty'}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "relative rounded-2xl overflow-hidden border-2 border-border shadow-2xl bg-card w-full max-w-[320px]",
              PLATFORM_ASPECT[selectedPlatform] ?? "aspect-square",
            )}
          >
            {isGenerating ? (
              /* Generating state */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-semibold">Craig &amp; Pinky are working...</p>
                  <p className="text-xs text-muted-foreground mt-1">Crafting your campaign content</p>
                </div>
              </div>

            ) : currentContent ? (
              <>
                {/* Media */}
                {currentContent.mediaUrls?.[0] ? (
                  <img src={currentContent.mediaUrls[0]} alt="Generated content" className="w-full h-full object-cover" />
                ) : currentContent.thumbnailUrl ? (
                  <img src={currentContent.thumbnailUrl} alt="Generated content" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-muted flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-primary/20" />
                  </div>
                )}

                {/* Caption overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
                  {isEditingCaption ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedCaption}
                        onChange={e => setEditedCaption(e.target.value)}
                        className="bg-black/60 border-white/20 text-white text-xs resize-none h-24 backdrop-blur-sm focus-visible:ring-white/30"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveCaption} className="flex-1 h-7 text-xs bg-primary">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEditCaption} className="flex-1 h-7 text-xs border-white/20 text-white bg-transparent hover:bg-white/10">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="cursor-pointer group" onClick={handleStartEditCaption}>
                      <p className="text-white text-xs leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                        {currentContent.caption}
                      </p>
                      <p className="text-white/40 text-[10px] mt-1 group-hover:text-white/60 flex items-center gap-1 transition-colors">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Click to edit
                      </p>
                    </div>
                  )}
                </div>

                {/* Platform badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm capitalize tracking-wide">
                    {selectedPlatform}
                  </span>
                </div>

                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize backdrop-blur-sm",
                    currentContent.status === 'approved' ? "bg-green-500/80 text-white" :
                    currentContent.status === 'failed' ? "bg-red-500/80 text-white" :
                    "bg-yellow-500/80 text-white",
                  )}>
                    {currentContent.status}
                  </span>
                </div>
              </>

            ) : (
              /* Empty state */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/40" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-semibold">Start creating</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[180px]">
                    Open the Generate panel, describe your idea, and hit Generate
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveLeftPanel('generate')}
                  className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Open Generate
                </Button>
              </div>
            )}
          </motion.div>

          {/* Hashtag chips below canvas */}
          <AnimatePresence>
            {currentContent?.hashtags && currentContent.hashtags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-1.5 mt-4 max-w-[320px] justify-center"
              >
                {currentContent.hashtags.slice(0, 10).map((tag, idx) => (
                  <span key={idx} className="text-xs text-primary/60 hover:text-primary transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Revision input row */}
          <AnimatePresence>
            {currentContent && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-[320px] mt-4 space-y-2"
              >
                {/* Revision notes display */}
                {currentContent.revisionNotes && currentContent.revisionNotes.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-yellow-500">Revision Requested</p>
                      {currentContent.revisionNotes.map((note, idx) => (
                        <p key={idx} className="text-[11px] text-muted-foreground mt-0.5">{note.note}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revision input */}
                <div className="flex gap-2">
                  <Textarea
                    value={revisionNote}
                    onChange={e => setRevisionNote(e.target.value)}
                    placeholder="Ask Craig to revise..."
                    className="bg-background border-border resize-none h-9 text-xs flex-1 py-2 min-h-0"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevise}
                    disabled={!revisionNote.trim()}
                    className="h-9 border-border text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    title="Send revision to Craig"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ── RIGHT PANEL: Deebo + Schedule + Assets ── */}
        <DeeboCompliancePanel
          content={currentContent}
          currentUserRole={(user as any)?.role}
          currentUserId={user?.uid}
          onAcceptSafeVersion={handleAcceptSafeVersion}
          onApprove={handleApprovalChainApprove}
          onReject={handleApprovalChainReject}
          date={date}
          onDateChange={setDate}
          onScheduleApprove={handleApprove}
          onSendToInbox={handleSendToInbox}
          isApproving={isApproving}
          gauntletEnabled={GAUNTLET_ENABLED}
        />

      </div>
    </div>
  );
}
