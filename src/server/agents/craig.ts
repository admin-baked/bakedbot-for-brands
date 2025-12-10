import { AgentImplementation } from './harness';
import { CraigMemory, CampaignSchema } from './schemas';
import { deebo } from './deebo';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Craig: The Marketing Automation Agent
export const craigAgent: AgentImplementation<CraigMemory> = {
  agentName: 'craig',

  async initialize(brandMemory, agentMemory) {
    logger.info('[Craig] Initializing. Checking compliance strictness...');

    // Example Sanity Check: Ensure all active campaigns have a valid objective in Brand Memory
    // In a real implementation, we might pause campaigns whose objective was achieved.
    agentMemory.campaigns.forEach(campaign => {
      const parentObj = brandMemory.priority_objectives.find(o => o.id === campaign.objective_id);
      if (parentObj?.status === 'achieved' && campaign.status === 'running') {
        logger.info(`[Craig] Pausing campaign ${campaign.id} because objective ${parentObj.id} is achieved.`);
        campaign.status = 'completed';
      }
    });

    return agentMemory;
  },

  async orient(brandMemory, agentMemory) {
    // Strategy: Find the first "failing" or "queued" campaign that matches an active objective
    const candidates = agentMemory.campaigns.filter(c =>
      ['failing', 'queued', 'running'].includes(c.status)
    );

    // Sort by priority (failing first, then queued)
    candidates.sort((a, b) => {
      if (a.status === 'failing' && b.status !== 'failing') return -1;
      if (b.status === 'failing' && a.status !== 'failing') return 1;
      return 0; // maintain order
    });

    return candidates.length > 0 ? candidates[0].id : null;
  },

  async act(brandMemory, agentMemory, targetId, tools: any) {
    const campaignIndex = agentMemory.campaigns.findIndex(c => c.id === targetId);

    if (campaignIndex === -1) {
      throw new Error(`Target campaign ${targetId} not found`);
    }

    const campaign = agentMemory.campaigns[campaignIndex];
    let resultMessage = '';

    // Action Logic based on Status
    if (campaign.status === 'queued') {
      // 1. Generate Content (Stub)
      const content = `Exclusive offer: Get 20% off your next order!`;

      // 2. Check Compliance
      if (campaign.constraints.requires_deebo_check) {
        // We check against the first jurisdiction for simplicity in Phase 2
        const jurisdiction = campaign.constraints.jurisdictions[0] || 'IL';
        const compliance = await deebo.checkContent(jurisdiction, 'sms', content);

        if (compliance.status === 'fail') {
          resultMessage = `Compliance Check Failed: ${compliance.violations.join(', ')}`;
          // Mark as failing so we fix it next cycle
          campaign.status = 'failing';
          // Log specific violation in notes
          if (!campaign.notes) campaign.notes = [];
          campaign.notes.push(`Compliance Violation: ${compliance.violations.join('; ')}`);
        } else {
          resultMessage = `Compliance Passed. Campaign Launched.`;
          campaign.status = 'running';
          campaign.last_run = new Date().toISOString();
        }
      } else {
        // Skip check
        campaign.status = 'running';
        resultMessage = 'Campaign Launched (No Compliance Check Required)';
      }
    } else if (campaign.status === 'running') {
      // 3. Monitor & Update KPI (Stub)
      // In reality, we'd query Pops or an Analytics Service here
      const previous = campaign.kpi.current;
      // Simulate improvement
      const mockImprovement = 0.02;
      campaign.kpi.current = Math.min(1.0, previous + mockImprovement);

      resultMessage = `Updated KPI: ${previous.toFixed(2)} -> ${campaign.kpi.current.toFixed(2)}`;

      if (campaign.kpi.current >= campaign.kpi.target) {
        campaign.status = 'passing';
        resultMessage += ` (Target Achieved!)`;
      }
    } else if (campaign.status === 'failing') {
      // Attempt remediation (Stub)
      resultMessage = "Attempted remediation on failing campaign. Resetting to queued.";
      campaign.status = 'queued'; // Retry loop
    }

    // Return updated memory + log entry
    // We clone the memory effectively by returning the modified object (passed by reference in JS, but harness expects explicit return)
    return {
      updatedMemory: agentMemory,
      logEntry: {
        action: campaign.status === 'running' ? 'monitor_update' : 'launch_attempt',
        result: resultMessage,
        next_step: campaign.status === 'passing' ? 'archive' : 'continue_monitoring',
        metadata: {
          campaign_id: campaign.id,
          kpi_current: campaign.kpi.current
        }
      }
    };
  }
};

export async function handleCraigEvent(orgId: string, eventId: string) {
  logger.info(`[Craig] Handled event ${eventId} for org ${orgId} (Stub)`);
}

