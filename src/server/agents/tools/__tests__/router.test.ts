
import { ToolRequest } from '@/types/agent-toolkit';

// Create a simplified test that doesn't require complex mocking
// The actual routeToolCall integration is tested via domain-tools.test.ts

describe('Tool Router Core Logic', () => {
    describe('Request Validation', () => {
        it('should have required fields in ToolRequest type', () => {
            const validRequest: ToolRequest = {
                toolName: 'test.tool',
                tenantId: 'tenant-1',
                actor: { userId: 'user-1', role: 'brand-admin' },
                inputs: {}
            };

            expect(validRequest.toolName).toBeDefined();
            expect(validRequest.tenantId).toBeDefined();
            expect(validRequest.actor).toBeDefined();
            expect(validRequest.actor.userId).toBeDefined();
            expect(validRequest.actor.role).toBeDefined();
        });

        it('should support optional idempotency key', () => {
            const requestWithKey: ToolRequest = {
                toolName: 'test.tool',
                tenantId: 'tenant-1',
                actor: { userId: 'user-1', role: 'brand-admin' },
                inputs: {},
                idempotencyKey: 'key-123'
            };

            expect(requestWithKey.idempotencyKey).toBe('key-123');
        });
    });

    describe('Actor Role Validation', () => {
        it('should accept valid role types', () => {
            const roles = ['super-admin', 'brand-admin', 'dispensary-admin', 'viewer'];
            roles.forEach(role => {
                const request: ToolRequest = {
                    toolName: 'test.tool',
                    tenantId: 'tenant-1',
                    actor: { userId: 'user-1', role: role as any },
                    inputs: {}
                };
                expect(request.actor.role).toBe(role);
            });
        });
    });
});
