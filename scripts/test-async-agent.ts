
/**
 * Test Script for Async Agent Infrastructure
 * Run with: npx tsx scripts/test-async-agent.ts
 */

import { runAgentCore } from '@/server/agents/agent-runner';
import { DecodedIdToken } from 'firebase-admin/auth';

async function main() {
    console.log('🧪 Starting Async Agent Verification...');

    // 1. Mock User Context (Simulating Worker environment)
    const mockUser: DecodedIdToken = {
        uid: 'test-user-123',
        email: 'test@bakedbot.ai',
        email_verified: true,
        role: 'brand',
        brandId: 'demo-brand-123',
        auth_time: Date.now(),
        iat: Date.now(),
        exp: Date.now() + 3600,
        aud: 'bakedbot',
        iss: 'https://securetoken.google.com/bakedbot',
        sub: 'test-user-123',
        firebase: { identities: {}, sign_in_provider: 'custom' }
    };

    console.log('👤 Mock User Context:', mockUser.uid);

    // 2. Test Runner with Gmail (Requires DI)
    console.log('\n📧 Testing Gmail Tool Injection...');
    const result1 = await runAgentCore(
        'Check my unread gmail messages', 
        'puff', 
        { modelLevel: 'standard' }, 
        mockUser,
        'test-job-gmail-123'
    );

    console.log('Result 1 (Gmail):');
    console.log(result1.content);
    console.log('Tool Calls:', result1.toolCalls?.map(tc => `${tc.name}: ${tc.status}`).join(', '));

    // 3. Test Runner with Calendar (Requires DI)
    console.log('\n📅 Testing Calendar Tool Injection...');
    const result2 = await runAgentCore(
        'What meetings do I have tomorrow?', 
        'puff', 
        { modelLevel: 'standard' }, 
        mockUser,
        'test-job-calendar-123'
    );

    console.log('Result 2 (Calendar):');
    console.log(result2.content);
    console.log('Tool Calls:', result2.toolCalls?.map(tc => `${tc.name}: ${tc.status}`).join(', '));

    console.log('\n✅ Verification Complete.');
}

// Mocking required internal functions if they fail in standalone script
// (In a real run, tsx handles imports, but some server-only might fail without next env)
// We rely on standard tsx execution.

main().catch(console.error);
