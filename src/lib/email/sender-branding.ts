export const THRIVE_CUSTOMER_SENDER_NAME = 'Thrive Syracuse';
export const BAKEDBOT_OPERATOR_SENDER_NAME = 'BakedBot Strategy';

export function resolveEmailSenderName(
    communicationType?: string,
    explicitName?: string,
): string | undefined {
    if (explicitName) {
        return explicitName;
    }

    if (communicationType === 'strategy') {
        return BAKEDBOT_OPERATOR_SENDER_NAME;
    }

    return undefined;
}
