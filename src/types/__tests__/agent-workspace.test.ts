/**
 * Unit tests for UserRole type and agent-workspace types
 */

import type { UserRole, SetupHealth, SetupHealthStatus, Task, QuickStartCard } from '../agent-workspace';

describe('UserRole Type', () => {
    it('should accept all valid role values', () => {
        const validRoles: UserRole[] = ['brand', 'dispensary', 'owner', 'customer'];
        
        validRoles.forEach(role => {
            const testRole: UserRole = role;
            expect(['brand', 'dispensary', 'owner', 'customer']).toContain(testRole);
        });
    });

    it('should be compatible with customer role', () => {
        const customerRole: UserRole = 'customer';
        expect(customerRole).toBe('customer');
    });
});

describe('SetupHealthStatus Type', () => {
    it('should accept valid status values', () => {
        const validStatuses: SetupHealthStatus[] = ['green', 'yellow', 'red'];
        
        validStatuses.forEach(status => {
            const testStatus: SetupHealthStatus = status;
            expect(['green', 'yellow', 'red']).toContain(testStatus);
        });
    });
});

describe('SetupHealth Interface', () => {
    it('should have all required tiles', () => {
        const setupHealth: SetupHealth = {
            dataConnected: { status: 'green', message: 'Connected', action: 'view' },
            publishingLive: { status: 'yellow', message: 'Draft', action: 'publish' },
            complianceReady: { status: 'green', message: 'Ready', action: 'view' },
            deliveryChannels: { status: 'red', message: 'Not connected', action: 'connect' }
        };

        expect(setupHealth.dataConnected).toBeDefined();
        expect(setupHealth.publishingLive).toBeDefined();
        expect(setupHealth.complianceReady).toBeDefined();
        expect(setupHealth.deliveryChannels).toBeDefined();
    });
});

describe('Task Interface', () => {
    it('should support all task statuses', () => {
        const statuses: Array<Task['status']> = ['running', 'needs_approval', 'completed', 'failed'];
        
        statuses.forEach(status => {
            const task: Task = {
                taskId: '123',
                userId: 'user123',
                createdAt: new Date(),
                updatedAt: new Date(),
                status,
                type: 'test_task',
                title: 'Test Task',
                approvalRequired: false
            };
            
            expect(task.status).toBe(status);
        });
    });
});

describe('QuickStartCard Interface', () => {
    it('should support brand and dispensary roles', () => {
        const card: QuickStartCard = {
            id: 'test',
            title: 'Test Card',
            description: 'Test',
            icon: 'test',
            estimatedTime: '5 min',
            roles: ['brand', 'dispensary']
        };

        expect(card.roles).toEqual(['brand', 'dispensary']);
    });

    it('should support optional playbook and prompt', () => {
        const cardWithPlaybook: QuickStartCard = {
            id: 'test',
            title: 'Test',
            description: 'Test',
            icon: 'test',
            estimatedTime: '5 min',
            roles: ['brand'],
            playbookId: 'pb_test',
            prompt: 'Test prompt'
        };

        expect(cardWithPlaybook.playbookId).toBe('pb_test');
        expect(cardWithPlaybook.prompt).toBe('Test prompt');
    });
});
