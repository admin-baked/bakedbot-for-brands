import { PermissionTools } from '@/server/tools/permissions';
import { grantPermission, revokePermission, checkPermission } from '@/server/services/permissions';

jest.mock('@/server/services/permissions', () => ({
    grantPermission: jest.fn(),
    revokePermission: jest.fn(),
    checkPermission: jest.fn()
}));

describe('PermissionTools', () => {
    it('should grant permission', async () => {
        (grantPermission as jest.Mock).mockResolvedValue(true);
        const result = await PermissionTools.grant('user1', 'toolA');
        expect(grantPermission).toHaveBeenCalledWith('user1', 'toolA');
        expect(result).toBe(true);
    });

    it('should revoke permission', async () => {
        (revokePermission as jest.Mock).mockResolvedValue(true);
        const result = await PermissionTools.revoke('user1', 'toolA');
        expect(revokePermission).toHaveBeenCalledWith('user1', 'toolA');
        expect(result).toBe(true);
    });

    it('should check permission', async () => {
        (checkPermission as jest.Mock).mockResolvedValue(true);
        const result = await PermissionTools.check('user1', 'toolA');
        expect(checkPermission).toHaveBeenCalledWith('user1', 'toolA');
        expect(result).toBe(true);
    });
});
