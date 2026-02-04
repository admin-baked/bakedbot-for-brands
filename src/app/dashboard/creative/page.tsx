"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Calendar as CalendarIcon,
  ChevronDown,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  LayoutGrid,
  Folder,
  MessageSquare,
  Bell,
  Settings,
  ChevronsUpDown,
  HelpCircle,
  ChevronRight,
  ArrowUpRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCreativeContent } from "@/hooks/use-creative-content";
import { toast } from "sonner";
import type { SocialPlatform } from "@/types/creative-content";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getMenuData } from "@/app/dashboard/menu/actions";
import { approveAtLevel, rejectAtLevel } from "@/server/actions/creative-content";
import { BarChart3, TrendingUp, QrCode } from "lucide-react";
import { EngagementAnalytics } from "@/components/creative/engagement-analytics";
import { ApprovalChain } from "@/components/creative/approval-chain";
import { useUser } from "@/firebase/auth/use-user";

// --- Types & Mock Data ---

interface GhostPost {
  id: string;
  imageUrl: string;
  brandName: string;
  avatarUrl: string;
}

const mockGhostPosts: GhostPost[] = [
  {
    id: "1",
    imageUrl: "https://source.unsplash.com/random/400x500/?cannabis,bud",
    brandName: "Your Brand",
    avatarUrl: "https://github.com/shadcn.png",
  },
  {
    id: "2",
    imageUrl: "https://source.unsplash.com/random/400x500/?cannabis,lifestyle",
    brandName: "Your Brand",
    avatarUrl: "https://github.com/shadcn.png",
  },
  {
    id: "3",
    imageUrl: "https://source.unsplash.com/random/400x500/?cannabis,plant",
    brandName: "Your Brand",
    avatarUrl: "https://github.com/shadcn.png",
  },
];

interface ChatMessage {
  id: string;
  sender: {
    name: string;
    avatarUrl: string;
    role: string;
  };
  content: React.ReactNode;
  timestamp: string;
  type: "text" | "image_generation";
}

const mockChatHistory: ChatMessage[] = [
  {
    id: "1",
    sender: {
      name: "Craig",
      avatarUrl: "/avatars/craig.png",
      role: "The Marketer",
    },
    content: (
      <div className="space-y-3">
        <p>
          Here&apos;s a draft for your campaign. How does this sound?
        </p>
        <div className="bg-background p-3 rounded-md border border-border text-sm">
          "Weekend unwind with Sunset Sherbet, focusing on citrus terpenes."
        </div>
        <Textarea
          placeholder="Revision request..."
          className="bg-background border-border resize-none h-20 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
        />
      </div>
    ),
    timestamp: "2h",
    type: "text",
  },
  {
    id: "2",
    sender: {
      name: "Pinky",
      avatarUrl: "/avatars/pinky.png",
      role: "The Visual Artist",
    },
    content: (
      <div className="space-y-3">
        <p>Generated 4K images</p>
        <div className="grid grid-cols-2 gap-2">
          <img
            src="https://source.unsplash.com/random/300x300/?cannabis,flower,macro"
            alt="Generated 1"
            className="rounded-md object-cover aspect-square border border-border"
          />
          <img
            src="https://source.unsplash.com/random/300x300/?cannabis,terpenes"
            alt="Generated 2"
            className="rounded-md object-cover aspect-square border border-border"
          />
        </div>
        <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-white hover:bg-muted">
          Generate More
        </Button>
      </div>
    ),
    timestamp: "",
    type: "image_generation",
  },
];

// --- Components ---

interface TheGridProps {
  selectedPlatform: SocialPlatform;
}

const TheGrid = ({ selectedPlatform }: TheGridProps) => {
  // Fetch published and scheduled content for The Grid
  const { content: publishedContent, loading: gridLoading } = useCreativeContent({
    platform: selectedPlatform,
    statusFilter: ["approved", "scheduled"],
    realtime: true,
    limit: 12,
  });

  return (
    <div className="w-80 border-r border-border flex flex-col h-full shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-border shrink-0 h-16">
        <h2 className="font-semibold text-lg">The Grid</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="p-4 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-medium text-muted-foreground">
          {publishedContent.length} Published
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-4 space-y-4 pb-4">
          {gridLoading ? (
            // Loading skeleton
            <AnimatePresence>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative rounded-lg overflow-hidden border border-border bg-card animate-pulse"
                >
                  <div className="w-full aspect-[4/5] bg-background" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-background/50" />
                    <div className="h-3 w-20 bg-background/50 rounded" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : publishedContent.length > 0 ? (
            <AnimatePresence>
              {publishedContent.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative group rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors"
                >
                  {post.mediaUrls && post.mediaUrls[0] ? (
                    <img
                      src={post.mediaUrls[0]}
                      alt={post.caption.substring(0, 50)}
                      className="w-full aspect-[4/5] object-cover"
                    />
                  ) : post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption.substring(0, 50)}
                      className="w-full aspect-[4/5] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[4/5] bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
                      <MessageSquare className="w-12 h-12 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-xs font-medium text-white/90 capitalize">
                          {post.status}
                        </span>
                      </div>
                      <span className="text-xs text-white/70">
                        {post.platform}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" className="h-8 w-8 bg-muted/80 hover:bg-muted text-white backdrop-blur-sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No published content yet</p>
              <p className="text-xs mt-1">Generate and approve content to see it here</p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// --- Main Page ---

export default function CreativeCommandCenter() {
  const router = useRouter();
  const { user } = useUser();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");

  // Form state
  const [campaignPrompt, setCampaignPrompt] = useState("");
  const [contentType, setContentType] = useState("social-post");
  const [tone, setTone] = useState("professional");
  const [menuItem, setMenuItem] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  // Caption editing state
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");

  // Campaign templates
  const campaignTemplates = [
    {
      label: "Product Launch",
      prompt: "Exciting new product launch! Highlighting unique features and benefits.",
      tone: "hype" as const,
    },
    {
      label: "Weekend Special",
      prompt: "Weekend unwind promotion focusing on relaxation and quality time.",
      tone: "professional" as const,
    },
    {
      label: "Educational",
      prompt: "Educational content about terpene profiles, effects, and proper usage.",
      tone: "educational" as const,
    },
    {
      label: "Event Promo",
      prompt: "Upcoming event announcement with details and registration information.",
      tone: "hype" as const,
    },
  ];

  // Hashtag suggestions
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

  // TheGrid toggle state
  const [showGrid, setShowGrid] = useState(false);

  // Menu items autocomplete
  const [menuItems, setMenuItems] = useState<Array<{ id: string; name: string; brandName?: string }>>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Fetch menu items on mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoadingMenu(true);
      try {
        const menuData = await getMenuData();
        const items = menuData.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          brandName: p.brandName || p.brand,
        }));
        setMenuItems(items);
      } catch (err) {
        console.error('[Creative] Failed to fetch menu items:', err);
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

  // Get the most recent content for display
  const currentContent = content[0] || null;

  // Handle content generation
  const handleGenerate = async () => {
    if (!campaignPrompt.trim()) {
      toast.error("Please enter a campaign description");
      return;
    }

    try {
      // Include selected hashtags in the prompt context
      const enhancedPrompt = selectedHashtags.length > 0
        ? `${campaignPrompt}\n\nSuggested hashtags: ${selectedHashtags.map(tag => `#${tag}`).join(' ')}`
        : campaignPrompt;

      const result = await generate({
        platform: selectedPlatform,
        prompt: enhancedPrompt,
        style: tone as any,
        includeHashtags: true,
        productName: menuItem || undefined,
        tier: "free",
      });

      if (result) {
        toast.success("Content generated! Craig & Pinky worked their magic ✨");
        // Clear selected hashtags after successful generation
        setSelectedHashtags([]);
      } else {
        toast.error("Failed to generate content. Please try again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred while generating content");
    }
  };

  // Handle approval
  const handleApprove = async () => {
    if (!currentContent) return;

    try {
      await approve(
        currentContent.id,
        date ? date.toISOString() : undefined
      );
      toast.success(date ? "Content scheduled for publishing!" : "Content approved and published!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve content");
    }
  };

  // Handle revision request
  const handleRevise = async () => {
    if (!currentContent || !revisionNote.trim()) {
      toast.error("Please enter revision notes");
      return;
    }

    try {
      await revise(currentContent.id, revisionNote);
      setRevisionNote("");
      toast.success("Revision request sent to Craig!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send revision request");
    }
  };

  // Handle accepting safe version from Deebo
  const handleAcceptSafeVersion = async () => {
    if (!currentContent) return;

    try {
      const safeCaption = "May help with relaxation."; // This would come from Deebo's suggestion in real implementation
      await editCaption(currentContent.id, safeCaption);
      toast.success("Safe version accepted! Caption updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept safe version");
    }
  };

  // Handle caption editing
  const handleStartEditCaption = () => {
    if (currentContent) {
      setEditedCaption(currentContent.caption);
      setIsEditingCaption(true);
    }
  };

  const handleSaveCaption = async () => {
    if (!currentContent || !editedCaption.trim()) return;

    await editCaption(currentContent.id, editedCaption);
    setIsEditingCaption(false);
    toast.success("Caption updated!");
  };

  const handleCancelEditCaption = () => {
    setIsEditingCaption(false);
    setEditedCaption("");
  };

  // Handle template selection
  const handleSelectTemplate = (template: typeof campaignTemplates[0]) => {
    setCampaignPrompt(template.prompt);
    setTone(template.tone);
    toast.success(`${template.label} template loaded!`);
  };

  // Handle hashtag toggle
  const handleToggleHashtag = (tag: string) => {
    setSelectedHashtags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        if (prev.length >= 10) {
          toast.error("Maximum 10 hashtags allowed");
          return prev;
        }
        return [...prev, tag];
      }
    });
  };

  // Clear all hashtags
  const handleClearHashtags = () => {
    setSelectedHashtags([]);
    toast.success("Hashtags cleared");
  };

  // Handle image upload
  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (validFiles.length !== fileArray.length) {
      toast.error("Some files were not images and were skipped");
    }

    if (uploadedImages.length + validFiles.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImages(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} uploaded`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    toast.success("Image removed");
  };

  // Handle batch mode toggle
  const handleToggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    if (!isBatchMode) {
      setBatchPlatforms(['instagram', 'tiktok', 'linkedin']);
      toast.success("Batch mode enabled - Generate for all platforms!");
    } else {
      setBatchPlatforms([]);
      toast.success("Batch mode disabled");
    }
  };

  const handleToggleBatchPlatform = (platform: SocialPlatform) => {
    setBatchPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  // Handle batch content generation
  const handleBatchGenerate = async () => {
    if (!campaignPrompt.trim()) {
      toast.error("Please enter a campaign description");
      return;
    }

    if (batchPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    toast.success(`Generating content for ${batchPlatforms.length} platforms...`);

    try {
      const promises = batchPlatforms.map(platform =>
        generate({
          platform,
          prompt: campaignPrompt,
          style: tone as any,
          includeHashtags: true,
          productName: menuItem || undefined,
          tier: "free",
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r !== null).length;

      toast.success(`Generated ${successCount}/${batchPlatforms.length} campaigns successfully!`);
      setSelectedHashtags([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate batch content");
    }
  };

  // Handle approval chain approve
  const handleApprovalChainApprove = async (notes: string) => {
    if (!currentContent || !user?.uid) return;

    const tenantId = (user as any)?.tenantId || (user as any)?.brandId;
    if (!tenantId) {
      toast.error("Unable to determine tenant ID");
      return;
    }

    const result = await approveAtLevel(
      currentContent.id,
      tenantId,
      user.uid,
      user.displayName || user.email || 'Unknown User',
      (user as any)?.role || 'user',
      notes
    );

    if (result.success) {
      toast.success("Content approved at this level!");
    } else {
      toast.error(result.error || "Failed to approve content");
    }
  };

  // Handle approval chain reject
  const handleApprovalChainReject = async (notes: string) => {
    if (!currentContent || !user?.uid) return;

    const tenantId = (user as any)?.tenantId || (user as any)?.brandId;
    if (!tenantId) {
      toast.error("Unable to determine tenant ID");
      return;
    }

    const result = await rejectAtLevel(
      currentContent.id,
      tenantId,
      user.uid,
      user.displayName || user.email || 'Unknown User',
      (user as any)?.role || 'user',
      notes
    );

    if (result.success) {
      toast.success("Content rejected and sent for revision");
    } else {
      toast.error(result.error || "Failed to reject content");
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground font-sans overflow-hidden rounded-lg border border-border">
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-muted/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div>
            <h1 className="text-xl font-semibold">Creative Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Centralize your cannabis lifestyle, mannerstyle, and imponants.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-sm text-primary font-medium">
                  {isGenerating ? "Craig & Pinky generating..." : "Agent Craig ready"}
                </span>
             </div>
            <Button
              onClick={handleToggleBatchMode}
              variant={isBatchMode ? "default" : "outline"}
              size="sm"
              className={cn(
                isBatchMode
                  ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  : "border-border text-muted-foreground hover:text-white hover:bg-muted"
              )}
            >
              {isBatchMode ? "Batch Mode ON" : "Batch Mode"}
            </Button>
            <Button
              onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
              disabled={isGenerating || !campaignPrompt.trim()}
              className="bg-primary hover:bg-primary-muted text-primary-foreground font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Create Content"
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Main Content Tabs & Layout */}
        <Tabs
          defaultValue="instagram"
          value={selectedPlatform}
          onValueChange={(value) => setSelectedPlatform(value as SocialPlatform)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b border-border shrink-0 flex items-center justify-between bg-muted/30">
            <TabsList className="bg-transparent p-0 h-12 gap-6">
              <TabsTrigger
                value="instagram"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium text-muted-foreground transition-all"
              >
                Instagram
              </TabsTrigger>
              <TabsTrigger
                value="tiktok"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium text-muted-foreground transition-all"
              >
                TikTok
              </TabsTrigger>
              <TabsTrigger
                value="linkedin"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium text-muted-foreground transition-all"
              >
                LinkedIn
              </TabsTrigger>
              <TabsTrigger
                value="hero-carousel"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-medium text-muted-foreground transition-all"
              >
                Hero Carousel
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  "h-8 gap-2 border-border hover:bg-muted",
                  showGrid ? "text-primary border-primary" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4"/>
                {showGrid ? "Hide" : "Show"} Grid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/inbox")}
                className="h-8 gap-2 border-border text-muted-foreground hover:text-white hover:bg-muted"
              >
                <MessageSquare className="w-4 h-4"/>
                Unified Inbox
              </Button>
            </div>
          </div>

          <TabsContent value="instagram" className="flex-1 flex overflow-hidden m-0 p-0 relative">
            {showGrid && <TheGrid selectedPlatform={selectedPlatform} />}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-auto">
                {/* Column 1: Prompt Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Prompt Input</h3>
                <Card className="bg-card border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      Campaign Idea
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Campaign Templates */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Quick Templates</label>
                      <div className="grid grid-cols-2 gap-2">
                        {campaignTemplates.map((template) => (
                          <Button
                            key={template.label}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectTemplate(template)}
                            className="h-auto py-2 px-3 border-border text-muted-foreground hover:text-white hover:bg-muted hover:border-primary/50 transition-colors text-xs"
                          >
                            {template.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Separator className="bg-border" />
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Rich text</label>
                        <Textarea
                        value={campaignPrompt}
                        onChange={(e) => setCampaignPrompt(e.target.value)}
                        placeholder="Describe your campaign... e.g., 'Weekend unwind with Sunset Sherbet, focusing on citrus terpenes.'"
                        className="bg-background border-border resize-none h-32 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="social-post" className="focus:bg-background focus:text-white cursor-pointer">Social Post</SelectItem>
                          <SelectItem value="blog" className="focus:bg-background focus:text-white cursor-pointer">Blog Article</SelectItem>
                          <SelectItem value="email" className="focus:bg-background focus:text-white cursor-pointer">Email Newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="professional" className="focus:bg-background focus:text-white cursor-pointer">Professional</SelectItem>
                          <SelectItem value="hype" className="focus:bg-background focus:text-white cursor-pointer">Hype / Energetic</SelectItem>
                          <SelectItem value="educational" className="focus:bg-background focus:text-white cursor-pointer">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hashtag Suggestions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                          Suggested Hashtags
                        </label>
                        {selectedHashtags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearHashtags}
                            className="h-6 text-xs text-muted-foreground hover:text-red-500"
                          >
                            Clear ({selectedHashtags.length})
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-24">
                        <div className="flex flex-wrap gap-2 pr-3">
                          {hashtagSuggestions[selectedPlatform].map(({ tag, category }) => {
                            const isSelected = selectedHashtags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleHashtag(tag)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                  "border hover:scale-105 active:scale-95",
                                  isSelected
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      {selectedHashtags.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selected: {selectedHashtags.map(tag => `#${tag}`).join(' ')}
                        </div>
                      )}
                    </div>

                     <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Menu Item Integration
                        {isLoadingMenu && <span className="ml-2 text-xs text-muted-foreground">(Loading...)</span>}
                      </label>
                      <Select value={menuItem} onValueChange={setMenuItem}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder={isLoadingMenu ? "Loading menu items..." : "Select a product (optional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground max-h-[300px]">
                          {menuItems.length === 0 && !isLoadingMenu ? (
                            <SelectItem value="none" disabled className="text-muted-foreground text-xs">
                              No products available
                            </SelectItem>
                          ) : (
                            menuItems.map(item => (
                              <SelectItem
                                key={item.id}
                                value={item.name}
                                className="focus:bg-background focus:text-white cursor-pointer"
                              >
                                {item.name}
                                {item.brandName && <span className="ml-2 text-xs text-muted-foreground">• {item.brandName}</span>}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Custom Images</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                          isDragging
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="image-upload"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {isDragging ? "Drop images here" : "Click or drag images here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadedImages.length}/10 images
                          </p>
                        </label>
                      </div>
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-20 object-cover rounded border border-border"
                              />
                              <button
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Batch Mode Platform Selection */}
                    {isBatchMode && (
                      <div className="space-y-2 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                        <label className="text-sm font-medium text-purple-400">Batch Platforms</label>
                        <div className="flex flex-wrap gap-2">
                          {(['instagram', 'tiktok', 'linkedin'] as SocialPlatform[]).map(platform => {
                            const isSelected = batchPlatforms.includes(platform);
                            return (
                              <button
                                key={platform}
                                onClick={() => handleToggleBatchPlatform(platform)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                                  isSelected
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : "bg-background border-border text-muted-foreground hover:border-purple-600/50"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                {platform}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-purple-300/70">
                          {batchPlatforms.length} platform{batchPlatforms.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
                      disabled={isGenerating || !campaignPrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Campaign with Craig & Pinky"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

               {/* Column 2: Deebo Compliance Shield */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Deebo Compliance Shield</h3>
                 <Card className="bg-card border-border shadow-none flex-1 flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <Avatar className="w-16 h-16 border-2 border-border z-10 relative">
                                <AvatarImage src="/avatars/deebo.png" />
                                <AvatarFallback>DB</AvatarFallback>
                            </Avatar>
                            {/* Scanning Effect */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red-500/50 rounded-lg overflow-hidden z-0">
                                <div className="w-full h-full bg-[url('https://source.unsplash.com/random/300x300/?cannabis')] bg-cover opacity-30 grayscale"></div>
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>

                        <div className="w-full space-y-3">
                            {currentContent && currentContent.complianceChecks && currentContent.complianceChecks.some(c => !c.passed) ? (
                              <>
                                {currentContent.complianceChecks.filter(c => !c.passed).map((check, idx) => (
                                  <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-red-500 flex items-center gap-1.5">
                                              <AlertTriangle className="w-4 h-4"/> {check.checkType.replace(/_/g, ' ').toUpperCase()}
                                          </span>
                                          <XCircle className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400"/>
                                      </div>
                                      <p className="text-foreground text-xs">{check.message}</p>
                                  </div>
                                ))}

                                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-primary flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4"/> Deebo's Safe Version
                                        </span>
                                    </div>
                                    <p className="text-foreground">"May help with relaxation."</p>
                                    <Button
                                      size="sm"
                                      onClick={handleAcceptSafeVersion}
                                      className="w-full bg-primary hover:bg-primary-muted text-primary-foreground font-semibold"
                                    >
                                        Accept Safe Version
                                    </Button>
                                </div>
                              </>
                            ) : currentContent ? (
                              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-primary"/>
                                      <span className="font-medium text-primary">All Checks Passed!</span>
                                  </div>
                                  <p className="text-muted-foreground text-xs mt-2">
                                    Content is compliant and ready for approval.
                                  </p>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground text-sm py-8">
                                Generate content to see compliance status
                              </div>
                            )}
                        </div>

                    </CardContent>
                </Card>
              </motion.div>

              {/* Column 3: Draft & Revision */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Draft & Revision</h3>
                <Card className="bg-card border-border shadow-none flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CardContent className="p-4 space-y-6">
                        {currentContent ? (
                          <AnimatePresence mode="wait">
                            {/* Craig's Caption */}
                            <motion.div
                              key="craig-caption"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex gap-3 group"
                            >
                              <Avatar className="w-10 h-10 border border-border shrink-0">
                                <AvatarFallback>C</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-baseline justify-between">
                                  <span className="font-semibold text-sm">Craig</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MoreHorizontal className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"/>
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-sm text-muted-foreground">
                                    Here&apos;s your campaign content:
                                  </p>
                                  {isEditingCaption ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editedCaption}
                                        onChange={(e) => setEditedCaption(e.target.value)}
                                        className="bg-background border-border resize-none h-32 text-sm focus-visible:ring-primary/50"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveCaption}
                                          className="flex-1 bg-primary hover:bg-primary-muted text-primary-foreground font-semibold"
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEditCaption}
                                          className="flex-1 border-border text-muted-foreground hover:text-white hover:bg-muted"
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={handleStartEditCaption}
                                      className="bg-background p-3 rounded-md border border-border text-sm hover:border-primary/50 cursor-pointer transition-colors group relative"
                                    >
                                      {currentContent.caption}
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-primary flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                          Edit
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {currentContent.hashtags && currentContent.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {currentContent.hashtags.map((tag, idx) => (
                                        <span key={idx} className="text-xs text-primary">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>

                            {/* Pinky's Images */}
                            {currentContent.mediaUrls && currentContent.mediaUrls.length > 0 && (
                              <motion.div
                                key="pinky-images"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex gap-3 group"
                              >
                                <Avatar className="w-10 h-10 border border-border shrink-0">
                                  <AvatarFallback className="bg-purple-600/20 text-purple-400">P</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-baseline justify-between">
                                    <span className="font-semibold text-sm">Pinky</span>
                                    <span className="text-xs text-muted-foreground">The Visual Artist</span>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                      Generated {currentContent.mediaUrls.length} visual{currentContent.mediaUrls.length > 1 ? 's' : ''}
                                    </p>
                                    <div className={cn(
                                      "grid gap-2",
                                      currentContent.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                      {currentContent.mediaUrls.map((url, idx) => (
                                        <motion.img
                                          key={idx}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: 0.2 + (idx * 0.1) }}
                                          src={url}
                                          alt={`Generated ${idx + 1}`}
                                          className="rounded-md object-cover aspect-square border border-border hover:border-primary/50 transition-colors cursor-pointer"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Revision Notes */}
                            {currentContent.revisionNotes && currentContent.revisionNotes.length > 0 && (
                              <motion.div
                                key="revision-notes"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  <span className="font-medium text-yellow-500 text-sm">Revision Requested</span>
                                </div>
                                {currentContent.revisionNotes.map((note, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    {note.note}
                                  </p>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-muted-foreground"
                          >
                            <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm">No draft content</p>
                            <p className="text-xs mt-1">Generate content to start the review process</p>
                          </motion.div>
                        )}
                        </CardContent>
                    </ScrollArea>
                     <div className="p-4 border-t border-border bg-background shrink-0">
                        <div className="space-y-3">
                          <Textarea
                            value={revisionNote}
                            onChange={(e) => setRevisionNote(e.target.value)}
                            placeholder="Request revisions or add feedback..."
                            className="bg-muted border-border resize-none h-20 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                          />
                          <Button
                            onClick={handleRevise}
                            disabled={!currentContent || !revisionNote.trim()}
                            variant="outline"
                            className="w-full border-border text-muted-foreground hover:text-white hover:bg-muted disabled:opacity-50"
                          >
                            Send Revision Request
                          </Button>
                        </div>
                     </div>
                </Card>
              </motion.div>

              {/* Column 4: HitL Approval & Publishing */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">HitL Approval & Publishing</h3>
                <div className="space-y-6 flex-1 flex flex-col">
                    {/* Approval Pipeline / Approval Chain */}
                    {currentContent?.approvalState ? (
                      <ApprovalChain
                        approvalState={currentContent.approvalState}
                        currentUserRole={(user as any)?.role}
                        currentUserId={user?.uid}
                        onApprove={handleApprovalChainApprove}
                        onReject={handleApprovalChainReject}
                      />
                    ) : (
                      <Card className="bg-card border-border shadow-none p-4 space-y-2">
                        <div className="bg-background border border-border rounded-md p-3 text-sm font-medium text-center text-muted-foreground">
                            Pending
                        </div>
                        <div className="flex justify-center text-muted-foreground"><ChevronDown className="w-4 h-4"/></div>
                         <div className="bg-background border border-border rounded-md p-3 text-sm font-medium text-center text-muted-foreground">
                            Under Revision
                        </div>
                         <div className="flex justify-center text-muted-foreground"><ChevronDown className="w-4 h-4"/></div>
                        <div className="bg-primary/10 border border-primary/30 rounded-md p-3 text-sm font-medium flex items-center justify-between text-primary">
                            <span>Approved by [User]</span>
                            <CheckCircle2 className="w-4 h-4 fill-primary text-primary-foreground"/>
                        </div>
                      </Card>
                    )}

                    {/* QR Code Analytics */}
                    {currentContent?.qrDataUrl && currentContent?.qrStats && (
                      <Card className="bg-card border-border shadow-none p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-purple-400" />
                              QR Analytics
                            </h4>
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                          </div>

                          {/* QR Code Preview */}
                          <div className="flex justify-center">
                            <img
                              src={currentContent.qrDataUrl}
                              alt="QR Code"
                              className="w-24 h-24 rounded-md border border-border"
                            />
                          </div>

                          {/* Scan Statistics */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-background rounded-md">
                              <span className="text-xs text-muted-foreground">Total Scans</span>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-primary" />
                                <span className="text-sm font-semibold text-primary">{currentContent.qrStats.scans || 0}</span>
                              </div>
                            </div>

                            {currentContent.qrStats.lastScanned && (
                              <div className="flex items-center justify-between p-2 bg-background rounded-md">
                                <span className="text-xs text-muted-foreground">Last Scanned</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(currentContent.qrStats.lastScanned).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            {currentContent.qrStats.scansByPlatform && Object.keys(currentContent.qrStats.scansByPlatform).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">By Platform</span>
                                {Object.entries(currentContent.qrStats.scansByPlatform).map(([platform, count]) => (
                                  <div key={platform} className="flex items-center justify-between p-1.5 bg-background/50 rounded text-xs">
                                    <span className="text-muted-foreground capitalize">{platform}</span>
                                    <span className="text-foreground font-medium">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {currentContent.contentUrl && (
                            <div className="pt-2 border-t border-border">
                              <a
                                href={currentContent.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 justify-center"
                              >
                                View Landing Page
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Engagement Analytics */}
                    {currentContent?.engagementMetrics && (
                      <EngagementAnalytics
                        metrics={currentContent.engagementMetrics}
                        platform={selectedPlatform}
                      />
                    )}

                     {/* Publishing Schedule */}
                    <Card className="bg-card border-border shadow-none flex-1 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">
                            Publishing Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between gap-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border border-border bg-background w-full flex justify-center p-3"
                                classNames={{
                                    head_cell: "text-muted-foreground font-normal text-[0.8rem]",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors text-foreground",
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                    day_today: "bg-border/50 text-foreground",
                                    nav_button: "border border-border hover:bg-muted hover:text-white transition-colors",
                                }}
                            />
                             <div className="space-y-3">
                                <Button
                                  onClick={handleApprove}
                                  disabled={!currentContent || isApproving !== null}
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {isApproving ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Approving...
                                      </>
                                    ) : date ? (
                                      "Schedule & Publish"
                                    ) : (
                                      "Approve & Publish"
                                    )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => router.push("/dashboard/inbox")}
                                  className="w-full border-border text-muted-foreground hover:text-white hover:bg-muted"
                                >
                                    View in Unified Inbox
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                </div>
              </motion.div>

            </div>
          </TabsContent>

          <TabsContent value="tiktok" className="flex-1 flex overflow-hidden m-0 p-0 relative">
            {showGrid && <TheGrid selectedPlatform={selectedPlatform} />}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-auto">
                {/* Column 1: Prompt Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Prompt Input</h3>
                <Card className="bg-card border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      Campaign Idea
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Rich text</label>
                        <Textarea
                        value={campaignPrompt}
                        onChange={(e) => setCampaignPrompt(e.target.value)}
                        placeholder="Describe your TikTok campaign... e.g., 'Quick tutorial on identifying quality flower.'"
                        className="bg-background border-border resize-none h-32 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="social-post" className="focus:bg-background focus:text-white cursor-pointer">Social Post</SelectItem>
                          <SelectItem value="blog" className="focus:bg-background focus:text-white cursor-pointer">Blog Article</SelectItem>
                          <SelectItem value="email" className="focus:bg-background focus:text-white cursor-pointer">Email Newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="professional" className="focus:bg-background focus:text-white cursor-pointer">Professional</SelectItem>
                          <SelectItem value="hype" className="focus:bg-background focus:text-white cursor-pointer">Hype / Energetic</SelectItem>
                          <SelectItem value="educational" className="focus:bg-background focus:text-white cursor-pointer">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hashtag Suggestions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                          Suggested Hashtags
                        </label>
                        {selectedHashtags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearHashtags}
                            className="h-6 text-xs text-muted-foreground hover:text-red-500"
                          >
                            Clear ({selectedHashtags.length})
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-24">
                        <div className="flex flex-wrap gap-2 pr-3">
                          {hashtagSuggestions[selectedPlatform].map(({ tag, category }) => {
                            const isSelected = selectedHashtags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleHashtag(tag)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                  "border hover:scale-105 active:scale-95",
                                  isSelected
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      {selectedHashtags.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selected: {selectedHashtags.map(tag => `#${tag}`).join(' ')}
                        </div>
                      )}
                    </div>

                     <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Menu Item Integration
                        {isLoadingMenu && <span className="ml-2 text-xs text-muted-foreground">(Loading...)</span>}
                      </label>
                      <Select value={menuItem} onValueChange={setMenuItem}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder={isLoadingMenu ? "Loading menu items..." : "Select a product (optional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground max-h-[300px]">
                          {menuItems.length === 0 && !isLoadingMenu ? (
                            <SelectItem value="none" disabled className="text-muted-foreground text-xs">
                              No products available
                            </SelectItem>
                          ) : (
                            menuItems.map(item => (
                              <SelectItem
                                key={item.id}
                                value={item.name}
                                className="focus:bg-background focus:text-white cursor-pointer"
                              >
                                {item.name}
                                {item.brandName && <span className="ml-2 text-xs text-muted-foreground">• {item.brandName}</span>}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Custom Images</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                          isDragging
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="image-upload"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {isDragging ? "Drop images here" : "Click or drag images here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadedImages.length}/10 images
                          </p>
                        </label>
                      </div>
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-20 object-cover rounded border border-border"
                              />
                              <button
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Batch Mode Platform Selection */}
                    {isBatchMode && (
                      <div className="space-y-2 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                        <label className="text-sm font-medium text-purple-400">Batch Platforms</label>
                        <div className="flex flex-wrap gap-2">
                          {(['instagram', 'tiktok', 'linkedin'] as SocialPlatform[]).map(platform => {
                            const isSelected = batchPlatforms.includes(platform);
                            return (
                              <button
                                key={platform}
                                onClick={() => handleToggleBatchPlatform(platform)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                                  isSelected
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : "bg-background border-border text-muted-foreground hover:border-purple-600/50"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                {platform}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-purple-300/70">
                          {batchPlatforms.length} platform{batchPlatforms.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
                      disabled={isGenerating || !campaignPrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Campaign with Craig & Pinky"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

               {/* Column 2: Deebo Compliance Shield */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Deebo Compliance Shield</h3>
                 <Card className="bg-card border-border shadow-none flex-1 flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <Avatar className="w-16 h-16 border-2 border-border z-10 relative">
                                <AvatarImage src="/avatars/deebo.png" />
                                <AvatarFallback>DB</AvatarFallback>
                            </Avatar>
                            {/* Scanning Effect */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red-500/50 rounded-lg overflow-hidden z-0">
                                <div className="w-full h-full bg-[url('https://source.unsplash.com/random/300x300/?cannabis')] bg-cover opacity-30 grayscale"></div>
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>

                        <div className="w-full space-y-3">
                            {currentContent && currentContent.complianceChecks && currentContent.complianceChecks.some(c => !c.passed) ? (
                              <>
                                {currentContent.complianceChecks.filter(c => !c.passed).map((check, idx) => (
                                  <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-red-500 flex items-center gap-1.5">
                                              <AlertTriangle className="w-4 h-4"/> {check.checkType.replace(/_/g, ' ').toUpperCase()}
                                          </span>
                                          <XCircle className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400"/>
                                      </div>
                                      <p className="text-foreground text-xs">{check.message}</p>
                                  </div>
                                ))}

                                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-primary flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4"/> Deebo's Safe Version
                                        </span>
                                    </div>
                                    <p className="text-foreground">"May help with relaxation."</p>
                                    <Button
                                      size="sm"
                                      onClick={handleAcceptSafeVersion}
                                      className="w-full bg-primary hover:bg-primary-muted text-primary-foreground font-semibold"
                                    >
                                        Accept Safe Version
                                    </Button>
                                </div>
                              </>
                            ) : currentContent ? (
                              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-primary"/>
                                      <span className="font-medium text-primary">All Checks Passed!</span>
                                  </div>
                                  <p className="text-muted-foreground text-xs mt-2">
                                    Content is compliant and ready for approval.
                                  </p>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground text-sm py-8">
                                Generate content to see compliance status
                              </div>
                            )}
                        </div>

                    </CardContent>
                </Card>
              </motion.div>

              {/* Column 3: Draft & Revision */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Draft & Revision</h3>
                <Card className="bg-card border-border shadow-none flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CardContent className="p-4 space-y-6">
                        {currentContent ? (
                          <AnimatePresence mode="wait">
                            {/* Craig's Caption */}
                            <motion.div
                              key="craig-caption"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex gap-3 group"
                            >
                              <Avatar className="w-10 h-10 border border-border shrink-0">
                                <AvatarFallback>C</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-baseline justify-between">
                                  <span className="font-semibold text-sm">Craig</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MoreHorizontal className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"/>
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  <p className="text-sm text-muted-foreground">
                                    Here&apos;s your campaign content:
                                  </p>
                                  {isEditingCaption ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={editedCaption}
                                        onChange={(e) => setEditedCaption(e.target.value)}
                                        className="bg-background border-border resize-none h-32 text-sm focus-visible:ring-primary/50"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveCaption}
                                          className="flex-1 bg-primary hover:bg-primary-muted text-primary-foreground font-semibold"
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEditCaption}
                                          className="flex-1 border-border text-muted-foreground hover:text-white hover:bg-muted"
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={handleStartEditCaption}
                                      className="bg-background p-3 rounded-md border border-border text-sm hover:border-primary/50 cursor-pointer transition-colors group relative"
                                    >
                                      {currentContent.caption}
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-primary flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                          Edit
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {currentContent.hashtags && currentContent.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {currentContent.hashtags.map((tag, idx) => (
                                        <span key={idx} className="text-xs text-primary">
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>

                            {/* Pinky's Images */}
                            {currentContent.mediaUrls && currentContent.mediaUrls.length > 0 && (
                              <motion.div
                                key="pinky-images"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex gap-3 group"
                              >
                                <Avatar className="w-10 h-10 border border-border shrink-0">
                                  <AvatarFallback className="bg-purple-600/20 text-purple-400">P</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-baseline justify-between">
                                    <span className="font-semibold text-sm">Pinky</span>
                                    <span className="text-xs text-muted-foreground">The Visual Artist</span>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                      Generated {currentContent.mediaUrls.length} visual{currentContent.mediaUrls.length > 1 ? 's' : ''}
                                    </p>
                                    <div className={cn(
                                      "grid gap-2",
                                      currentContent.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                      {currentContent.mediaUrls.map((url, idx) => (
                                        <motion.img
                                          key={idx}
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: 0.2 + (idx * 0.1) }}
                                          src={url}
                                          alt={`Generated ${idx + 1}`}
                                          className="rounded-md object-cover aspect-square border border-border hover:border-primary/50 transition-colors cursor-pointer"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Revision Notes */}
                            {currentContent.revisionNotes && currentContent.revisionNotes.length > 0 && (
                              <motion.div
                                key="revision-notes"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  <span className="font-medium text-yellow-500 text-sm">Revision Requested</span>
                                </div>
                                {currentContent.revisionNotes.map((note, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    {note.note}
                                  </p>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-muted-foreground"
                          >
                            <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm">No draft content</p>
                            <p className="text-xs mt-1">Generate content to start the review process</p>
                          </motion.div>
                        )}
                        </CardContent>
                    </ScrollArea>
                     <div className="p-4 border-t border-border bg-background shrink-0">
                        <div className="space-y-3">
                          <Textarea
                            value={revisionNote}
                            onChange={(e) => setRevisionNote(e.target.value)}
                            placeholder="Request revisions or add feedback..."
                            className="bg-muted border-border resize-none h-20 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                          />
                          <Button
                            onClick={handleRevise}
                            disabled={!currentContent || !revisionNote.trim()}
                            variant="outline"
                            className="w-full border-border text-muted-foreground hover:text-white hover:bg-muted disabled:opacity-50"
                          >
                            Send Revision Request
                          </Button>
                        </div>
                     </div>
                </Card>
              </motion.div>

              {/* Column 4: HitL Approval & Publishing */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">HitL Approval & Publishing</h3>
                <div className="space-y-6 flex-1 flex flex-col">
                    {/* Approval Pipeline / Approval Chain */}
                    {currentContent?.approvalState ? (
                      <ApprovalChain
                        approvalState={currentContent.approvalState}
                        currentUserRole={(user as any)?.role}
                        currentUserId={user?.uid}
                        onApprove={handleApprovalChainApprove}
                        onReject={handleApprovalChainReject}
                      />
                    ) : (
                      <Card className="bg-card border-border shadow-none p-4 space-y-2">
                        <div className="bg-background border border-border rounded-md p-3 text-sm font-medium text-center text-muted-foreground">
                            Pending
                        </div>
                        <div className="flex justify-center text-muted-foreground"><ChevronDown className="w-4 h-4"/></div>
                         <div className="bg-background border border-border rounded-md p-3 text-sm font-medium text-center text-muted-foreground">
                            Under Revision
                        </div>
                         <div className="flex justify-center text-muted-foreground"><ChevronDown className="w-4 h-4"/></div>
                        <div className="bg-primary/10 border border-primary/30 rounded-md p-3 text-sm font-medium flex items-center justify-between text-primary">
                            <span>Approved by [User]</span>
                            <CheckCircle2 className="w-4 h-4 fill-primary text-primary-foreground"/>
                        </div>
                      </Card>
                    )}

                    {/* QR Code Analytics */}
                    {currentContent?.qrDataUrl && currentContent?.qrStats && (
                      <Card className="bg-card border-border shadow-none p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-purple-400" />
                              QR Analytics
                            </h4>
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                          </div>

                          {/* QR Code Preview */}
                          <div className="flex justify-center">
                            <img
                              src={currentContent.qrDataUrl}
                              alt="QR Code"
                              className="w-24 h-24 rounded-md border border-border"
                            />
                          </div>

                          {/* Scan Statistics */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-background rounded-md">
                              <span className="text-xs text-muted-foreground">Total Scans</span>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-primary" />
                                <span className="text-sm font-semibold text-primary">{currentContent.qrStats.scans || 0}</span>
                              </div>
                            </div>

                            {currentContent.qrStats.lastScanned && (
                              <div className="flex items-center justify-between p-2 bg-background rounded-md">
                                <span className="text-xs text-muted-foreground">Last Scanned</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(currentContent.qrStats.lastScanned).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            {currentContent.qrStats.scansByPlatform && Object.keys(currentContent.qrStats.scansByPlatform).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">By Platform</span>
                                {Object.entries(currentContent.qrStats.scansByPlatform).map(([platform, count]) => (
                                  <div key={platform} className="flex items-center justify-between p-1.5 bg-background/50 rounded text-xs">
                                    <span className="text-muted-foreground capitalize">{platform}</span>
                                    <span className="text-foreground font-medium">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {currentContent.contentUrl && (
                            <div className="pt-2 border-t border-border">
                              <a
                                href={currentContent.contentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 justify-center"
                              >
                                View Landing Page
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Engagement Analytics */}
                    {currentContent?.engagementMetrics && (
                      <EngagementAnalytics
                        metrics={currentContent.engagementMetrics}
                        platform={selectedPlatform}
                      />
                    )}

                     {/* Publishing Schedule */}
                    <Card className="bg-card border-border shadow-none flex-1 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">
                            Publishing Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between gap-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border border-border bg-background w-full flex justify-center p-3"
                                classNames={{
                                    head_cell: "text-muted-foreground font-normal text-[0.8rem]",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors text-foreground",
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                    day_today: "bg-border/50 text-foreground",
                                    nav_button: "border border-border hover:bg-muted hover:text-white transition-colors",
                                }}
                            />
                             <div className="space-y-3">
                                <Button
                                  onClick={handleApprove}
                                  disabled={!currentContent || isApproving !== null}
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {isApproving ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Approving...
                                      </>
                                    ) : date ? (
                                      "Schedule & Publish"
                                    ) : (
                                      "Approve & Publish"
                                    )}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => router.push("/dashboard/inbox")}
                                  className="w-full border-border text-muted-foreground hover:text-white hover:bg-muted"
                                >
                                    View in Unified Inbox
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                </div>
              </motion.div>

            </div>
          </TabsContent>

          <TabsContent value="linkedin" className="flex-1 flex overflow-hidden m-0 p-0 relative">
            {showGrid && <TheGrid selectedPlatform={selectedPlatform} />}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-auto">
                {/* Same layout as Instagram/TikTok but with LinkedIn-specific placeholder */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex flex-col gap-6"
              >
                <h3 className="font-semibold text-lg">Prompt Input</h3>
                <Card className="bg-card border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      Campaign Idea
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Rich text</label>
                        <Textarea
                        value={campaignPrompt}
                        onChange={(e) => setCampaignPrompt(e.target.value)}
                        placeholder="Describe your LinkedIn campaign... e.g., 'Industry insights on terpene profiles and effects.'"
                        className="bg-background border-border resize-none h-32 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                        />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Content Type</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="social-post" className="focus:bg-background focus:text-white cursor-pointer">Social Post</SelectItem>
                          <SelectItem value="blog" className="focus:bg-background focus:text-white cursor-pointer">Blog Article</SelectItem>
                          <SelectItem value="email" className="focus:bg-background focus:text-white cursor-pointer">Email Newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground">
                          <SelectItem value="professional" className="focus:bg-background focus:text-white cursor-pointer">Professional</SelectItem>
                          <SelectItem value="hype" className="focus:bg-background focus:text-white cursor-pointer">Hype / Energetic</SelectItem>
                          <SelectItem value="educational" className="focus:bg-background focus:text-white cursor-pointer">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hashtag Suggestions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">
                          Suggested Hashtags
                        </label>
                        {selectedHashtags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearHashtags}
                            className="h-6 text-xs text-muted-foreground hover:text-red-500"
                          >
                            Clear ({selectedHashtags.length})
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="h-24">
                        <div className="flex flex-wrap gap-2 pr-3">
                          {hashtagSuggestions[selectedPlatform].map(({ tag, category }) => {
                            const isSelected = selectedHashtags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => handleToggleHashtag(tag)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                                  "border hover:scale-105 active:scale-95",
                                  isSelected
                                    ? "bg-primary/20 border-primary text-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-white"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      {selectedHashtags.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selected: {selectedHashtags.map(tag => `#${tag}`).join(' ')}
                        </div>
                      )}
                    </div>

                     <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Menu Item Integration
                        {isLoadingMenu && <span className="ml-2 text-xs text-muted-foreground">(Loading...)</span>}
                      </label>
                      <Select value={menuItem} onValueChange={setMenuItem}>
                        <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary/50">
                          <SelectValue placeholder={isLoadingMenu ? "Loading menu items..." : "Select a product (optional)"} />
                        </SelectTrigger>
                        <SelectContent className="bg-muted border-border text-foreground max-h-[300px]">
                          {menuItems.length === 0 && !isLoadingMenu ? (
                            <SelectItem value="none" disabled className="text-muted-foreground text-xs">
                              No products available
                            </SelectItem>
                          ) : (
                            menuItems.map(item => (
                              <SelectItem
                                key={item.id}
                                value={item.name}
                                className="focus:bg-background focus:text-white cursor-pointer"
                              >
                                {item.name}
                                {item.brandName && <span className="ml-2 text-xs text-muted-foreground">• {item.brandName}</span>}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Custom Images</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                          isDragging
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          id="image-upload"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {isDragging ? "Drop images here" : "Click or drag images here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {uploadedImages.length}/10 images
                          </p>
                        </label>
                      </div>
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={img}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-20 object-cover rounded border border-border"
                              />
                              <button
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Batch Mode Platform Selection */}
                    {isBatchMode && (
                      <div className="space-y-2 p-3 bg-purple-600/10 border border-purple-600/30 rounded-lg">
                        <label className="text-sm font-medium text-purple-400">Batch Platforms</label>
                        <div className="flex flex-wrap gap-2">
                          {(['instagram', 'tiktok', 'linkedin'] as SocialPlatform[]).map(platform => {
                            const isSelected = batchPlatforms.includes(platform);
                            return (
                              <button
                                key={platform}
                                onClick={() => handleToggleBatchPlatform(platform)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                                  isSelected
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : "bg-background border-border text-muted-foreground hover:border-purple-600/50"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                {platform}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-purple-300/70">
                          {batchPlatforms.length} platform{batchPlatforms.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
                      disabled={isGenerating || !campaignPrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Campaign with Craig & Pinky"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

               {/* Remaining columns same as above... */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex-1 text-center py-20 text-muted-foreground"
              >
                <p className="text-sm">LinkedIn content workflow coming soon</p>
                <p className="text-xs mt-2">Full layout similar to Instagram and TikTok</p>
              </motion.div>

            </div>
          </TabsContent>

          <TabsContent value="hero-carousel" className="flex-1 flex overflow-hidden m-0 p-0 relative">
            {showGrid && <TheGrid selectedPlatform={selectedPlatform} />}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex-1 text-center py-20 text-muted-foreground"
              >
                <p className="text-sm">Hero Carousel builder coming soon</p>
                <p className="text-xs mt-2">Create website banners and carousel content</p>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Help Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          className="bg-card border border-border rounded-full h-10 w-10 text-muted-foreground hover:text-white shadow-lg"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
