/**
 * NY Outreach Module
 *
 * Automated outreach pipeline for NY dispensary expansion.
 * Coordinates email verification, template generation, sending, and logging.
 */

export { executeOutreach, sendTestOutreachBatch, getOutreachStats, sendOutreachDigest } from './outreach-service';
export { generateOutreachEmails } from './email-templates';
export { saveResearchedLeads, getLeadsForSpreadsheet, syncToDriverSpreadsheet } from './lead-research';

export type { OutreachLead, OutreachResult } from './outreach-service';
export type { OutreachEmailData, OutreachEmail } from './email-templates';
export type { ResearchedLead } from './lead-research';
export { researchNewLeads } from './contact-research';
