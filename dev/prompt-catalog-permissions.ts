/**
 * Permission Request Prompts
 * 
 * Defines how agents should request integrations and permissions inline.
 * Permissions are requested on first use, not during onboarding.
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// PERMISSION TYPES
// =============================================================================

export type PermissionType = 
    | 'gmail_read'
    | 'gmail_send'
    | 'drive_read'
    | 'drive_write'
    | 'calendar_read'
    | 'calendar_write'
    | 'email_marketing'  // Permission to send marketing emails on behalf of user
    | 'sms_marketing'    // Permission to send SMS on behalf of user
    | 'pos_integration'  // Dutchie/Flowhub POS connection
    | 'crm_integration'  // SpringBig/AlpineIQ CRM connection
    | 'wholesale_integration';  // LeafLink integration

export interface PermissionRequest {
    type: PermissionType;
    reason: string;
    scope: string;
    oneTime: boolean;  // If true, only ask once
    buttonText: string;
    skipText: string;
}

export const PERMISSION_DEFINITIONS: Record<PermissionType, PermissionRequest> = {
    gmail_read: {
        type: 'gmail_read',
        reason: 'To read your emails and find relevant information',
        scope: 'Read-only access to Gmail',
        oneTime: true,
        buttonText: 'Connect Gmail',
        skipText: 'Skip for now'
    },
    gmail_send: {
        type: 'gmail_send',
        reason: 'To send emails on your behalf',
        scope: 'Send emails from your Gmail account',
        oneTime: true,
        buttonText: 'Allow Sending',
        skipText: 'I\'ll send manually'
    },
    drive_read: {
        type: 'drive_read',
        reason: 'To access and read your documents',
        scope: 'Read-only access to Google Drive',
        oneTime: true,
        buttonText: 'Connect Drive',
        skipText: 'Skip for now'
    },
    drive_write: {
        type: 'drive_write',
        reason: 'To create and update documents for you',
        scope: 'Read and write access to Google Drive',
        oneTime: true,
        buttonText: 'Allow Writing',
        skipText: 'Read-only is fine'
    },
    calendar_read: {
        type: 'calendar_read',
        reason: 'To view your calendar and find available times',
        scope: 'Read-only access to Google Calendar',
        oneTime: true,
        buttonText: 'Connect Calendar',
        skipText: 'Skip for now'
    },
    calendar_write: {
        type: 'calendar_write',
        reason: 'To schedule meetings and events for you',
        scope: 'Create and edit calendar events',
        oneTime: true,
        buttonText: 'Allow Scheduling',
        skipText: 'I\'ll schedule manually'
    },
    email_marketing: {
        type: 'email_marketing',
        reason: 'To send marketing emails to your customers',
        scope: 'Send emails via your connected email provider',
        oneTime: true,
        buttonText: 'Allow Marketing Emails',
        skipText: 'Not right now'
    },
    sms_marketing: {
        type: 'sms_marketing',
        reason: 'To send SMS messages to your customers',
        scope: 'Send SMS via connected provider (Twilio/SpringBig)',
        oneTime: true,
        buttonText: 'Allow SMS',
        skipText: 'Not right now'
    },
    pos_integration: {
        type: 'pos_integration',
        reason: 'To sync your inventory and sales data',
        scope: 'Read orders, inventory, and products from your POS',
        oneTime: true,
        buttonText: 'Connect POS',
        skipText: 'Set up later'
    },
    crm_integration: {
        type: 'crm_integration',
        reason: 'To access customer data and loyalty info',
        scope: 'Read and update customer records',
        oneTime: true,
        buttonText: 'Connect CRM',
        skipText: 'Set up later'
    },
    wholesale_integration: {
        type: 'wholesale_integration',
        reason: 'To manage wholesale orders and inventory',
        scope: 'Read and create orders in LeafLink',
        oneTime: true,
        buttonText: 'Connect LeafLink',
        skipText: 'Set up later'
    }
};

// =============================================================================
// PERMISSION REQUEST SCENARIOS
// =============================================================================

export const PERMISSION_PROMPTS: PromptScenario[] = [
    // --- Gmail Integration ---
    {
        id: 'perm-gmail-001',
        role: 'dispensary',
        category: 'permission_request',
        prompt: 'Send an email to my supplier',
        context: 'Gmail not connected',
        expectedBehavior: 'Request Gmail permission inline',
        idealResponsePattern: `📧 **Gmail Connection Required**

To send emails on your behalf, I need access to your Gmail account.

**What I'll be able to do:**
✅ Read emails for context
✅ Send emails from your address
✅ Never share your data

**Privacy Note:** I only access emails when you ask me to.

[Connect Gmail] [Skip & Compose Manually]

*You'll only need to connect once.*`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
    {
        id: 'perm-gmail-002',
        role: 'brand',
        category: 'permission_request',
        prompt: 'Draft an email to my retail partners',
        context: 'Gmail connected but send permission not granted',
        expectedBehavior: 'Request send permission inline',
        idealResponsePattern: `📧 **Email Draft Ready!**

I've drafted your email to retail partners.

**Preview:**
> Subject: Q1 Promotional Opportunity
> 
> Dear [Partner],
> 
> We're excited to offer exclusive pricing for Q1...

---

**To send this email:**
I need your permission to send emails from your account.

[Allow Sending] [Copy to Clipboard Instead]

*Once allowed, I can send future emails directly.*`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },

    // --- Drive Integration ---
    {
        id: 'perm-drive-001',
        role: 'dispensary',
        category: 'permission_request',
        prompt: 'Save this report to my Drive',
        context: 'Drive not connected',
        expectedBehavior: 'Request Drive permission inline',
        idealResponsePattern: `📁 **Google Drive Connection Required**

To save files to your Drive, I need to connect to your account.

**What I'll be able to do:**
✅ Create documents and spreadsheets
✅ Organize files in folders you specify
✅ Share files on your behalf

[Connect Google Drive] [Download File Instead]

*One-time setup. Your files stay private.*`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },

    // --- Calendar Integration ---
    {
        id: 'perm-cal-001',
        role: 'super_admin',
        category: 'permission_request',
        prompt: 'Schedule a meeting with Jack for tomorrow',
        context: 'Calendar not connected',
        expectedBehavior: 'Request Calendar permission inline',
        idealResponsePattern: `📅 **Calendar Connection Required**

To schedule meetings, I need access to your Google Calendar.

**What I'll be able to do:**
✅ Check your availability
✅ Create and send invites
✅ Update existing events

[Connect Calendar] [I'll Schedule Manually]

*Once connected, I can manage your schedule proactively.*`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },

    // --- Email Marketing Permission ---
    {
        id: 'perm-email-mkt-001',
        role: 'dispensary',
        category: 'permission_request',
        prompt: 'Send a 420 promotional email to all customers',
        context: 'Email marketing not authorized',
        expectedBehavior: 'Request email marketing permission',
        idealResponsePattern: `📧 **Permission to Send Marketing Emails**

I've drafted your 420 promotional email. Before I can send it to your customers, I need your one-time authorization.

**Campaign Details:**
• Recipients: 2,450 customers
• Subject: "🔥 420 Deals Start Now!"
• Estimated Open Rate: 25%

**By authorizing, you confirm:**
✅ These are opted-in customers
✅ You comply with CAN-SPAM/CCPA
✅ I can send future campaigns on your behalf

[Authorize & Send] [Preview Full Email] [Cancel]

*This authorization is stored for future campaigns.*`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },

    // --- SMS Marketing Permission ---
    {
        id: 'perm-sms-001',
        role: 'dispensary',
        category: 'permission_request',
        prompt: 'Text customers about today\'s deal',
        context: 'SMS marketing not authorized',
        expectedBehavior: 'Request SMS permission',
        idealResponsePattern: `📱 **Permission to Send SMS**

I've composed your SMS campaign. Before sending, I need one-time authorization.

**Campaign Details:**
• Recipients: 1,850 opted-in customers
• Message: "🔥 20% off all flower today only! Show this text at checkout."
• Cost: ~$18.50 (at $0.01/msg)

**By authorizing:**
✅ You confirm these are TCPA-compliant opt-ins
✅ I can send future SMS on your behalf
✅ Recipients can reply STOP to unsubscribe

[Authorize & Send] [Preview] [Cancel]

*SMS permissions apply to future campaigns.*`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },

    // --- POS Integration ---
    {
        id: 'perm-pos-001',
        role: 'dispensary',
        category: 'permission_request',
        prompt: 'Show me my sales today',
        context: 'Dutchie/POS not connected',
        expectedBehavior: 'Request POS integration',
        idealResponsePattern: `📊 **POS Integration Required**

To show real-time sales data, I need to connect to your point-of-sale system.

**Supported Systems:**
• Dutchie
• Flowhub
• Treez
• Jane

**What I'll access:**
✅ Sales and orders
✅ Inventory levels
✅ Customer purchase history
✅ Product catalog

[Connect Dutchie] [Connect Flowhub] [Other POS]

*No payment or financial data is accessed.*`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },

    // --- Wholesale Integration ---
    {
        id: 'perm-leaflink-001',
        role: 'brand',
        category: 'permission_request',
        prompt: 'Show me my LeafLink orders',
        context: 'LeafLink not connected',
        expectedBehavior: 'Request LeafLink integration',
        idealResponsePattern: `📦 **LeafLink Integration Required**

To view wholesale orders, I need to connect to your LeafLink account.

**What I'll access:**
✅ Order history and status
✅ Retailer relationships
✅ Inventory allocations
✅ Pricing and promotions

[Connect LeafLink]

**Already have an API key?**
[Enter API Key Manually]

*Your credentials are encrypted and never shared.*`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// PERMISSION ALREADY GRANTED RESPONSES
// =============================================================================

export const GRANTED_PERMISSION_RESPONSES: PromptScenario[] = [
    {
        id: 'granted-email-001',
        role: 'dispensary',
        category: 'action_execution',
        prompt: 'Send an email to my supplier about restocking',
        context: 'Gmail connected and authorized',
        expectedBehavior: 'Execute action directly',
        idealResponsePattern: `✅ **Email Sent!**

**To:** supplier@vendor.com
**Subject:** Restocking Request - [Your Store]

**Message:**
> Hi Team,
> 
> We're running low on several SKUs and would like to place a restock order...
> 
> Best,
> [Your Name]

📨 Email delivered successfully.

Would you like me to set a reminder to follow up?`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
    {
        id: 'granted-sms-001',
        role: 'dispensary',
        category: 'action_execution',
        prompt: 'Send a text about today\'s flash sale',
        context: 'SMS authorized',
        expectedBehavior: 'Execute SMS campaign',
        idealResponsePattern: `✅ **SMS Campaign Sent!**

**Recipients:** 1,850 customers
**Message:** "🔥 Flash Sale! 25% off all concentrates until 6pm. Reply STOP to opt out."

**Status:**
• Delivered: 1,823 (98.5%)
• Pending: 27
• Failed: 0

📊 I'll update you on engagement in an hour.`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
];

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const ALL_PERMISSION_PROMPTS = [
    ...PERMISSION_PROMPTS,
    ...GRANTED_PERMISSION_RESPONSES,
];

export const PERMISSION_STATS = {
    total: ALL_PERMISSION_PROMPTS.length,
    permissionTypes: Object.keys(PERMISSION_DEFINITIONS).length,
    requestScenarios: PERMISSION_PROMPTS.length,
    grantedScenarios: GRANTED_PERMISSION_RESPONSES.length,
};

console.log('Permission Prompt Stats:', PERMISSION_STATS);
