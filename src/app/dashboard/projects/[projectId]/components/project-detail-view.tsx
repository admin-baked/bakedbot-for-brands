'use client';

import { useState } from 'react';
import { Project, ProjectChat } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
    ArrowLeft, 
    MessageSquare, 
    FileText, 
    Settings2, 
    Plus,
    Send,
    Sparkles,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ProjectDetailViewProps {
    project: Project;
    chats: ProjectChat[];
}

export function ProjectDetailView({ project, chats }: ProjectDetailViewProps) {
    const [message, setMessage] = useState('');

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/projects">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            All Projects
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: project.color }}
                        />
                        <h1 className="font-semibold">{project.name}</h1>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                    <Settings2 className="h-4 w-4" />
                    Settings
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Chat History */}
                <div className="w-64 border-r bg-muted/20 flex flex-col">
                    <div className="p-3 border-b">
                        <Button variant="outline" size="sm" className="w-full gap-2">
                            <Plus className="h-4 w-4" />
                            New Chat
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {chats.map((chat) => (
                            <button
                                key={chat.id}
                                className="w-full text-left p-2 rounded-md hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate flex-1">{chat.title}</span>
                                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 pl-6">
                                    {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                                </p>
                            </button>
                        ))}
                        {chats.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                No chats yet. Start a conversation!
                            </p>
                        )}
                    </div>
                </div>

                {/* Center - Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* System Instructions Preview */}
                    {project.systemInstructions && (
                        <div className="p-4 bg-primary/5 border-b">
                            <div className="flex items-start gap-2 text-sm">
                                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-primary mb-1">System Instructions</p>
                                    <p className="text-muted-foreground text-xs line-clamp-2">
                                        {project.systemInstructions}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto text-center py-12">
                            <div 
                                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                style={{ backgroundColor: `${project.color}20` }}
                            >
                                <Sparkles className="h-8 w-8" style={{ color: project.color }} />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
                            <p className="text-muted-foreground text-sm mb-4">
                                {project.systemInstructions 
                                    ? "Your custom instructions will be applied to every message."
                                    : "Ask anything - this project provides focused context for your chats."}
                            </p>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-background">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="min-h-[44px] max-h-[200px] resize-none"
                                    rows={1}
                                />
                                <Button size="icon" disabled={!message.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Files */}
                <div className="w-72 border-l bg-muted/10 flex flex-col">
                    <div className="p-4 border-b">
                        <h3 className="font-medium text-sm mb-1">Files</h3>
                        <p className="text-xs text-muted-foreground">
                            {project.documentCount} files • {(project.totalBytes / 1024).toFixed(1)} KB used
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {project.documentCount === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">
                                    No files yet
                                </p>
                                <Button variant="outline" size="sm" className="mt-3 gap-1">
                                    <Plus className="h-3 w-3" />
                                    Add files
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* File list would go here */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
