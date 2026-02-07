/**
 * Tests for format-time utility
 */

import { formatSmartTime } from '@/lib/utils/format-time';

describe('formatSmartTime', () => {
    const now = new Date('2024-02-07T12:00:00Z');

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('abbreviated format (default)', () => {
        it('should return "now" for times less than 1 minute ago', () => {
            const date = new Date('2024-02-07T11:59:30Z'); // 30 seconds ago
            expect(formatSmartTime(date)).toBe('now');
        });

        it('should return minutes with "m" suffix', () => {
            const date = new Date('2024-02-07T11:55:00Z'); // 5 minutes ago
            expect(formatSmartTime(date)).toBe('5m');
        });

        it('should return hours with "h" suffix', () => {
            const date = new Date('2024-02-07T09:00:00Z'); // 3 hours ago
            expect(formatSmartTime(date)).toBe('3h');
        });

        it('should return days with "d" suffix for times within a week', () => {
            const date = new Date('2024-02-05T12:00:00Z'); // 2 days ago
            expect(formatSmartTime(date)).toBe('2d');
        });

        it('should return formatted date for times beyond a week', () => {
            const date = new Date('2024-01-20T12:00:00Z'); // 18 days ago
            expect(formatSmartTime(date)).toBe('Jan 20');
        });
    });

    describe('with showSuffix option', () => {
        it('should add " ago" suffix to abbreviated times', () => {
            const date = new Date('2024-02-07T11:55:00Z'); // 5 minutes ago
            expect(formatSmartTime(date, { showSuffix: true })).toBe('5m ago');
        });
    });

    describe('with abbreviated: false', () => {
        it('should return full "minute" text for single minute', () => {
            const date = new Date('2024-02-07T11:59:00Z'); // 1 minute ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('1 minute ago');
        });

        it('should return full "minutes" text for multiple minutes', () => {
            const date = new Date('2024-02-07T11:55:00Z'); // 5 minutes ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('5 minutes ago');
        });

        it('should return full "hour" text for single hour', () => {
            const date = new Date('2024-02-07T11:00:00Z'); // 1 hour ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('1 hour ago');
        });

        it('should return full "hours" text for multiple hours', () => {
            const date = new Date('2024-02-07T09:00:00Z'); // 3 hours ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('3 hours ago');
        });

        it('should return full "day" text for single day', () => {
            const date = new Date('2024-02-06T12:00:00Z'); // 1 day ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('1 day ago');
        });

        it('should return full "days" text for multiple days', () => {
            const date = new Date('2024-02-05T12:00:00Z'); // 2 days ago
            expect(formatSmartTime(date, { abbreviated: false })).toBe('2 days ago');
        });
    });

    describe('edge cases', () => {
        it('should handle string date input', () => {
            const dateStr = '2024-02-07T11:55:00Z';
            expect(formatSmartTime(dateStr)).toBe('5m');
        });

        it('should return empty string for invalid date', () => {
            expect(formatSmartTime('invalid-date')).toBe('');
        });

        it('should handle exactly 1 hour (60 minutes)', () => {
            const date = new Date('2024-02-07T11:00:00Z'); // exactly 1 hour ago
            expect(formatSmartTime(date)).toBe('1h');
        });

        it('should handle exactly 24 hours (1 day)', () => {
            const date = new Date('2024-02-06T12:00:00Z'); // exactly 1 day ago
            expect(formatSmartTime(date)).toBe('1d');
        });

        it('should handle exactly 7 days', () => {
            const date = new Date('2024-01-31T12:00:00Z'); // exactly 7 days ago
            // 7 days is >= 7, so it shows date format instead of "7d"
            expect(formatSmartTime(date)).toBe('Jan 31');
        });

        it('should format date with correct month abbreviation', () => {
            const date = new Date('2023-12-25T12:00:00Z'); // Dec 25
            expect(formatSmartTime(date)).toBe('Dec 25');
        });
    });

    describe('boundary conditions', () => {
        it('should round down partial minutes', () => {
            const date = new Date('2024-02-07T11:57:30Z'); // 2.5 minutes ago
            expect(formatSmartTime(date)).toBe('2m');
        });

        it('should handle 59 minutes as minutes, not hours', () => {
            const date = new Date('2024-02-07T11:01:00Z'); // 59 minutes ago
            expect(formatSmartTime(date)).toBe('59m');
        });

        it('should handle 23 hours as hours, not days', () => {
            const date = new Date('2024-02-06T13:00:00Z'); // 23 hours ago
            expect(formatSmartTime(date)).toBe('23h');
        });
    });
});
