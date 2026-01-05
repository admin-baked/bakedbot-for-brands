
import { customerAgentManager } from '@/server/services/letta/customer-agent-manager';
import { logger } from '@/lib/logger';

/**
 * Triggers a personalized Welcome email for a new customer
 */
export async function sendWelcomeEmail(customerId: string): Promise<void> {
    try {
        await customerAgentManager.sendPersonalizedEmail(customerId, 'welcome', {
            trigger: 'new_signup',
            signupSource: 'website' // This could be passed in dynamically if available
        });
        logger.info(`[MrsParker] Sent welcome email to ${customerId}`);
    } catch (e: any) {
        logger.error(`[MrsParker] Failed to send welcome email to ${customerId}: ${e.message}`);
        throw e;
    }
}

/**
 * Triggers an onboarding email based on the day in the journey (Day 1, 3, 7)
 */
export async function sendOnboardingEmail(customerId: string, day: number): Promise<void> {
    const tipsMap: Record<number, string> = {
        1: 'Getting Started: Setting up your preferences',
        3: 'Pro Tips: How to earn points faster',
        7: 'Advanced Features: Using our mobile app'
    };

    try {
        await customerAgentManager.sendPersonalizedEmail(customerId, 'onboarding', {
            onboardingDay: day,
            tips: tipsMap[day] || 'Enjoy your journey!'
        });
        logger.info(`[MrsParker] Sent onboarding (Day ${day}) email to ${customerId}`);
    } catch (e: any) {
        logger.error(`[MrsParker] Failed to send onboarding email to ${customerId}: ${e.message}`);
        throw e;
    }
}

/**
 * Triggers a promotional email, typically from a Playbook execution
 */
export async function sendPromotionEmail(customerId: string, promotion: any): Promise<void> {
    try {
        await customerAgentManager.sendPersonalizedEmail(customerId, 'promotion', {
            promotion,
            personalized: true
        });
        logger.info(`[MrsParker] Sent promotion email to ${customerId}`);
    } catch (e: any) {
        logger.error(`[MrsParker] Failed to send promotion email to ${customerId}: ${e.message}`);
        throw e;
    }
}

/**
 * Triggers a win-back email for inactive customers
 */
export async function sendWinbackEmail(customerId: string): Promise<void> {
    try {
        await customerAgentManager.sendPersonalizedEmail(customerId, 'winback', {
            incentive: 'special_offer_20_percent_off',
            daysInactive: 30
        });
        logger.info(`[MrsParker] Sent win-back email to ${customerId}`);
    } catch (e: any) {
        logger.error(`[MrsParker] Failed to send win-back email to ${customerId}: ${e.message}`);
        throw e;
    }
}
