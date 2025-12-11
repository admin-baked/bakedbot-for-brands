'use client';

/**
 * Super User Agent Chat
 * 
 * Enhanced agent command interface for internal BakedBot operations.
 * This is a thin wrapper around the base AgentChat component that adds:
 * - Super User specific simulation logic (welcome emails, competitor research, reports)
 * - Access to admin tools (firestore, sendgrid, analytics)
 * - Modals for triggers and vault management
 * - Event listener for quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { AgentChat, type ChatMessage, type ToolCallStep, type ChatArtifact } from '@/app/dashboard/playbooks/components/agent-chat';

// Re-export types for convenience
export type { ChatMessage, ToolCallStep, ChatArtifact } from '@/app/dashboard/playbooks/components/agent-chat';

export function SuperUserAgentChat() {
    const [externalInput, setExternalInput] = useState<string | undefined>();

    // Listen for quick action commands from the QuickActionCard components
    useEffect(() => {
        const handler = (e: CustomEvent<{ command: string }>) => {
            setExternalInput(e.detail.command);
            // Clear after a short delay to allow AgentChat to pick it up
            setTimeout(() => setExternalInput(undefined), 100);
        };
        window.addEventListener('agent-command', handler as EventListener);
        return () => window.removeEventListener('agent-command', handler as EventListener);
    }, []);

    // Custom simulation logic for Super User operations
    const handleSimulate = useCallback(async (
        userInput: string,
        setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    ) => {
        const lowerInput = userInput.toLowerCase();
        const agentMsgId = (Date.now() + 1).toString();

        let plan: string[] = [];
        let steps: ToolCallStep[] = [];
        let responseText = "";
        let artifact: ChatArtifact | undefined;
        let canSaveAsPlaybook = false;

        // Welcome Email Campaign
        if (lowerInput.includes('welcome email') || lowerInput.includes('signup')) {
            plan = ['Query New Signups', 'Generate Personalized Emails', 'Send via SendGrid', 'Log Results'];
            steps = [
                { id: 't1', toolName: 'firestore.query', description: 'Fetching new signups from today...', status: 'completed', durationMs: 350 },
                { id: 't2', toolName: 'craig.generateCopy', description: 'Generating personalized welcome emails...', status: 'completed', durationMs: 2200, subagentId: 'Craig' },
                { id: 't3', toolName: 'sendgrid.send', description: 'Sending 12 welcome emails...', status: 'completed', durationMs: 1500 },
                { id: 't4', toolName: 'analytics.log', description: 'Logging email campaign results...', status: 'completed', durationMs: 200 },
            ];
            responseText = "✅ **Welcome Email Campaign Complete**\n\nSent personalized welcome emails to **12 new signups** from today.";
            artifact = {
                id: 'email-1',
                type: 'yaml',
                title: 'welcome-campaign.yaml',
                content: `name: Welcome Email Campaign
triggers:
  - type: event
    event: new_signup
steps:
  - action: firestore.query
    collection: users
    filter: createdAt >= today
  - action: craig.generateCopy
    template: welcome_email
  - action: sendgrid.send
    to: "{{user.email}}"`,
            };
            canSaveAsPlaybook = true;
        }
        // Competitor Research
        else if (lowerInput.includes('competitor') || lowerInput.includes('aiq') || lowerInput.includes('research')) {
            plan = ['Access AIQ Portal', 'Scrape Pricing Data', 'Analyze Competitor Features', 'Generate Report'];
            steps = [
                { id: 't1', toolName: 'vault.getCredential', description: 'Retrieving AIQ login credentials...', status: 'completed', durationMs: 150 },
                { id: 't2', toolName: 'computer_use.login', description: 'Logging into AIQ portal...', status: 'completed', durationMs: 3500, isComputerUse: true },
                { id: 't3', toolName: 'computer_use.scrape', description: 'Extracting pricing information...', status: 'completed', durationMs: 4200, isComputerUse: true },
                { id: 't4', toolName: 'pops.analyzeData', description: 'Analyzing competitive landscape...', status: 'completed', durationMs: 2800, subagentId: 'Pops' },
            ];
            responseText = "📊 **Competitor Analysis Complete**\n\nI've analyzed AIQ's current pricing and features.\n\n**Key Findings:**\n- AIQ Starter: $299/mo (vs BakedBot $199/mo) ✅ 33% cheaper\n- AIQ lacks AI agents\n- BakedBot has superior compliance features";
            canSaveAsPlaybook = true;
        }
        // Weekly Report
        else if (lowerInput.includes('weekly') || lowerInput.includes('report')) {
            plan = ['Aggregate Platform Metrics', 'Query Revenue Data', 'Compile Agent Performance', 'Generate Report'];
            steps = [
                { id: 't1', toolName: 'firestore.aggregate', description: 'Aggregating weekly platform metrics...', status: 'completed', durationMs: 800 },
                { id: 't2', toolName: 'stripe.query', description: 'Fetching revenue data...', status: 'completed', durationMs: 600 },
                { id: 't3', toolName: 'pops.analyzeData', description: 'Analyzing agent performance...', status: 'completed', durationMs: 1500, subagentId: 'Pops' },
                { id: 't4', toolName: 'report.generate', description: 'Compiling weekly report...', status: 'completed', durationMs: 400 },
            ];
            responseText = `📈 **Weekly Report Generated**\n\n**Revenue:** MRR $47,850 (+12% WoW)\n**Users:** 156 active tenants, 23 new signups\n**Agents:** 12,847 calls, 98.7% success rate`;
            canSaveAsPlaybook = true;
        }
        // Default fallback
        else {
            plan = ['Parse Request', 'Execute Command', 'Return Results'];
            steps = [
                { id: 't1', toolName: 'planner', description: 'Analyzing request...', status: 'completed', durationMs: 300 },
                { id: 't2', toolName: 'execute', description: 'Processing...', status: 'completed', durationMs: 500 },
            ];
            responseText = "I've processed your request. What else can I help you with?";
        }

        // Initialize agent message with thinking state
        const initialAgentMsg: ChatMessage = {
            id: agentMsgId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: plan }
        };
        setMessages(prev => [...prev, initialAgentMsg]);

        // Simulate step execution with delays
        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 300));
            const currentSteps = steps.slice(0, i + 1);
            setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, thinking: { ...m.thinking!, steps: currentSteps } } : m));
        }

        // Final response
        await new Promise(r => setTimeout(r, 400));
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            content: responseText,
            thinking: { ...m.thinking!, isThinking: false },
            artifact,
            canSaveAsPlaybook
        } : m));
    }, []);

    const handleSavePlaybook = useCallback((msgId: string) => {
        console.log('Saving playbook for message:', msgId);
        // TODO: Open modal or save to Firestore
    }, []);

    return (
        <AgentChat
            mode="superuser"
            placeholder="I'm ready to handle complex workflows. Try: 'Send welcome emails to new signups' or 'Research AIQ competitor pricing'"
            defaultThinkingLevel="advanced"
            externalInput={externalInput}
            onSimulate={handleSimulate}
            onSavePlaybook={handleSavePlaybook}
        />
    );
}
