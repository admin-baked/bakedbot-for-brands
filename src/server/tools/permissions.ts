import { grantPermission, revokePermission, checkPermission } from '@/server/services/permissions';

export const PermissionTools = {
    grant: async (userId: string, toolName: string) => {
        return await grantPermission(userId, toolName);
    },
    revoke: async (userId: string, toolName: string) => {
        return await revokePermission(userId, toolName);
    },
    check: async (userId: string, toolName: string) => {
        return await checkPermission(userId, toolName);
    }
};
