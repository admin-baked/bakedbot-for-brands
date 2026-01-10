import { checkAvailability, bookMeeting, type BookingDetails } from '@/server/services/scheduling-manager';

export const SchedulingTools = {
    /**
     * Checks availability for a user within a date range.
     */
    checkAvailability: async (username: string, dateFrom: string, dateTo: string) => {
        return await checkAvailability(username, dateFrom, dateTo);
    },

    /**
     * Books a meeting.
     */
    book: async (details: BookingDetails) => {
        return await bookMeeting(details);
    }
};
