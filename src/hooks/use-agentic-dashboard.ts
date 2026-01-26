'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getChatConfigForRole, type UserRoleForChat } from '@/lib/chat/role-chat-config';

// Types
export type AgentStatus = 'online' | 'thinking' | 'working' | 'offline';

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

// Static Definitions
export const AGENT_SQUAD: Agent[] = [
    { id: 'craig', name: 'Craig', role: 'The Marketer', img: 'https://i.pravatar.cc/150?u=Craig', status: 'online' },
    { id: 'money_mike', name: 'Money Mike', role: 'The Banker', img: 'https://i.pravatar.cc/150?u=MoneyMike', status: 'online' },
    { id: 'smokey', name: 'Smokey', role: 'The Budtender', img: 'https://i.pravatar.cc/150?u=Smokey', status: 'online' },
    { id: 'deebo', name: 'Deebo', role: 'The Enforcer', img: 'https://i.pravatar.cc/150?u=Deebo', status: 'working' },
];

export function useAgenticDashboard() {
    const { role } = useUserRole();
    const [config, setConfig] = useState(getChatConfigForRole('board' as any)); // Default or derived

    // State
    const [activeAgent, setActiveAgent] = useState<Agent>(AGENT_SQUAD[0]);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            agent: AGENT_SQUAD[0], // Craig
            time: "10:30 AM",
            message: "Here's the draft social post, we'll access your insights and draft in your comments.",
            actions: true
        },
        {
            id: '2',
            agent: AGENT_SQUAD[1], // Money Mike
            time: "10:36 AM",
            message: "Calculated pricing options in your Website component. Price total annual revenue: $1,850.00.",
            actions: false
        }
    ]);
    const [taskFeed, setTaskFeed] = useState<TaskFeedItem>({
        agent: AGENT_SQUAD[3], // Deebo
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
