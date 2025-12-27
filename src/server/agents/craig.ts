import { AgentImplementation } from './harness';
import { CraigMemory, CampaignSchema } from './schemas';
import { ComplianceResult } from './deebo'; // Assuming this is exported from deebo.ts
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { calculateCampaignPriority } from '../algorithms/craig-algo';

// --- Tool Definitions ---

export interface CraigTools {
  generateCopy(prompt: string, context: any): Promise<string>;
  validateCompliance(content: string, jurisdictions: string[]): Promise<ComplianceResult>;
  sendSms(to: string, body: string, metadata?: any): Promise<boolean>;
  getCampaignMetrics(campaignId: string): Promise<{ kpi: number }>;
}

// --- Craig Agent Implementation ---

export const craigAgent: AgentImplementation<CraigMemory, CraigTools> = {
  agentName: 'craig',

  async initialize(brandMemory, agentMemory) {
    logger.info('[Craig] Initializing. Checking compliance strictness...');

    // Example Sanity Check: Ensure all active campaigns have a valid objective in Brand Memory
    agentMemory.campaigns.forEach(campaign => {
      const parentObj = brandMemory.priority_objectives.find(o => o.id === campaign.objective_id);
      if (parentObj?.status === 'achieved' && campaign.status === 'running') {
        logger.info(`[Craig] Pausing campaign ${campaign.id} because objective ${parentObj.id} is achieved.`);
        campaign.status = 'completed';
      }
    });

    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    // 0. Chat / Direct Command Override
    if (stimulus && typeof stimulus === 'string') {
      return 'chat_response';
    }
    // Strategy: Find the first "failing" or "queued" campaign that matches an active objective
    const candidates = agentMemory.campaigns.filter(c =>
      ['failing', 'queued', 'running'].includes(c.status)
    );

    // Sort by algorithmic priority
    candidates.sort((a, b) => {
      // Map to candidate shape expected by algo
      const scoreA = calculateCampaignPriority({
        id: a.id,
        objective: a.objective,
        status: a.status,
        impact_score: 8, // Stub: Fetch from memory/metadata
        urgency_score: a.constraints.jurisdictions.includes('IL') ? 9 : 5, // Stub: Heuristic
        fatigue_score: 2 // Stub
      });

      const scoreB = calculateCampaignPriority({
        id: b.id,
        objective: b.objective,
        status: b.status,
        impact_score: 8,
        urgency_score: b.constraints.jurisdictions.includes('IL') ? 9 : 5,
        fatigue_score: 2
      });

      return scoreB - scoreA; // Descending
    });

    return candidates.length > 0 ? candidates[0].id : null;
  },

  async act(brandMemory, agentMemory, targetId, tools: CraigTools, stimulus?: string) {
    // Handle chat/conversational requests
    if (targetId === 'chat_response' && stimulus) {
      const lowerStimulus = stimulus.toLowerCase();
      const brandName = (brandMemory as any).brandName || 'your brand';
      
      // Detect content creation requests for enhanced prompting
      const isContentCreation = 
        lowerStimulus.includes('social media') ||
        lowerStimulus.includes('post') ||
        lowerStimulus.includes('announcement') ||
        lowerStimulus.includes('content') ||
        lowerStimulus.includes('copy') ||
        lowerStimulus.includes('write') ||
        lowerStimulus.includes('draft') ||
        lowerStimulus.includes('campaign');
      
      let systemPrompt: string;
      
      if (isContentCreation) {
        systemPrompt = `You are Craig, a premium marketing and content strategist for cannabis brands. The user is asking about creating content.

Your style:
- Professional yet engaging
- High-energy and confident
- You provide MULTIPLE variations when asked for content
- You ask clarifying questions when needed (platform, tone, audience)
- You understand cannabis industry compliance

For social media posts, ALWAYS provide:
1. At least 2-3 different variations (Professional, Casual/Hype, Educational)
2. Suggested hashtags relevant to cannabis marketing
3. Best times to post if relevant
4. Any compliance notes for cannabis content

Brand context: ${brandName}

User request: "${stimulus}"

Generate a helpful, actionable response with concrete content options.`;
      } else {
        systemPrompt = `You are Craig, a marketing and content expert for cannabis brands. Answer this question helpfully and provide actionable advice.

Brand context: ${brandName}
User question: "${stimulus}"`;
      }
      
      const response = await tools.generateCopy(systemPrompt, { 
        brandName, 
        constraints: brandMemory.constraints 
      });
      
      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'chat_response',
          result: response,
          next_step: 'await_user_input',
          metadata: { stimulus, isContentCreation }
        }
      };
    }

    const campaignIndex = agentMemory.campaigns.findIndex(c => c.id === targetId);

    if (campaignIndex === -1) {
      // If no campaign found and no stimulus, return a helpful message
      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'no_action',
          result: 'No active campaigns to manage right now. Ask me about marketing strategy, content creation, or campaign planning!',
          next_step: 'await_user_input',
          metadata: {}
        }
      };
    }

    const campaign = agentMemory.campaigns[campaignIndex];
    let resultMessage = '';

    // Action Logic based on Status
    if (campaign.status === 'queued') {
      // 1. Generate Content via Tool
      logger.info(`[Craig] Generating copy for campaign ${campaign.id}...`);
      const context = { objective: campaign.objective, constraints: brandMemory.constraints }; // simplified context
      const content = await tools.generateCopy(`Draft an SMS for: ${campaign.objective}`, context);


      // 2. Check Compliance via Tool
      if (campaign.constraints.requires_deebo_check) {
        const jurisdiction = campaign.constraints.jurisdictions[0] || 'IL';
        const compliance = await tools.validateCompliance(content, [jurisdiction]);

        if (compliance.status === 'fail') {
          resultMessage = `Compliance Check Failed: ${compliance.violations.join(', ')}`;
          campaign.status = 'failing';
          if (!campaign.notes) campaign.notes = [];
          campaign.notes.push(`Compliance Violation: ${compliance.violations.join('; ')}`);
        } else {
          // 3. Send SMS (Mock/Real) via Tool
          // In a real scenario, we'd probably schedule it or send to a test group first.
          // For this agent, we'll assume we are launching.
          // We don't have a specific 'target audience' list in the memory stub, so we'll mock logical dispatch
          logger.info(`[Craig] Dispatching to segment...`);
          // Assuming tools.sendSms handles batch or we just call it once for 'launch'
          // For now, let's say "Launch" just changes state, sending might happen in a separate 'delivery' agent or step. 
          // But let's use the tool to prove we accessed it.
          const sent = await tools.sendSms('OBJECTIVE_AUDIENCE', content, { campaignId: campaign.id });

          if (sent) {
            resultMessage = `Compliance Passed. Campaign Launched & Sent.`;
            campaign.status = 'running';
            campaign.last_run = new Date().toISOString();
          } else {
            resultMessage = `Compliance Passed, but Sending Failed.`;
            campaign.status = 'failing';
          }
        }
      } else {
        campaign.status = 'running';
        resultMessage = 'Campaign Launched (No Compliance Check Required)';
      }
    } else if (campaign.status === 'running') {
      // 3. Monitor & Update KPI via Tool
      const metrics = await tools.getCampaignMetrics(campaign.id);

      const previous = campaign.kpi.current;
      campaign.kpi.current = metrics.kpi; // Update with real(ish) data

      resultMessage = `Updated KPI: ${previous.toFixed(2)} -> ${campaign.kpi.current.toFixed(2)}`;

      if (campaign.kpi.current >= campaign.kpi.target) {
        campaign.status = 'passing';
        resultMessage += ` (Target Achieved!)`;
      }
    } else if (campaign.status === 'failing') {
      resultMessage = "Attempted remediation on failing campaign. Resetting to queued.";
      campaign.status = 'queued'; // Retry loop
    }

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

