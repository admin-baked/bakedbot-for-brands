"use client";

import React from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  Check,
  Plus,
  Send,
  Smile,
  MoreHorizontal,
  Edit2,
  Share,
  Trash2,
  ThumbsUp,
  Bot,
  HelpCircle,
  ChevronRight,
  ArrowUpRight,
  Inbox,
  Folder,
  Megaphone,
  LayoutGrid,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import Link from 'next/link';

// Hook
import { useAgenticDashboard, type ChatMessage } from '@/hooks/use-agentic-dashboard';

// --- Sub-Components ---

// 1. Sidebar Component
const Sidebar = ({ agents }: { agents: any[] }) => (
  <div className="w-64 h-screen bg-[#0f1a12] border-r border-baked-border flex flex-col p-4 relative font-sans shrink-0">
    <div className="flex items-center gap-2 mb-8 px-2">
      <div className="w-8 h-8 rounded-lg bg-baked-green/20 flex items-center justify-center border border-baked-green/30">
        <Bot className="text-baked-green w-5 h-5" />
      </div>
      <h1 className="font-semibold text-lg tracking-tight text-white">BakedBot.ai</h1>
    </div>

    <Button variant="secondary" className="w-full justify-start gap-3 bg-baked-green/10 text-baked-green hover:bg-baked-green/20 border border-baked-green/20 mb-6 font-medium shadow-sm shadow-baked-green/5">
      <Inbox className="w-4 h-4" />
      Inbox
    </Button>

    <nav className="space-y-1 mb-8">
      <Link href="/dashboard/projects" className="flex items-center gap-3 px-3 py-2 text-sm text-baked-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors group">
        <Folder className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        <span className="flex-1">Projects</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </Link>
      <Link href="/dashboard/marketing" className="flex items-center gap-3 px-3 py-2 text-sm text-baked-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors group">
        <Megaphone className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        <span className="flex-1">Marketing</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </Link>
      <Link href="/dashboard/products" className="flex items-center gap-3 px-3 py-2 text-sm text-baked-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors group">
        <LayoutGrid className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        <span className="flex-1">Catalog</span>
      </Link>
      <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-baked-text-secondary hover:text-white hover:bg-white/5 rounded-md transition-colors group">
        <User className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        <span className="flex-1">My Account</span>
      </Link>
    </nav>

    <div className="mb-6 flex-1">
      <div className="flex items-center justify-between text-xs font-semibold text-baked-text-muted uppercase tracking-wider mb-4 px-2">
        <span>Agent Squad</span>
        <Plus className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-baked-text-muted/40 px-3 mb-2 font-mono">New Squad</div>
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-3 px-2 py-1.5 text-baked-text-secondary hover:text-white hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
            <div className="relative">
              <Avatar className="w-8 h-8 border border-baked-border/50 group-hover:border-baked-border">
                <AvatarImage src={agent.img} />
                <AvatarFallback>{agent.name[0]}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0f1a12] ${agent.status === 'online' ? 'bg-baked-green' :
                  agent.status === 'working' ? 'bg-amber-500' : 'bg-baked-text-muted'
                }`}></div>
            </div>
            <span className="text-sm font-medium">{agent.name}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-auto flex items-center gap-3 text-baked-text-secondary p-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors border-t border-baked-border pt-4">
      <Avatar className="w-8 h-8">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">My Account</span>
      </div>
    </div>
  </div>
);

// 2. Chat Message Component
const ChatMessageDisplay = ({ msg }: { msg: ChatMessage }) => (
  <div className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-500">
    <Avatar className="w-10 h-10 border-2 border-baked-border/50 mt-1">
      <AvatarImage src={msg.agent.img} />
      <AvatarFallback>{msg.agent.name[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1 max-w-2xl">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="font-semibold text-white/90 text-sm">{msg.agent.name}</span>
        <span className="text-xs text-baked-text-muted">({msg.agent.role})</span>
        <span className="text-[10px] text-baked-text-muted/60 ml-auto font-mono">{msg.time}</span>
      </div>
      <div className="text-baked-text-secondary text-sm bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/5 group-hover:border-baked-border/50 transition-colors leading-relaxed shadow-sm">
        {msg.message}
      </div>
      {msg.actions && (
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full"><ThumbsUp className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full"><Edit2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-white hover:bg-white/10 rounded-full"><Share className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-baked-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-full"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </div>
  </div>
);

// 3. Task Feed Component
const TaskFeed = ({ item }: { item: any }) => (
  <Card className="bg-baked-card/50 border-baked-border shadow-md mt-auto backdrop-blur-md">
    <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between border-b border-baked-border/50">
      <CardTitle className="text-xs font-semibold text-baked-text-primary uppercase tracking-wider">Task Feed</CardTitle>
      <div className="flex items-center gap-2">
        <motion.div
          animate={item.status === 'live' ? { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-1.5 h-1.5 rounded-full ${item.status === 'live' ? 'bg-baked-green shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-baked-text-muted'}`}
        />
        <span className={`text-[10px] font-medium font-mono ${item.status === 'live' ? 'text-baked-green' : 'text-baked-text-muted'}`}>
          {item.status === 'live' ? 'LIVE' : 'IDLE'}
        </span>
        <MoreHorizontal className="w-3 h-3 text-baked-text-muted ml-1" />
      </div>
    </CardHeader>
    <CardContent className="px-4 py-3">
      <div className="flex gap-3 items-center">
        <div className="relative shrink-0">
          <Avatar className="w-8 h-8 border border-baked-border">
            <AvatarImage src={item.agent.img} />
            <AvatarFallback>{item.agent.name[0]}</AvatarFallback>
          </Avatar>
          {item.status === 'live' && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -inset-1 rounded-full border border-baked-green/40 z-0"
            />
          )}
        </div>

        <div className="flex-1 space-y-1.5 relative z-10 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-white truncate">{item.agent.name} ({item.agent.role})</span>
            <span className="text-[10px] text-baked-green font-mono">{item.progress}%</span>
          </div>
          <p className="text-xs text-baked-text-secondary truncate">{item.task}</p>
          <Progress value={item.progress} className="h-1 bg-black/40" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// 4. Artifact Components
const ArtifactPipeline = () => (
  <div className="flex items-center gap-1.5 text-[10px] text-baked-text-muted font-medium bg-black/20 p-1.5 rounded-lg w-fit ml-auto border border-white/5">
    <span className="px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer transition-colors">Draft</span>
    <ChevronRight className="w-3 h-3 opacity-50" />
    <span className="px-1.5 py-0.5 rounded text-baked-green bg-baked-green/10 border border-baked-green/20">Pending Review</span>
    <ChevronRight className="w-3 h-3 opacity-50" />
    <span className="px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer transition-colors">Approved</span>
    <ChevronRight className="w-3 h-3 opacity-50" />
    <span className="px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer transition-colors">Published</span>
  </div>
)

const CarouselArtifact = () => (
  <Card className="glass-card bg-white/5 border-white/10 shadow-lg mb-6 group hover:border-white/20 transition-all">
    <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-medium text-white">Carousel Draft</CardTitle>
      <Badge variant="outline" className="text-[10px] h-5 border-baked-green/30 text-baked-green bg-baked-green/5 hover:bg-baked-green/10 cursor-pointer">Edit post</Badge>
    </CardHeader>
    <CardContent className="px-4 pb-4 relative">
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border border-white/5 bg-black/20 p-2">
        <div className="flex space-x-3">
          <div className="w-[140px] shrink-0 bg-baked-green/10 border border-baked-green/40 rounded-md overflow-hidden relative aspect-[4/5] p-3 flex flex-col">
            <div className="text-xs font-bold text-white mb-2">Card 1</div>
            <p className="text-[10px] text-white/70 leading-snug">Inside your operation with slower drinks, knocks, cards.</p>
            <div className="mt-auto pt-2">
              <Badge className="w-full justify-center text-[8px] h-4 bg-baked-green/20 hover:bg-baked-green/30 text-baked-green border-0">Add card 1</Badge>
            </div>
          </div>

          <div className="w-[140px] shrink-0 bg-white/5 border border-white/10 rounded-md overflow-hidden relative aspect-[4/5] p-3 flex flex-col group/card hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-white/90">Card 2</div>
              <Edit2 className="w-3 h-3 text-white/30 group-hover/card:text-white transition-colors" />
            </div>
            <p className="text-[10px] text-white/50 leading-snug">Make your post mw cards in de many cards.</p>
            <div className="mt-auto pt-2">
              <Badge variant="secondary" className="w-full justify-center text-[8px] h-4 bg-white/5 hover:bg-white/10 text-white/50 border-0">Add card 2</Badge>
            </div>
          </div>

          <div className="w-[140px] shrink-0 bg-white/5 border border-white/10 rounded-md overflow-hidden relative aspect-[4/5] p-3 flex flex-col group/card hover:bg-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-white/90">Card 3</div>
              <Edit2 className="w-3 h-3 text-white/30 group-hover/card:text-white transition-colors" />
            </div>
            <p className="text-[10px] text-white/50 leading-snug">Make your post own penneandano options.</p>
            <div className="mt-auto pt-2">
              <Badge variant="secondary" className="w-full justify-center text-[8px] h-4 bg-white/5 hover:bg-white/10 text-white/50 border-0">Add card 3</Badge>
            </div>
          </div>

        </div>
        <ScrollBar orientation="horizontal" className="bg-white/5" />
      </ScrollArea>
      <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-7 w-7 rounded-full backdrop-blur-sm border border-white/10"><ChevronLeft className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white h-7 w-7 rounded-full backdrop-blur-sm border border-white/10"><ChevronRight className="w-4 h-4" /></Button>
    </CardContent>
  </Card>
);

const PricingArtifact = () => (
  <Card className="glass-card bg-white/5 border-white/10 shadow-lg mb-6">
    <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-medium text-white">Pricing Model</CardTitle>
      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-baked-text-muted hover:text-white hover:bg-white/5">Edit Profile</Button>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="border border-white/10 rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-baked-text-muted h-8 text-[10px] uppercase font-semibold">Pricing Model</TableHead>
              <TableHead className="text-baked-text-muted h-8 text-[10px] uppercase font-semibold text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-white/5 hover:bg-white/5">
              <TableCell className="py-2 text-xs font-medium text-white/80">Law</TableCell>
              <TableCell className="py-2 text-xs text-white/80 text-right">$200</TableCell>
            </TableRow>
            <TableRow className="border-white/5 hover:bg-white/5">
              <TableCell className="py-2 text-xs font-medium text-white/80">Medium</TableCell>
              <TableCell className="py-2 text-xs text-white/80 text-right">$200</TableCell>
            </TableRow>
            <TableRow className="border-white/5 hover:bg-white/5">
              <TableCell className="py-2 text-xs font-medium text-white/80">X-night</TableCell>
              <TableCell className="py-2 text-xs text-white/80 text-right">$250</TableCell>
            </TableRow>
            <TableRow className="border-white/10 hover:bg-transparent bg-baked-green/5">
              <TableCell className="py-2 text-xs font-bold text-baked-green">Total</TableCell>
              <TableCell className="py-2 text-xs font-bold text-baked-green text-right">$1,300</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Button variant="link" className="text-baked-green text-xs p-0 h-auto mt-3 hover:text-baked-green/80">Show more artifacts</Button>
    </CardContent>
  </Card>
)

const SocialArtifact = ({ platform }: { platform: 'instagram' | 'twitter' }) => (
  <Card className="glass-card bg-white/5 border-white/10 shadow-none mb-4 relative overflow-hidden group hover:border-white/20 transition-all">
    {/* Decorative background blur */}
    <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${platform === 'instagram' ? 'from-purple-500 to-orange-500' : 'from-blue-400 to-blue-600'} opacity-80`}></div>
    <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-sm ${platform === 'instagram' ? 'bg-gradient-to-br from-purple-600 to-orange-600' : 'bg-black'}`}>
          {platform === 'instagram' ? <div className="w-3.5 h-3.5 border-2 border-white rounded-[4px] relative"><div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full"></div></div> : <span className="text-white text-[10px] font-bold">X</span>}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white">BakedBot.ai</span>
        </div>
      </div>
      <MoreHorizontal className="w-3 h-3 text-baked-text-muted cursor-pointer hover:text-white" />
    </CardHeader>
    <CardContent className="px-3 pb-3">
      <p className="text-xs text-baked-text-secondary leading-snug">
        Here's the draft social post for 4/20 Promotion pportiving to your comments. 👍
      </p>
      {platform === 'twitter' && <div className="mt-2 text-blue-400 text-[10px] flex items-center gap-1 hover:underline cursor-pointer">
        @BakedBotAi <ArrowUpRight className="w-3 h-3" />
      </div>}
      {platform === 'instagram' && <div className="mt-2 text-baked-text-muted text-[10px] hover:text-white cursor-pointer">View more comments</div>}
    </CardContent>
  </Card>
)

// --- Main Page Layout ---
export default function AgenticCommandCenter() {
  const {
    agentSquad,
    messages,
    taskFeed,
    inputValue,
    setInputValue,
    sendMessage
  } = useAgenticDashboard();

  return (
    <div className="flex h-screen bg-baked-darkest text-baked-text-primary overflow-hidden font-sans selection:bg-baked-green/30">
      <Sidebar agents={agentSquad} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-baked-green/5 blur-[120px] pointer-events-none z-0"></div>

        {/* Header */}
        <header className="h-14 border-b border-baked-border bg-baked-darkest/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Agentic Command Center</h2>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-baked-text-secondary hover:text-white hover:bg-white/5 h-8 w-8 rounded-full">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-baked-text-secondary hover:text-white hover:bg-white/5 h-8 w-8 rounded-full relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-baked-darkest"></span>
            </Button>

            <Avatar className="w-8 h-8 ml-2 border border-white/10">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Sub Header - Thread Context */}
        <div className="px-6 py-3 border-b border-baked-border/50 flex items-center justify-between bg-white/[0.02] z-20">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 bg-transparent hover:bg-white/5 text-baked-text-secondary">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white leading-none">Create 4/20 Promotion</h1>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-0 text-[10px] px-2 py-0.5 h-5">Pending Review</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-baked-green text-baked-green hover:bg-baked-green/10 h-8 text-xs font-semibold gap-2">
              <Check className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button size="sm" className="bg-baked-green hover:bg-baked-green/90 text-baked-darkest h-8 text-xs font-bold shadow-[0_0_15px_rgba(74,222,128,0.3)] gap-2">
              Publish <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Main Content Split View */}
        <div className="flex-1 flex overflow-hidden relative z-10">
          {/* Left Panel: Conversation & Tasks */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold text-baked-text-secondary uppercase tracking-wider">Conversation Thread</h3>
              <div className="flex gap-1 text-baked-text-muted">
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-white"><Share className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-white"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-6 pb-4">
                {messages.map((msg, i) => (
                  <ChatMessageDisplay key={i} msg={msg} />
                ))}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="mt-4 mb-2 relative shrink-0">
              <div className="relative bg-white/5 rounded-xl border border-white/10 focus-within:border-baked-green/50 focus-within:bg-white/[0.07] transition-all group">
                <textarea
                  className="w-full bg-transparent border-none h-16 py-4 pl-4 pr-28 resize-none focus:outline-none text-sm placeholder:text-baked-text-muted/50 text-white"
                  placeholder="Type your instruction..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-baked-text-muted hover:text-white h-8 w-8 rounded-full hover:bg-white/10"><Smile className="w-4 h-4" /></Button>
                  <div className="w-px h-4 bg-white/10 mx-1"></div>
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    className="bg-baked-green text-baked-darkest hover:bg-baked-green/90 h-8 w-10 rounded-lg ml-1 shadow-md">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Transparency via Task Feed */}
            <TaskFeed item={taskFeed} />
          </div>

          {/* Right Panel: Artifacts (Sidecar view) */}
          <div className="w-[420px] bg-black/20 border-l border-baked-border/50 p-6 overflow-y-auto backdrop-blur-sm relative scrollbar-thin">
            {/* Gradient Shine */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-baked-green/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-semibold text-white">Artifacts</h3>
              {/* HitL Workflow Visualization */}
              <ArtifactPipeline />
            </div>

            <CarouselArtifact />

            <div className="grid grid-cols-1 gap-4">
              <PricingArtifact />
              <div className="grid grid-cols-2 gap-4">
                <SocialArtifact platform="instagram" />
                <SocialArtifact platform="twitter" />
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <Button variant="ghost" size="sm" className="text-xs text-baked-text-muted hover:text-baked-green mb-2">View Archives</Button>
              <p className="text-[10px] text-white/20">All artifacts are version controlled by Deebo.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
