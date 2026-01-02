
import { SkillManifest, SkillTool } from '../../types';
import { ToolDefinition } from '@/types/agent-toolkit';

// --- Tool 1: Delegate ---
const delegateDef: ToolDefinition = {
    name: 'agent.delegate',
    description: 'Delegates a specialized task to another agent in the squad. Use this to spawn sub-tasks or hand off work to experts.',
    inputSchema: {
        type: 'object',
        properties: {
            personaId: { 
                type: 'string', 
                enum: ['smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker', 'deebo', 'leo', 'jack', 'linus', 'glenda', 'mike_exec'],
                description: 'The ID of the agent to delegate to.' 
            },
            task: { type: 'string', description: 'Detailed instructions for the sub-agent.' },
            context: { type: 'object', description: 'Optional structured data context for the task.' }
        },
        required: ['personaId', 'task']
    },
    category: 'write',
    requiredPermission: 'read:analytics' // Basic use allowed for all agents
};

const delegateImpl = async (ctx: any, inputs: any) => {
    // We import dynamically to avoid circular dependencies with runAgentChat
    const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
    
    // Construct a delegation prompt that carries the context
    const delegationPrompt = `
    DELEGATION FROM: ${ctx.agentName || 'Superior Agent'}
    TASK: ${inputs.task}
    CONTEXT: ${inputs.context ? JSON.stringify(inputs.context) : 'None'}
    
    Please execute this task and the results will be reported back to the main thread.
    `;

    // Trigger the sub-agent run
    // Note: In a real implementation, we might want to wait for the job or link them in DB.
    // For now, we dispatch it as a new async job.
    const result = await runAgentChat(delegationPrompt, inputs.personaId);
    
    return {
        message: `Task delegated to ${inputs.personaId}.`,
        jobId: result.metadata?.jobId,
        status: 'dispatched'
    };
};

export const delegateTool: SkillTool = {
    definition: delegateDef,
    implementation: delegateImpl
};

// --- Tool 2: Broadcast ---
const broadcastDef: ToolDefinition = {
    name: 'agent.broadcast',
    description: 'Broadcasts a status update or critical finding across multiple channels (Slack, Email).',
    inputSchema: {
        type: 'object',
        properties: {
            message: { type: 'string', description: 'The stylized update message.' },
            channels: { type: 'array', items: { type: 'string', enum: ['slack', 'email'] } },
            recipients: { type: 'array', items: { type: 'string' }, description: 'Target emails or slack channels.' }
        },
        required: ['message', 'channels']
    },
    category: 'side-effect',
    requiredPermission: 'manage:campaigns'
};

const broadcastImpl = async (ctx: any, inputs: any) => {
    const results: any = {};
    
    if (inputs.channels.includes('slack')) {
        const { postMessage } = await import('@/server/integrations/slack/service');
        const { requireUser } = await import('@/server/auth/auth');
        const user = await requireUser();
        results.slack = await postMessage(user.uid, inputs.recipients?.[0] || 'general', inputs.message);
    }
    
    if (inputs.channels.includes('email')) {
        const { sendOrderConfirmationEmail } = await import('@/lib/email/dispatcher');
        // Reusing the confirmation dispatcher for generic alerts for now
        results.email = await sendOrderConfirmationEmail({
            orderId: `ALERT-${Date.now()}`,
            customerEmail: inputs.recipients?.[0] || 'martez@bakedbot.ai',
            customerName: 'Stakeholder',
            total: 0,
            items: [{ name: 'Agent Broadcast', qty: 1, price: 0 }],
            retailerName: 'BakedBot Executive Suite',
            pickupAddress: inputs.message
        });
    }
    
    return {
        message: 'Broadcast complete.',
        results
    };
};

export const broadcastTool: SkillTool = {
    definition: broadcastDef,
    implementation: broadcastImpl
};

const manifest: SkillManifest = {
    tools: [delegateTool, broadcastTool]
};

export default manifest;
export const tools = [delegateTool, broadcastTool];
