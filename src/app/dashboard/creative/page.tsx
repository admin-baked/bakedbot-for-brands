"use client";

import React, { useState } from "react";
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
        <div className="bg-baked-darkest p-3 rounded-md border border-baked-border text-sm">
          "Weekend unwind with Sunset Sherbet, focusing on citrus terpenes."
        </div>
        <Textarea
          placeholder="Revision request..."
          className="bg-baked-darkest border-baked-border resize-none h-20 text-sm placeholder:text-baked-text-muted/50 focus-visible:ring-baked-green/50"
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
            className="rounded-md object-cover aspect-square border border-baked-border"
          />
          <img
            src="https://source.unsplash.com/random/300x300/?cannabis,terpenes"
            alt="Generated 2"
            className="rounded-md object-cover aspect-square border border-baked-border"
          />
        </div>
        <Button variant="outline" className="w-full border-baked-border text-baked-text-secondary hover:text-white hover:bg-baked-dark">
          Generate More
        </Button>
      </div>
    ),
    timestamp: "",
    type: "image_generation",
  },
];

// --- Components ---

const Sidebar = () => (
  <div className="w-64 bg-baked-darkest border-r border-baked-border flex flex-col h-full shrink-0">
    <div className="p-4 flex items-center gap-2 mb-6">
      <div className="w-8 h-8 bg-baked-green rounded-lg flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-baked-darkest"
        >
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a4.5 4.5 0 110-9 4.5 4.5 0 010 9zM3 12a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 12zM6.166 5.106a.75.75 0 00-1.06 1.06l1.591 1.59a.75.75 0 101.06-1.061l-1.59-1.591zM5.106 17.834a.75.75 0 001.06 1.06l1.59-1.591a.75.75 0 10-1.061 1.06l-1.59 1.591z" />
        </svg>
      </div>
      <span className="font-semibold text-lg tracking-tight">BakedBot.ai</span>
      <Button variant="ghost" size="icon" className="ml-auto text-baked-text-muted hover:text-white hidden lg:flex">
        <ChevronLeft className="w-5 h-5" />
      </Button>
    </div>
    <nav className="flex-1 space-y-1 px-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-baked-text-secondary hover:bg-baked-dark hover:text-white transition-colors group"
      >
        <LayoutGrid className="w-5 h-5 group-hover:text-baked-green transition-colors" />
        Dashboard
      </Link>
      <Link
        href="/projects"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-baked-text-secondary hover:bg-baked-dark hover:text-white transition-colors group"
      >
        <Folder className="w-5 h-5 group-hover:text-baked-green transition-colors" />
        Projects
      </Link>
      <Link
        href="/chats"
        className="flex items-center gap-3 px-3 py-2 rounded-md bg-baked-dark text-white font-medium transition-colors group"
      >
        <MessageSquare className="w-5 h-5 text-baked-green" />
        AI Chats
      </Link>
      <Link
        href="/notifications"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-baked-text-secondary hover:bg-baked-dark hover:text-white transition-colors group"
      >
        <Bell className="w-5 h-5 group-hover:text-baked-green transition-colors" />
        Notifications
      </Link>
      <Link
        href="/settings"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-baked-text-secondary hover:bg-baked-dark hover:text-white transition-colors group"
      >
        <Settings className="w-5 h-5 group-hover:text-baked-green transition-colors" />
        Settings
      </Link>
    </nav>
    <div className="p-4 border-t border-baked-border space-y-4">
      <Link
        href="/settings/team"
        className="flex items-center justify-between px-3 py-2 rounded-md text-baked-text-secondary hover:bg-baked-dark hover:text-white transition-colors group"
      >
        <span className="flex items-center gap-3">
          <Settings className="w-5 h-5 group-hover:text-baked-green transition-colors" />
          Settings
        </span>
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
          1
        </span>
      </Link>
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>TR</AvatarFallback>
          </Avatar>
          <span className="text-sm text-baked-text-secondary">
            Tractinghan
          </span>
        </div>
        <div className="flex items-center gap-3 px-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>AN</AvatarFallback>
          </Avatar>
          <span className="text-sm text-baked-text-secondary">Anis</span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-2 hover:bg-baked-dark group h-auto py-2"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-baked-border">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>BB</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium group-hover:text-white transition-colors text-sm">
                  BakedBot.ai
                </span>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-baked-text-secondary group-hover:text-white transition-colors" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-baked-dark border-baked-border text-baked-text-primary"
        >
          <DropdownMenuItem className="focus:bg-baked-darkest focus:text-white cursor-pointer">
            Switch Workspace
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:bg-baked-darkest focus:text-white cursor-pointer">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

const TheGrid = () => (
  <div className="w-80 border-r border-baked-border flex flex-col h-full shrink-0">
    <div className="p-4 flex items-center justify-between border-b border-baked-border shrink-0 h-16">
      <h2 className="font-semibold text-lg">The Grid</h2>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-baked-text-muted hover:text-white">
          <LayoutGrid className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-baked-text-muted hover:text-white">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div className="p-4 flex items-center justify-between shrink-0">
      <h3 className="text-sm font-medium text-baked-text-secondary">Ghost Posts</h3>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-baked-text-muted hover:text-white">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </div>
    <ScrollArea className="flex-1">
      <div className="px-4 space-y-4 pb-4">
        {mockGhostPosts.map((post) => (
          <div key={post.id} className="relative group rounded-lg overflow-hidden border border-baked-border">
            <img
              src={post.imageUrl}
              alt="Ghost Post"
              className="w-full aspect-[4/5] object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-white/20">
                <AvatarImage src={post.avatarUrl} />
                <AvatarFallback>
                  {post.brandName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white">
                {post.brandName}
              </span>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="secondary" size="icon" className="h-8 w-8 bg-baked-dark/80 hover:bg-baked-dark text-white backdrop-blur-sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

// --- Main Page ---

export default function CreativeCommandCenter() {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");

  // Form state
  const [campaignPrompt, setCampaignPrompt] = useState("");
  const [contentType, setContentType] = useState("social-post");
  const [tone, setTone] = useState("professional");
  const [menuItem, setMenuItem] = useState("");
  const [revisionNote, setRevisionNote] = useState("");

  // Creative content hook
  const {
    content,
    loading,
    error,
    generate,
    approve,
    revise,
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

    const result = await generate({
      platform: selectedPlatform,
      prompt: campaignPrompt,
      style: tone as any,
      includeHashtags: true,
      productName: menuItem || undefined,
      tier: "free",
    });

    if (result) {
      toast.success("Content generated! Craig & Pinky worked their magic ✨");
    }
  };

  // Handle approval
  const handleApprove = async () => {
    if (!currentContent) return;

    await approve(
      currentContent.id,
      date ? date.toISOString() : undefined
    );
  };

  // Handle revision request
  const handleRevise = async () => {
    if (!currentContent || !revisionNote.trim()) {
      toast.error("Please enter revision notes");
      return;
    }

    await revise(currentContent.id, revisionNote);
    setRevisionNote("");
  };

  // Handle accepting safe version from Deebo
  const handleAcceptSafeVersion = () => {
    if (currentContent && currentContent.complianceChecks) {
      const safeCaption = "May help with relaxation."; // This would come from Deebo's suggestion
      toast.success("Safe version accepted!");
    }
  };

  return (
    <div className="flex h-screen bg-baked-darkest text-baked-text-primary font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-baked-border bg-baked-dark/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
          <div>
            <h1 className="text-xl font-semibold">Creative Command Center</h1>
            <p className="text-sm text-baked-text-muted">
              Centralize your cannabis lifestyle, mannerstyle, and imponants.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-baked-green animate-pulse"></div>
                <span className="text-sm text-baked-green font-medium">
                  {isGenerating ? "Craig & Pinky generating..." : "Agent Craig ready"}
                </span>
             </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !campaignPrompt.trim()}
              className="bg-baked-green hover:bg-baked-green-muted text-baked-darkest font-semibold"
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
            <Button variant="ghost" size="icon" className="text-baked-text-secondary hover:text-white">
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
          <div className="px-6 border-b border-baked-border shrink-0 flex items-center justify-between bg-baked-dark/30">
            <TabsList className="bg-transparent p-0 h-12 gap-6">
              <TabsTrigger
                value="instagram"
                className="data-[state=active]:bg-transparent data-[state=active]:text-baked-green data-[state=active]:border-b-2 data-[state=active]:border-baked-green rounded-none h-full px-0 font-medium text-baked-text-secondary transition-all"
              >
                Instagram
              </TabsTrigger>
              <TabsTrigger
                value="tiktok"
                className="data-[state=active]:bg-transparent data-[state=active]:text-baked-green data-[state=active]:border-b-2 data-[state=active]:border-baked-green rounded-none h-full px-0 font-medium text-baked-text-secondary transition-all"
              >
                TikTok
              </TabsTrigger>
              <TabsTrigger
                value="linkedin"
                className="data-[state=active]:bg-transparent data-[state=active]:text-baked-green data-[state=active]:border-b-2 data-[state=active]:border-baked-green rounded-none h-full px-0 font-medium text-baked-text-secondary transition-all"
              >
                LinkedIn
              </TabsTrigger>
              <TabsTrigger
                value="hero-carousel"
                disabled
                className="data-[state=active]:bg-transparent data-[state=active]:text-baked-green data-[state=active]:border-b-2 data-[state=active]:border-baked-green rounded-none h-full px-0 font-medium text-baked-text-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hero Carousel
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/inbox")}
              className="h-8 gap-2 border-baked-border text-baked-text-secondary hover:text-white hover:bg-baked-dark"
            >
                <MessageSquare className="w-4 h-4"/>
                View in Unified Inbox
            </Button>
          </div>

          <TabsContent value="instagram" className="flex-1 flex overflow-hidden m-0 p-0 relative">
            <TheGrid />
            <ScrollArea className="flex-1">
            <div className="flex-1 p-6 flex gap-6 min-h-full w-full">
                {/* Column 1: Prompt Input */}
              <div className="w-[340px] shrink-0 flex flex-col gap-6">
                <h3 className="font-semibold text-lg">Prompt Input</h3>
                <Card className="bg-baked-card border-baked-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium">
                      Campaign Idea
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-baked-text-secondary">Rich text</label>
                        <Textarea
                        value={campaignPrompt}
                        onChange={(e) => setCampaignPrompt(e.target.value)}
                        placeholder="Describe your campaign... e.g., 'Weekend unwind with Sunset Sherbet, focusing on citrus terpenes.'"
                        className="bg-baked-darkest border-baked-border resize-none h-32 text-sm placeholder:text-baked-text-muted/50 focus-visible:ring-baked-green/50"
                        />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-baked-text-secondary">Content Type</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger className="bg-baked-darkest border-baked-border text-baked-text-primary focus:ring-baked-green/50">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-baked-dark border-baked-border text-baked-text-primary">
                          <SelectItem value="social-post" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Social Post</SelectItem>
                          <SelectItem value="blog" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Blog Article</SelectItem>
                          <SelectItem value="email" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Email Newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-baked-text-secondary">Tone</label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="bg-baked-darkest border-baked-border text-baked-text-primary focus:ring-baked-green/50">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent className="bg-baked-dark border-baked-border text-baked-text-primary">
                          <SelectItem value="professional" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Professional</SelectItem>
                          <SelectItem value="hype" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Hype / Energetic</SelectItem>
                          <SelectItem value="educational" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-medium text-baked-text-secondary">Menu Item Integration</label>
                      <Select value={menuItem} onValueChange={setMenuItem}>
                        <SelectTrigger className="bg-baked-darkest border-baked-border text-baked-text-primary focus:ring-baked-green/50">
                          <SelectValue placeholder="e.g., 'Sunset Sherbet Flower'" />
                        </SelectTrigger>
                        <SelectContent className="bg-baked-dark border-baked-border text-baked-text-primary">
                          <SelectItem value="sunset-sherbet" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Sunset Sherbet Flower</SelectItem>
                          <SelectItem value="blue-dream" className="focus:bg-baked-darkest focus:text-white cursor-pointer">Blue Dream Vape Cart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleGenerate}
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
              </div>

               {/* Column 2: Deebo Compliance Shield */}
              <div className="w-[300px] shrink-0 flex flex-col gap-6">
                <h3 className="font-semibold text-lg">Deebo Compliance Shield</h3>
                 <Card className="bg-baked-card border-baked-border shadow-none flex-1 flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <Avatar className="w-16 h-16 border-2 border-baked-border z-10 relative">
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
                                      <p className="text-baked-text-primary text-xs">{check.message}</p>
                                  </div>
                                ))}

                                <div className="bg-baked-green/10 border border-baked-green/30 rounded-lg p-3 text-sm space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-baked-green flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4"/> Deebo's Safe Version
                                        </span>
                                    </div>
                                    <p className="text-baked-text-primary">"May help with relaxation."</p>
                                    <Button
                                      size="sm"
                                      onClick={handleAcceptSafeVersion}
                                      className="w-full bg-baked-green hover:bg-baked-green-muted text-baked-darkest font-semibold"
                                    >
                                        Accept Safe Version
                                    </Button>
                                </div>
                              </>
                            ) : currentContent ? (
                              <div className="bg-baked-green/10 border border-baked-green/30 rounded-lg p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-baked-green"/>
                                      <span className="font-medium text-baked-green">All Checks Passed!</span>
                                  </div>
                                  <p className="text-baked-text-secondary text-xs mt-2">
                                    Content is compliant and ready for approval.
                                  </p>
                              </div>
                            ) : (
                              <div className="text-center text-baked-text-muted text-sm py-8">
                                Generate content to see compliance status
                              </div>
                            )}
                        </div>

                    </CardContent>
                </Card>
              </div>

              {/* Column 3: Draft & Revision */}
              <div className="w-[380px] shrink-0 flex flex-col gap-6">
                <h3 className="font-semibold text-lg">Draft & Revision</h3>
                <Card className="bg-baked-card border-baked-border shadow-none flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1">
                        <CardContent className="p-4 space-y-6">
                        {mockChatHistory.map((msg) => (
                            <div key={msg.id} className="flex gap-3 group">
                                <Avatar className="w-10 h-10 border border-baked-border shrink-0">
                                    {/* <AvatarImage src={msg.sender.avatarUrl} /> */}
                                    <AvatarFallback>{msg.sender.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex items-baseline justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{msg.sender.name}</span>
                                            {/* <span className="text-xs text-baked-text-muted">({msg.sender.role})</span> */}
                                        </div>
                                        <span className="text-xs text-baked-text-muted flex items-center gap-1">
                                            {msg.timestamp}
                                            <MoreHorizontal className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"/>
                                        </span>
                                    </div>
                                    <div className="text-sm text-baked-text-secondary">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        </CardContent>
                    </ScrollArea>
                     <div className="p-4 border-t border-baked-border bg-baked-darkest shrink-0">
                        <div className="relative">
                             <Input
                                placeholder="Add a message..."
                                className="bg-baked-dark border-baked-border pr-10 text-sm placeholder:text-baked-text-muted/50 focus-visible:ring-baked-green/50"
                            />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-baked-text-muted hover:text-baked-green">
                                <Send className="w-4 h-4"/>
                            </Button>
                        </div>
                     </div>
                </Card>
              </div>

              {/* Column 4: HitL Approval & Publishing */}
              <div className="w-[320px] shrink-0 flex flex-col gap-6">
                <h3 className="font-semibold text-lg">HitL Approval & Publishing</h3>
                <div className="space-y-6 flex-1 flex flex-col">
                    {/* Approval Pipeline */}
                    <Card className="bg-baked-card border-baked-border shadow-none p-4 space-y-2">
                        <div className="bg-baked-darkest border border-baked-border rounded-md p-3 text-sm font-medium text-center text-baked-text-secondary">
                            Pending
                        </div>
                        <div className="flex justify-center text-baked-text-muted"><ChevronDown className="w-4 h-4"/></div>
                         <div className="bg-baked-darkest border border-baked-border rounded-md p-3 text-sm font-medium text-center text-baked-text-secondary">
                            Under Revision
                        </div>
                         <div className="flex justify-center text-baked-text-muted"><ChevronDown className="w-4 h-4"/></div>
                        <div className="bg-baked-green/10 border border-baked-green/30 rounded-md p-3 text-sm font-medium flex items-center justify-between text-baked-green">
                            <span>Approved by [User]</span>
                            <CheckCircle2 className="w-4 h-4 fill-baked-green text-baked-darkest"/>
                        </div>
                    </Card>

                     {/* Publishing Schedule */}
                    <Card className="bg-baked-card border-baked-border shadow-none flex-1 flex flex-col">
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
                                className="rounded-md border border-baked-border bg-baked-darkest w-full flex justify-center p-3"
                                classNames={{
                                    head_cell: "text-baked-text-muted font-normal text-[0.8rem]",
                                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-baked-green/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-baked-dark rounded-md transition-colors text-baked-text-primary",
                                    day_selected: "bg-baked-green text-baked-darkest hover:bg-baked-green hover:text-baked-darkest focus:bg-baked-green focus:text-baked-darkest",
                                    day_today: "bg-baked-border/50 text-baked-text-primary",
                                    nav_button: "border border-baked-border hover:bg-baked-dark hover:text-white transition-colors",
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
                                  className="w-full border-baked-border text-baked-text-secondary hover:text-white hover:bg-baked-dark"
                                >
                                    View in Unified Inbox
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                </div>
              </div>

            </div>
            <ScrollBar orientation="horizontal" className="bg-baked-darkest z-10" />
            </ScrollArea>
          </TabsContent>
          {/* Other TabsContent would go here */}
        </Tabs>
      </main>

      {/* Help Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <Button
          variant="ghost"
          size="icon"
          className="bg-baked-card border border-baked-border rounded-full h-10 w-10 text-baked-text-secondary hover:text-white shadow-lg"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
