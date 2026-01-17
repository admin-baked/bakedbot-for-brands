'use server';

import { requireUser } from '@/server/auth/auth';

export type LifecycleFlow = {
    id: string;
    name: string;
    description: string;
    trigger: string;
    status: 'active' | 'inactive';
    channel: 'Email' | 'SMS' | 'Omni';
    stats: {
        sent: number;
        openRate: number;
        conversionRate: number;
    };
};

// Mock Database State (in-memory for demo, replacing Firestore call for speed/simplicity in this specific task)
let mockFlows: LifecycleFlow[] = [
    {
        id: 'flow_welcome',
        name: 'Welcome Series',
        description: 'Onboard new signups with brand intro and 10% off.',
        trigger: 'Customer Created',
        status: 'active',
        channel: 'Email',
        stats: { sent: 1240, openRate: 0.45, conversionRate: 0.12 }
    },
    {
        id: 'flow_abandoned_cart',
        name: 'Abandoned Cart Recovery',
        description: 'Remind users who left items in their cart.',
        trigger: 'Checkout Abandoned',
        status: 'active',
        channel: 'Omni',
        stats: { sent: 85, openRate: 0.62, conversionRate: 0.28 }
    },
    {
        id: 'flow_winback',
        name: 'Lapsed Customer Winback',
        description: 'Re-engage customers who haven\'t purchased in 60 days.',
        trigger: 'Last Order > 60 days',
        status: 'inactive',
        channel: 'Email',
        stats: { sent: 450, openRate: 0.18, conversionRate: 0.05 }
    },
    {
        id: 'flow_review',
        name: 'Post-Purchase Review Request',
        description: 'Ask for a review 3 days after delivery.',
        trigger: 'Order Delivered + 3 days',
        status: 'active',
        channel: 'SMS',
        stats: { sent: 890, openRate: 0.92, conversionRate: 0.15 }
    },
    {
        id: 'flow_vip_welcome',
        name: 'VIP Tier Upgrade',
        description: 'Celebrate when a customer spends over $1000.',
        trigger: 'Total Spend > $1000',
        status: 'inactive',
        channel: 'Omni',
        stats: { sent: 12, openRate: 0.88, conversionRate: 0.50 }
    }
];

export async function getLifecycleFlows(): Promise<LifecycleFlow[]> {
    await requireUser(['brand', 'super_user']);
    // In real app: Fetch from Firestore
    return mockFlows;
}

export async function toggleFlow(flowId: string, currentStatus: 'active' | 'inactive'): Promise<LifecycleFlow> {
    await requireUser(['brand', 'super_user']);

    // In real app: Update Firestore
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const flowIndex = mockFlows.findIndex(f => f.id === flowId);

    if (flowIndex !== -1) {
        mockFlows[flowIndex].status = newStatus;
        return mockFlows[flowIndex];
    }

    throw new Error('Flow not found');
}

export async function simulateTrigger(flowId: string): Promise<{ success: boolean; message: string; log: any }> {
    await requireUser(['brand', 'super_user']);

    const flow = mockFlows.find(f => f.id === flowId);
    if (!flow) throw new Error('Flow not found');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
        success: true,
        message: `Successfully triggered "${flow.name}" via ${flow.channel}.`,
        log: {
            timestamp: new Date().toISOString(),
            action: 'SEND_MESSAGE',
            recipient: 'test_user@example.com',
            content: `[Simulation of ${flow.name} content...]`
        }
    };
}
