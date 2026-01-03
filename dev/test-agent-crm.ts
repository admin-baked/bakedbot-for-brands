
import { routeToolCall } from '@/server/agents/tools/router';
import { UserRole } from '@/server/auth/rbac';

async function testInternalCRM() {
    console.log('--- Testing Internal CRM Tools ---');

    // Mock Context
    const mockActor = { userId: 'test-admin', role: 'admin' as UserRole };
    const mockTenantId = 'test-tenant';

    // 1. Test getInternalLeads
    console.log('\nTesting crm.getInternalLeads...');
    const leadsResult = await routeToolCall({
        toolName: 'crm.getInternalLeads',
        inputs: { limit: 5 },
        actor: mockActor,
        tenantId: mockTenantId,
        idempotencyKey: 'test-crm-leads'
    });
    console.log('Leads Result:', JSON.stringify(leadsResult, null, 2));

    // 2. Test generateConnectionLink
    console.log('\nTesting system.generateConnectionLink...');
    const linkResult = await routeToolCall({
        toolName: 'system.generateConnectionLink',
        inputs: { tool: 'stripe' },
        actor: mockActor,
        tenantId: mockTenantId,
        idempotencyKey: 'test-link-stripe'
    });
    console.log('Stripe Link Result:', JSON.stringify(linkResult, null, 2));

    const githubLinkResult = await routeToolCall({
        toolName: 'system.generateConnectionLink',
        inputs: { tool: 'github' },
        actor: mockActor,
        tenantId: mockTenantId,
        idempotencyKey: 'test-link-github'
    });
    console.log('GitHub Link Result:', JSON.stringify(githubLinkResult, null, 2));
}

testInternalCRM().catch(console.error);
