import { requestPermission } from '@/server/tools/permissions';

describe('Permissions Tool', () => {
    it('should return a structured permission request for Gmail', async () => {
        const result = await requestPermission('gmail', 'Read emails');
        expect(result.success).toBe(true);
        expect(result.status).toBe('requested');
        expect(result.message).toContain('[PERMISSION_REQUEST:GMAIL]');
    });

    it('should return a structured permission request for Calendar', async () => {
        const result = await requestPermission('calendar', 'Schedule meeting');
        expect(result.success).toBe(true);
        expect(result.message).toContain('[PERMISSION_REQUEST:CALENDAR]');
    });

    it('should return a structured permission request for Sheets', async () => {
        const result = await requestPermission('sheets', 'Read data');
        expect(result.success).toBe(true);
        expect(result.message).toContain('[PERMISSION_REQUEST:SHEETS]');
    });

    it('should handle case insensitivity', async () => {
        const result = await requestPermission('GMAIL', 'Read emails');
        expect(result.success).toBe(true);
        expect(result.metadata?.permission).toBe('gmail');
    });

    it('should return error for invalid permission type', async () => {
        const result = await requestPermission('invalid_tool', 'reason');
        expect(result.success).toBe(false);
        expect(result.status).toBe('error');
        expect(result.message).toContain('Invalid permission type');
    });
});
