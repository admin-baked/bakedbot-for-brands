/**
 * Intuition OS - Deebo Intuition (Compliance & Security)
 * 
 * Focus: Rules, Safety, Auditing
 * 
 * Deebo is the "Superego". He blocks risky actions and flags suspicious behavior.
 * This module manages compliance rules and the "Rule Check" loop.
 */

import {
    DeeboAlert,
    ComplianceEvent,
    ComplianceStatus,
    AgentEventType,
    AlertKind,
    AlertSeverity
} from './schema';
import { logAgentEvent } from './agent-events';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getAlertsCollection(tenantId: string) {
    return `tenants/${tenantId}/deeboAlerts`;
}

function getComplianceEventsCollection(tenantId: string) {
    return `tenants/${tenantId}/complianceEvents`;
}

// --- Compliance Checking ---

interface CheckResult {
    status: ComplianceStatus;
    issues: string[];
    ruleHits: string[]; // IDs of rules triggered
}

/**
 * Validates content against active compliance rules.
 * This is the primary function called by other agents (e.g. Craig) before sending messages.
 */
export async function checkContent(
    tenantId: string,
    content: string,
    channel: 'sms' | 'email' | 'web' | 'in_store',
    jurisdiction: string
): Promise<CheckResult> {
    // In a real implementation, this would load rules from Firestore (heuristics engine)
    // For V1, we'll implement some "Hard" rules via code for demonstration/speed.

    const issues: string[] = [];
    const ruleHits: string[] = [];
    let status: ComplianceStatus = 'pass';

    const lowerContent = content.toLowerCase();

    // RULE 1: No medical claims (Universal)
    if (lowerContent.includes('cure') || lowerContent.includes('heal') || lowerContent.includes('treat')) {
        issues.push('Contains prohibited medical claims (cure/heal/treat).');
        ruleHits.push('rule_no_medical_claims');
        status = 'fail';
    }

    // RULE 2: No cartoons/kids appeal (Universal)
    if (lowerContent.includes('candy') || lowerContent.includes('cartoon') || lowerContent.includes('kid')) {
        issues.push('Contains terms appealing to children.');
        ruleHits.push('rule_no_kids_appeal');
        status = 'fail';
    }

    // RULE 3: Jurisdiction Specific (Example: IL require "Adult Use Only")
    if (jurisdiction === 'IL' && !lowerContent.includes('adult use only')) {
        issues.push('Missing required disclaimer: "Adult Use Only"');
        ruleHits.push('rule_il_disclaimer');
        status = 'warning'; // Maybe just a warning, or strict fail? Let's say Warning for now.
    }

    // Determine final status
    if (status === 'fail') {
        // Log the failure
        await logComplianceEvent(tenantId, {
            channel,
            status: 'fail',
            ruleHits: ruleHits.map(r => ({ ruleId: r, severity: 'blocker' })),
            contentHash: Buffer.from(content).toString('base64').slice(0, 20), // Simple hash
            contentPreview: content.slice(0, 50),
            checkedBy: 'deebo',
        });
    }

    return { status, issues, ruleHits };
}

// --- Logging & Alerts ---

/**
 * Logs a compliance check result.
 */
export async function logComplianceEvent(
    tenantId: string,
    event: Omit<ComplianceEvent, 'id' | 'tenantId' | 'createdAt'>
): Promise<string> {
    const { firestore } = await createServerClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullEvent: ComplianceEvent = {
        ...event,
        id,
        tenantId,
        createdAt: now,
    };

    try {
        await firestore
            .collection(getComplianceEventsCollection(tenantId))
            .doc(id)
            .set(fullEvent);

        // Emit to Event Stream (Loop 1)
        // This allows 'Smokey' or 'Craig' to know their action was blocked/checked.
        await logAgentEvent({
            id: uuidv4(),
            tenantId,
            agent: 'deebo',
            sessionId: 'compliance_check',
            type: 'rule_check',
            payload: {
                status: event.status,
                ruleHits: event.ruleHits,
                contentPreview: event.contentPreview
            },
            systemMode: 'fast',
            createdAt: now,
        });

        return id;
    } catch (error) {
        logger.error(`[Deebo] Failed to log compliance event: ${error}`);
        // Fallback: don't block the flow if logging fails, but warn.
        return id;
    }
}

/**
 * Triggers a security/compliance alert.
 */
export async function triggerAlert(
    tenantId: string,
    alert: Omit<DeeboAlert, 'id' | 'tenantId' | 'createdAt' | 'resolved'>
): Promise<string> {
    const { firestore } = await createServerClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullAlert: DeeboAlert = {
        ...alert,
        id,
        tenantId,
        resolved: false,
        createdAt: now,
    };

    try {
        await firestore
            .collection(getAlertsCollection(tenantId))
            .doc(id)
            .set(fullAlert);

        // Important: Log as Agent Event so it appears in feeds
        await logAgentEvent({
            id: uuidv4(),
            tenantId,
            agent: 'deebo',
            sessionId: 'system_alert',
            type: 'alert_issued',
            payload: {
                title: alert.title,
                kind: alert.kind,
                severity: alert.severity,
                evidence: alert.evidence,
            },
            confidenceScore: 1.0,
            systemMode: 'fast',
            createdAt: now,
        });

        logger.warn(`[Deebo] ALERT TRIGGERED: ${alert.title}`);
        return id;
    } catch (error) {
        logger.error(`[Deebo] Failed to trigger alert: ${error}`);
        throw error;
    }
}
