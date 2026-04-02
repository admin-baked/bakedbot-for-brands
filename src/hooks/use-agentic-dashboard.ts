'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getChatConfigForRole, type UserRoleForChat } from '@/lib/chat/role-chat-config';
import { VISIBLE_AGENT_SQUAD as REGISTRY_SQUAD, getAgentsForRole, type AgentStatus } from '@/lib/agents/registry';

export type { AgentStatus };

export interface Agent {
    id: string;
    name: string;
    role: string;
    img: string;
    status: AgentStatus;
}

export interface ChatMessage {
    id: string;
    agent: Agent;
    time: string;
    message: string | React.ReactNode;
    actions?: boolean;
}

export interface TaskFeedItem {
    agent: Agent;
    task: string;
    progress: number;
    status: 'live' | 'completed' | 'failed';
}

// Full business agent squad — sourced from canonical registry
export const AGENT_SQUAD: Agent[] = REGISTRY_SQUAD.map(def => ({
    id: def.id,
    name: def.name,
    role: def.title,
    img: def.image,
    status: def.defaultStatus,
}));

export function useAgenticDashboard() {
    const { role } = useUserRole();
    const [config, setConfig] = useState(getChatConfigForRole('brand' as any)); // Default or derived

    // Named agent refs — stable regardless of squad ordering
    const agentCraig = AGENT_SQUAD.find(a => a.id === 'craig') ?? AGENT_SQUAD[0];
    const agentMoneyMike = AGENT_SQUAD.find(a => a.id === 'money_mike') ?? AGENT_SQUAD[0];
    const agentDeebo = AGENT_SQUAD.find(a => a.id === 'deebo') ?? AGENT_SQUAD[0];

    // State
    const [activeAgent, setActiveAgent] = useState<Agent>(agentCraig);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            agent: agentCraig,
            time: "10:30 AM",
            message: "Here's the draft social post, we'll access your insights and draft in your comments.",
            actions: true
        },
        {
            id: '2',
            agent: agentMoneyMike,
            time: "10:36 AM",
            message: "Calculated pricing options in your Website component. Price total annual revenue: $1,850.00.",
            actions: false
        }
    ]);
    const [taskFeed, setTaskFeed] = useState<TaskFeedItem>({
        agent: agentDeebo,
        task: "Scanning for compliance violations...",
        progress: 95,
        status: 'live'
    });
    const [inputValue, setInputValue] = useState('');

    // Sync config with role
    useEffect(() => {
        if (role) {
            const chatConfig = getChatConfigForRole(role as UserRoleForChat);
            setConfig(chatConfig);
            // We could also auto-select the agent based on role config
            // const defaultAgent = AGENT_SQUAD.find(a => a.id === chatConfig.agentPersona);
            // if (defaultAgent) setActiveAgent(defaultAgent);
        }
    }, [role]);

    const sendMessage = async () => {
        if (!inputValue.trim()) return;

        // Optimistic Update
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            agent: { ...activeAgent, name: 'You', role: 'User', img: 'https://github.com/shadcn.png' }, // Placeholder for user
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            message: inputValue,
            actions: false
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Simulate Agent Thinking
        setTaskFeed(prev => ({ ...prev, status: 'live', task: `${activeAgent.name} is thinking...`, progress: 0 }));

        setTimeout(() => {
            setTaskFeed(prev => ({ ...prev, progress: 40 }));
        }, 500);

        setTimeout(() => {
            const responseMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                agent: activeAgent,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                message: `I've received your request: "${userMsg.message}". analyzing data...`,
                actions: true
            };
            setMessages(prev => [...prev, responseMsg]);
            setTaskFeed(prev => ({ ...prev, task: 'Waiting for input', progress: 100, status: 'completed' }));
        }, 1500);
    };

    return {
        role,
        config,
        agentSquad: AGENT_SQUAD,
        activeAgent,
        setActiveAgent,
        messages,
        taskFeed,
        inputValue,
        setInputValue,
        sendMessage
    };
}
