
import { LettaAgent } from './client';
import { CustomerAgentManager } from './customer-agent-manager';
import { db } from '@/firebase/server-client';

export class RolePermissionService {
    /*
     * Get the appropriate Mrs. Parker agent based on the user's role and requested customer.
     * Enforces strict tenancy and role-based access control.
     */
    async getMrsParkerForRole(
        userId: string,
        role: 'executive' | 'dispensary' | 'brand',
        tenantId: string,
        customerId?: string
    ): Promise<LettaAgent> {
        const agentManager = new CustomerAgentManager();

        // SCENARIO 1: Executive Board (Super User)
        // Can access ANY customer's agent or the master template
        if (role === 'executive') {
            if (customerId) {
                const customerData = await this.getCustomerData(customerId);
                return await agentManager.getCustomerAgent(customerId, customerData);
            }
            // If no customer specified, return a generic "Master" Mrs. Parker or throw
            // For now, let's assume they want the template-based generic agent if no customer selected
            // But Mrs. Parker is strictly 1:1 now. So we should require customerId for interacton.
            throw new Error('Customer ID required for Mrs. Parker interaction');
        }

        // SCENARIO 2: Dispensary / Brand (Tenant Scoped)
        if (role === 'dispensary' || role === 'brand') {
            if (!customerId) {
                throw new Error('Customer ID required for dispensary/brand role');
            }

            // 1. Verify Customer Ownership
            const customerData = await this.getCustomerData(customerId);
            
            // Strict Tenant Check
            if (customerData.tenantId !== tenantId) {
                throw new Error(`Unauthorized: Customer ${customerId} does not belong to tenant ${tenantId}`);
            }

            // 2. Return the Scoped Agent
            return await agentManager.getCustomerAgent(customerId, customerData);
        }

        throw new Error(`Invalid role: ${role}`);
    }

    private async getCustomerData(customerId: string): Promise<any> {
        const doc = await db.collection('customers').doc(customerId).get();
        if (!doc.exists) {
            throw new Error(`Customer ${customerId} not found`);
        }
        return doc.data();
    }
}

export const rolePermissionService = new RolePermissionService();
