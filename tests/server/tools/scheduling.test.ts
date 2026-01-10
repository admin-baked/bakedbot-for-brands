import { SchedulingTools } from '@/server/tools/scheduling';
import { checkAvailability, bookMeeting } from '@/server/services/scheduling-manager';

jest.mock('@/server/services/scheduling-manager', () => ({
    checkAvailability: jest.fn(),
    bookMeeting: jest.fn()
}));

describe('SchedulingTools', () => {
    describe('checkAvailability', () => {
        it('should propagate availability slots', async () => {
            const mockSlots = [{ time: '10:00', date: '2025-01-01' }];
            (checkAvailability as jest.Mock).mockResolvedValue(mockSlots);

            const result = await SchedulingTools.checkAvailability('jack', '2025-01-01', '2025-01-02');
            expect(result).toEqual(mockSlots);
        });
    });

    describe('book', () => {
        it('should call bookMeeting', async () => {
            const mockDetails = { eventTypeId: 1, start: 'now', responses: { name: 'Test', email: 'test@test.com' }, timeZone: 'UTC' };
            (bookMeeting as jest.Mock).mockResolvedValue({ success: true, bookingId: 123 });

            const result = await SchedulingTools.book(mockDetails);

            expect(bookMeeting).toHaveBeenCalledWith(mockDetails);
            expect(result).toEqual({ success: true, bookingId: 123 });
        });
    });
});
