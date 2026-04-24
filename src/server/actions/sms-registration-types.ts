/**
 * Shared SMS registration types/defaults.
 *
 * Kept outside the server-action file because 'use server' modules can only
 * export async functions.
 */

export interface SmsRegistrationData {
    // Business Info
    legalName: string;
    dba: string;
    ein: string;
    entityType: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    website: string;
    yearsInBusiness: string;
    // Contact
    contactFirstName: string;
    contactLastName: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone: string;
    // Campaign
    useCase: string;
    campaignName: string;
    campaignDescription: string;
    sampleMessage1: string;
    sampleMessage2: string;
    sampleMessage3: string;
    optInMethod: string;
    optInConfirmation: boolean;
    ageGate: boolean;
    // Provider
    preferredAreaCode: string;
    providerAccountEmail: string;
    providerApiKey: string;
    // Meta
    submittedAt?: string;
    status: 'draft' | 'ready' | 'submitted';
}

export const EMPTY_SMS_REGISTRATION: SmsRegistrationData = {
    legalName: '',
    dba: '',
    ein: '',
    entityType: 'LLC',
    street: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    yearsInBusiness: '',
    contactFirstName: '',
    contactLastName: '',
    contactTitle: '',
    contactEmail: '',
    contactPhone: '',
    useCase: 'Marketing',
    campaignName: '',
    campaignDescription: '',
    sampleMessage1: '',
    sampleMessage2: '',
    sampleMessage3: '',
    optInMethod: '',
    optInConfirmation: true,
    ageGate: true,
    preferredAreaCode: '',
    providerAccountEmail: '',
    providerApiKey: '',
    status: 'draft',
};
