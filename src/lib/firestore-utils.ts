/**
 * Shared Firestore utility helpers — safe for both server and client.
 */

/**
 * Converts any Firestore timestamp representation to a Date.
 *
 * Handles:
 *  - native `Date` objects (pass-through)
 *  - Firestore `Timestamp` objects (`.toDate()` method)
 *  - Serialized Firestore timestamps (`{ _seconds: number }`)
 *  - ISO string or epoch number
 *
 * Returns `null` for falsy or unrecognised values.
 */
export function firestoreTimestampToDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        'toDate' in value &&
        typeof (value as { toDate: unknown }).toDate === 'function'
    ) {
        const d = (value as { toDate: () => Date }).toDate();
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (
        typeof value === 'object' &&
        value !== null &&
        '_seconds' in value &&
        typeof (value as { _seconds: unknown })._seconds === 'number'
    ) {
        const d = new Date((value as { _seconds: number })._seconds * 1000);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return null;
}
