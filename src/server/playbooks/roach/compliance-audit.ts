
/**
 * Roach's Deep Compliance Audit Playbook
 * 
 * Strategy:
 * 1. Scout: Scan the website/menu for compliance keywords (CA Warning, License #).
 * 2. Verify: Cross-reference findings with Knowledge Graph (Archival Memory).
 * 3. Report: Generate a Google Doc with the audit results.
 */

export const ROACH_COMPLIANCE_AUDIT = {
    id: 'roach-compliance-audit-v1',
    name: 'Deep Compliance Audit',
    agent: 'roach',
    description: 'Scans brand assets for regulatory compliance and cross-references with state laws.',
    steps: [
        {
            id: 'scan_site',
            action: 'research.deep',
            params: {
                query: 'Find "license number" and "warning label" text on [Brand URL]',
                depth: 1
            }
        },
        {
            id: 'check_knowledge',
            action: 'archival.search',
            params: {
                query: 'Labeling requirements for California cannabis products',
                tags: ['#compliance', '#labeling']
            }
        },
        {
            id: 'generate_report',
            action: 'google.docs.create',
            params: {
                title: 'Compliance Audit Report - [Date]',
                content: 'Executive Summary: ... (Generated from Step 1 & 2)' // Agent fills this
            }
        }
    ]
};
