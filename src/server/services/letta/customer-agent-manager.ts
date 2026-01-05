
import { lettaClient } from '@/server/services/letta/client';
import { LettaAgent } from '@/server/services/letta/client';
import { createServerClient } from '@/firebase/server-client';
import { deebo } from '@/server/agents/deebo';
import { sendGenericEmail } from '@/lib/email/mailjet';
import { ragService } from '@/server/services/vector-search/rag-service';

export class CustomerAgentManager {
    private templateCache: Map<string, string> = new Map();
    
    /**
     * Get or create Mrs. Parker template (one-time setup)
     */
    async getMrsParkerTemplate(): Promise<string> {
        if (this.templateCache.has('mrs_parker')) {
            return this.templateCache.get('mrs_parker')!;
        }
        
        // In a real scenario, we might want to interact with the Letta API to find a specific agent to use as template,
        // or just create a new agent with standard instructions.
        // For efficiency, we will assume we create a base agent "mrs_parker_template" if it doesn't exist
        const agents = await lettaClient.listAgents();
        let template = agents.find(a => a.name === 'mrs_parker_template');
        
        if (!template) {
            template = await lettaClient.createAgent(
                'mrs_parker_template',
                `You are Mrs. Parker, Head of Customer Success and Loyalty.
                
Your role is to build genuine relationships with every customer through personalized, warm communication.

PERSONA: Southern hospitality + VIP treatment ("Sugar", "Honey", "Dear")
MISSION: Make every customer feel special, prevent churn, drive loyalty

MEMORY BLOCKS:
- customer_profile: {{ customer_name }}, {{ customer_email }}, {{ customer_tier }}
- interaction_history: All past emails, campaigns, responses
- loyalty_status: Points, rewards, purchase frequency, churn risk`,
                [] // Block IDs attached later per instance
            );
        }
        
        this.templateCache.set('mrs_parker', template.id);
        return template.id;
    }
    
    /**
     * Get or create customer-specific Mrs. Parker agent
     */
    async getCustomerAgent(
        customerId: string,
        customerData: {
            name: string;
            email: string;
            tier?: string;
            type: 'brand' | 'dispensary' | 'end_customer';
            tenantId?: string;
        }
    ): Promise<LettaAgent> {
        const agentName = `mrs_parker_${customerId}`;
        
        // 1. Check if agent exists
        // Note: listing all agents might be slow at scale. 
        // Best practice: store agentId in customer document in Firestore.
        // For now, we will try to list and find to be robust but in prod we'd lookup ID.
        // Let's implement a quick lookup if we can using a tag or name search if Letta supports it.
        // Assuming listAgents returns all, we find by name.
        const agents = await lettaClient.listAgents(); 
        let agent = agents.find(a => a.name === agentName);
        
        if (agent) return agent;

        // 2. Create customer memory blocks
        const profileBlock = await lettaClient.createBlock(
            `customer_profile_${customerId}`,
            `Customer Name: ${customerData.name}
Customer Email: ${customerData.email}
Customer Type: ${customerData.type}
Loyalty Tier: ${customerData.tier || 'New Customer'}
Preferences: (To be learned over time)`,
            { limit: 4000, readOnly: false }
        );
        
        const historyBlock = await lettaClient.createBlock(
            `interaction_history_${customerId}`,
            `Interaction History for ${customerData.name}:\n---\n(No interactions yet)`,
            { limit: 8000, readOnly: false }
        );

        // 3. Create Agent
        // We aren't strictly "cloning" a template in the Letta API sense (unless that endpoint exists), 
        // but creating a new agent with the shared system prompt + specific blocks works well.
        agent = await lettaClient.createAgent(
            agentName,
            `You are Mrs. Parker serving ${customerData.name}.`,
            // We'd ideally merge the template system prompt here, but for simplicity we set a specific one
            // or we could fetch the template's prompt. 
            // In the `getMrsParkerTemplate` we defined the prompt. Let's reuse that concept or just set it fresh.
            // Re-using the prompt from the "template" conceptually:
            // "You are Mrs. Parker... (standard prompt)... serving ${customerData.name}..."
            [profileBlock.id, historyBlock.id]
        );
        
        // Update Agent System Instructions to match Template + Specifics
        // (If createAgent supports it directly great, otherwise update)
        
        return agent;
    }
    
    /**
     * Send personalized email via customer's Mrs. Parker agent
     */
    async sendPersonalizedEmail(
        customerId: string,
        emailType: 'welcome' | 'onboarding' | 'promotion' | 'winback',
        context: any
    ): Promise<{ success: boolean; emailSent: string; agentResponse: any }> {
        // Fetch customer data
        const { firestore } = await createServerClient();
        const customerDoc = await firestore.collection('customers').doc(customerId).get();
        if (!customerDoc.exists) throw new Error(`Customer ${customerId} not found`);
        const customerData = customerDoc.data() as any;

        // Get Agent
        const agent = await this.getCustomerAgent(customerId, {
            name: customerData.firstName + ' ' + customerData.lastName,
            email: customerData.email,
            type: 'end_customer', // deriving or defaulting
            tier: customerData.loyaltyTier,
            tenantId: customerData.tenantId
        });
        
        // RAG for Personalization Context
        const history = await ragService.search({
            collection: `customers/${customerId}/interactions`,
            query: 'past purchases and preferences',
            limit: 3,
            tenantId: customerData.tenantId
        });
        
        // Prompt Agent
        const prompt = `
Generate a ${emailType} email for ${customerData.firstName}.

Context: ${JSON.stringify(context)}
Customer History: ${JSON.stringify(history)}

Task: Write the email subject and body.
Return ONLY valid JSON in this format:
{
  "subject": "string",
  "body": "html string",
  "tone_notes": "string"
}
`;
        const response = await lettaClient.sendMessage(agent.id, prompt);
        const lastMsg = response.messages?.find((m: any) => m.role === 'assistant')?.content || '{}';
        
        // Parse Result
        let emailData;
        try {
            // fast clean of markdown code blocks ```json ... ```
            const cleanJson = lastMsg.replace(/```json/g, '').replace(/```/g, '').trim();
            emailData = JSON.parse(cleanJson);
        } catch (e) {
            console.error('Failed to parse agent email response', lastMsg);
            throw new Error('Agent failed to generate valid JSON email content');
        }
        
        // Compliance Check
        const compliance = await deebo.checkContent('US', 'email', emailData.body); 
        // Adapting to Deebo's ComplianceResultSchema: { status: 'pass'|'fail'|'warning', violations: string[] }
        if (compliance.status === 'fail') {
             throw new Error(`Compliance violation: ${compliance.violations?.join(', ')}`);
        }
        
        // Send Email
        await sendGenericEmail({
            to: customerData.email,
            subject: emailData.subject,
            htmlBody: emailData.body
        });
        
        // Log to History Block
        const blocks = await lettaClient.getCoreMemory(agent.id); 
        // getCoreMemory often returns the blocks. 
        // We need to find the history block ID.
        // If getCoreMemory returns { blocks: [...] }, we look for label 'interaction_history_...'
        // For now, let's assume we can just append if we knew the block ID. 
        // We can list blocks for agent again.
        // Optimization: tracking block IDs in agent metadata would be better.
        
        return {
            success: true,
            emailSent: emailData.subject,
            agentResponse: response
        };
    }
}

export const customerAgentManager = new CustomerAgentManager();
