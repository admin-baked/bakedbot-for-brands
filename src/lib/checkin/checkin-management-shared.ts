export interface CheckinConfig {
    checkInEnabled: boolean;
    publicFlowEnabled: boolean;
    gmapsPlaceId: string;
    inStoreOffer: string;
    welcomeHeadline: string;
    tabletIdleTimeoutSec: number;
    updatedAt?: string | null;
}

export const DEFAULT_CHECKIN_CONFIG: CheckinConfig = {
    checkInEnabled: true,
    publicFlowEnabled: true,
    gmapsPlaceId: '',
    inStoreOffer: '1¢ pre-roll exchange - trade one detail for a staff-honored in-store offer',
    welcomeHeadline: 'Check in faster. Give your budtender a better head start.',
    tabletIdleTimeoutSec: 20,
    updatedAt: null,
};

export interface MoodCount {
    mood: string;
    count: number;
}

export interface CheckinStats {
    todayCount: number;
    weekCount: number;
    monthCount: number;
    todayNew: number;
    todayReturning: number;
    smsConsentRate: number;
    emailConsentRate: number;
    reviewPendingCount: number;
    topMood: string | null;
    moodBreakdown: MoodCount[];
    periodLabel: string;
}

export interface CheckinVisitRow {
    visitId: string;
    firstName: string;
    phoneLast4: string;
    visitedAt: string;
    source: string;
    isReturning: boolean;
    mood: string | null;
    smsConsent: boolean;
    emailConsent: boolean;
    reviewStatus: string;
}
