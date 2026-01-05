
import { 
    hasRole, 
    hasPermission, 
    canAccessOrder,
    type UserRole 
} from '@/server/auth/rbac';
import { type DomainUserProfile } from '@/types/domain';

describe('RBAC System', () => {
    describe('Budtender Role', () => {
        const budtenderUser: DomainUserProfile = {
            id: 'bud-1',
            uid: 'bud-1',
            email: 'bud@test.com',
            displayName: 'Bud Tender',
            role: 'budtender',
            organizationIds: ['org-1'],
            locationId: 'loc-1',
            brandId: null,
        };

        const otherUser: DomainUserProfile = {
            id: 'other-1',
            uid: 'other-1',
            email: 'other@test.com',
            displayName: 'Other User',
            role: 'customer',
            organizationIds: [],
            brandId: null,
            locationId: null,
        };

        it('should have correct permissions', () => {
            expect(hasPermission(budtenderUser, 'read:products')).toBe(true);
            expect(hasPermission(budtenderUser, 'read:orders')).toBe(true);
            expect(hasPermission(budtenderUser, 'write:orders')).toBe(true);
            
            // Should NOT have admin/brand permissions
            expect(hasPermission(budtenderUser, 'manage:brand')).toBe(false);
            expect(hasPermission(budtenderUser, 'admin:all')).toBe(false);
        });

        it('should allow access to orders at their location', () => {
            const orderAtLocation = {
                retailerId: 'loc-1',
                brandId: 'brand-1'
            };

            expect(canAccessOrder(budtenderUser, orderAtLocation)).toBe(true);
        });

        it('should DENY access to orders at other locations', () => {
            const orderElsewhere = {
                retailerId: 'loc-2',
                brandId: 'brand-1'
            };

            expect(canAccessOrder(budtenderUser, orderElsewhere)).toBe(false);
        });

        it('should DENY access if order has no retailerId', () => {
            const orderWithoutRetailer = {
                brandId: 'brand-1'
            };

            expect(canAccessOrder(budtenderUser, orderWithoutRetailer)).toBe(false);
        });
    });
    
    describe('Customer Role', () => {
        const customerUser: DomainUserProfile = {
            id: 'cust-1',
            uid: 'cust-1',
            email: 'cust@test.com',
            displayName: 'Customer',
            role: 'customer',
            organizationIds: [],
            brandId: null,
            locationId: null,
        };

        it('should allow access to their own orders', () => {
            const myOrder = {
                userId: 'cust-1',
                retailerId: 'loc-1'
            };
            expect(canAccessOrder(customerUser, myOrder)).toBe(true);
        });

        it('should DENY access to others orders', () => {
            const otherOrder = {
                userId: 'cust-2',
                retailerId: 'loc-1'
            };
            expect(canAccessOrder(customerUser, otherOrder)).toBe(false);
        });
    });
});
