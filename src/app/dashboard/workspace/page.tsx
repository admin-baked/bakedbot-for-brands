// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

/**
 * Agent Workspace - New home screen for Baked AI
 * Chat is the cockpit. Everything else is an instrument panel.
 */

import { useState, useEffect } from 'react';
import { SetupHealth } from '@/components/dashboard/setup-health';
import { QuickStartCards } from '@/components/dashboard/quick-start-cards';
import { TaskFeed } from '@/components/dashboard/task-feed';
import { RoleBadge } from '@/components/dashboard/role-badge';
import { AgentChat } from '../playbooks/components/agent-chat';
import { useUserRole } from '@/hooks/use-user-role';
import { WELCOME_MESSAGES, getRandomPromptsForRole } from '@/lib/config/quick-start-cards';
import { Button } from '@/components/ui/button';
import { Layers, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AgentWorkspacePage() {
    const { role } = useUserRole();
    const [initialInput, setInitialInput] = useState('');
    const [showWelcome, setShowWelcome] = useState(true);

    useEffect(() => {
        // Check if user has seen workspace before
        const hasSeenWorkspace = localStorage.getItem('has_seen_agent_workspace');
        if (!hasSeenWorkspace) {
            setShowWelcome(true);
            localStorage.setItem('has_seen_agent_workspace', 'true');
        } else {
            setShowWelcome(false);
        }
    }, []);

    const handleQuickStartClick = (prompt: string) => {
        setInitialInput(prompt);
        setShowWelcome(false);
        // Scroll to top to see chat
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSetupHealthAction = (action: string) => {
        // Map action to prompt
        const actionPrompts: Record<string, string> = {
            connect_data_source: 'Connect my menu data source',
            connect_brand_data: 'Connect my brand website and product catalog',
            publish_pages: 'Show me my draft pages ready to publish',
            create_first_page: role === 'brand' ? 'Launch my brand page' : 'Launch my headless menu',
            configure_compliance: 'Configure compliance settings for my state',
            connect_gmail: 'Connect my Gmail account',
            connect_channels: 'Connect Gmail and SMS delivery channels'
        };

        const prompt = actionPrompts[action] || action;
        setInitialInput(prompt);
        setShowWelcome(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const welcomeMessage = role ? WELCOME_MESSAGES[role] : '';
    const promptChips = role ? getRandomPromptsForRole(role, 5) : [];

    return (
        <div className="container mx-auto p-4">
            {/* Header with role badge and classic view link */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Agent Workspace</h1>
                    {role && <RoleBadge role={role} />}
                </div>
                <Link href="/dashboard/classic">
                    <Button variant="ghost" size="sm">
                        <Layers className="h-4 w-4 mr-2" />
                        Classic View
                    </Button>
                </Link>
            </div>

            {/* 3-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Rail - 20% */}
                <div className="lg:col-span-3 space-y-6">
                    <SetupHealth onActionClick={handleSetupHealthAction} />
                    <QuickStartCards onCardClick={handleQuickStartClick} />
                </div>

                {/* Center - Agentic Chat - 55% */}
                <div className="lg:col-span-6">
                    <AgentChat
                        initialInput={initialInput}
                        initialTitle="Agent Workspace"
                    />
                </div>

                {/* Right Rail - Task Feed - 25% */}
                <div className="lg:col-span-3">
                    <TaskFeed />
                </div>
            </div>

            {/* Welcome Modal on first visit */}
            {showWelcome && role && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg max-w-lg w-full p-6 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4">Welcome to Baked AI! 🎉</h2>
                        <p className="text-muted-foreground mb-6">
                            {welcomeMessage}
                        </p>

                        <div className="space-y-3 mb-6">
                            <p className="text-sm font-semibold">Try asking:</p>
                            {promptChips.slice(0, 3).map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setInitialInput(chip);
                                        setShowWelcome(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-sm transition-colors"
                                >
                                    "{chip}"
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                className="flex-1"
                                onClick={() => setShowWelcome(false)}
                            >
                                Get Started
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowWelcome(false);
                                    window.location.href = '/dashboard/classic';
                                }}
                            >
                                Use Classic View
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
