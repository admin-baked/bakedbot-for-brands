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

export interface PublicBrandThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
}

export interface PublicBrandTheme {
    brandName: string | null;
    organizationName?: string | null;
    brandMood?: 'dark' | 'light' | null;
    logoUrl: string | null;
    colors: PublicBrandThemeColors;
}

export const DEFAULT_PUBLIC_BRAND_THEME: PublicBrandTheme = {
    brandName: null,
    organizationName: null,
    brandMood: 'light',
    logoUrl: null,
    colors: {
        primary: '#34d058',
        secondary: '#0f1f14',
        accent: '#f59e0b',
        text: '#f8fafc',
        background: '#06100a',
    },
};

export interface MoodCount {
    mood: string;
    count: number;
}

export interface CheckinOnboardingSummary {
    pending: number;
    blocked: number;
    failed: number;
    completedToday: number;
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
    onboardingSummary: CheckinOnboardingSummary;
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
    /** Firestore customer ID — present if the customer was matched/created */
    customerId: string | null;
    /** Product IDs the customer flagged interest in during check-in */
    cartProductIds: string[];
}
