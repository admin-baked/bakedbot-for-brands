'use server';

/**
 * Server actions for Setup Health status checks
 */

// Auth and profile imports removed - not used in current implementation
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import type { SetupHealth, SetupHealthStatus, UserRole } from '@/types/agent-workspace';

/**
 * Get comprehensive setup health status for a user
 */
export async function getSetupHealth(userId: string, role: UserRole): Promise<SetupHealth> {
    try {
        // User profile check removed - not needed for health status

        return {
            dataConnected: await checkDataConnection(userId, role),
            publishingLive: await checkPublishingStatus(userId, role),
            complianceReady: await checkComplianceStatus(userId, role),
            deliveryChannels: await checkDeliveryChannels(userId)
        };
    } catch (error) {
        console.error('Error fetching setup health:', error);
        // Return default "red" status on error
        return {
            dataConnected: { status: 'red', message: 'Unable to check status', action: 'retry' },
            publishingLive: { status: 'red', message: 'Unable to check status', action: 'retry' },
            complianceReady: { status: 'red', message: 'Unable to check status', action: 'retry' },
            deliveryChannels: { status: 'red', message: 'Unable to check status', action: 'retry' }
        };
    }
}

/**
 * Check if user has connected data sources
 */
async function checkDataConnection(userId: string, role: UserRole) {
    // TODO: Check Firestore for connected data sources
    // - Dispensary: CannMenus ID, POS integration, or menu URL
    // - Brand: Website URL, product catalog, or Leafly/Weedmaps link

    const hasDataSource = false; // Placeholder

    if (role === 'dispensary') {
        if (hasDataSource) {
            return {
                status: 'green' as SetupHealthStatus,
                message: 'Menu data connected via CannMenus',
                action: 'view_data'
            };
        } else {
            return {
                status: 'red' as SetupHealthStatus,
                message: 'No menu data source connected',
                action: 'connect_data_source'
            };
        }
    } else if (role === 'brand') {
        if (hasDataSource) {
            return {
                status: 'green' as SetupHealthStatus,
                message: 'Brand catalog and placements tracked',
                action: 'view_data'
            };
        } else {
            return {
                status: 'red' as SetupHealthStatus,
                message: 'No brand data source connected',
                action: 'connect_brand_data'
            };
        }
    }

    return {
        status: 'yellow' as SetupHealthStatus,
        message: 'Partial data connection',
        action: 'review_data'
    };
}

/**
 * Check if user has published pages
 */
async function checkPublishingStatus(userId: string, role: UserRole) {
    // TODO: Check Firestore for published pages
    // - Query seo_pages collection for pages with published: true

    const publishedCount = 0; // Placeholder
    const draftCount = 0; // Placeholder

    if (publishedCount > 0) {
        return {
            status: 'green' as SetupHealthStatus,
            message: `${publishedCount} pages live, ${draftCount} in draft`,
            action: 'view_pages'
        };
    } else if (draftCount > 0) {
        return {
            status: 'yellow' as SetupHealthStatus,
            message: `${draftCount} pages in draft, ready to publish`,
            action: 'publish_pages'
        };
    } else {
        return {
            status: 'red' as SetupHealthStatus,
            message: 'No pages created yet',
            action: 'create_first_page'
        };
    }
}

/**
 * Check compliance configuration
 */
async function checkComplianceStatus(userId: string, role: UserRole) {
    // TODO: Check if Deebo compliance rules are configured
    // - Check user's state/region settings
    // - Verify rulepack is loaded

    const hasComplianceConfig = false; // Placeholder
    const userState = ''; // Placeholder - get from user profile

    if (hasComplianceConfig) {
        return {
            status: 'green' as SetupHealthStatus,
            message: `Deebo configured for ${userState || 'your region'}`,
            action: 'view_compliance'
        };
    } else {
        return {
            status: 'yellow' as SetupHealthStatus,
            message: 'Compliance rules pending configuration',
            action: 'configure_compliance'
        };
    }
}

/**
 * Check delivery channel integrations (Gmail, SMS)
 */
async function checkDeliveryChannels(userId: string) {
    try {
        // Check Gmail connection
        const gmailToken = await getGmailToken(userId);
        const hasGmail = !!gmailToken;

        // TODO: Check SMS provider (Twilio) connection
        const hasSMS = false; // Placeholder

        if (hasGmail && hasSMS) {
            return {
                status: 'green' as SetupHealthStatus,
                message: 'Email and SMS connected',
                action: 'view_integrations'
            };
        } else if (hasGmail || hasSMS) {
            return {
                status: 'yellow' as SetupHealthStatus,
                message: hasGmail ? 'Gmail connected, SMS pending' : 'SMS connected, Gmail pending',
                action: 'connect_channels'
            };
        } else {
            return {
                status: 'red' as SetupHealthStatus,
                message: 'No delivery channels connected',
                action: 'connect_gmail'
            };
        }
    } catch (error) {
        return {
            status: 'red' as SetupHealthStatus,
            message: 'Unable to verify delivery channels',
            action: 'retry'
        };
    }
}
