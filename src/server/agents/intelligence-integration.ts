/**
 * MERIDIAN Agent Runner Integration
 *
 * Enhances agent execution with MERIDIAN features:
 * - Cursed Input Protection
 * - Completeness Doctrine
 * - Personality Modes & Sliders
 * - Cognitive State Tracking
 * - Confidence Scoring
 *
 * Wraps the existing runAgentCore function with minimal changes.
 */

import { logger } from '@/lib/logger';
import { AgentResult, ChatExtraOptions } from './agent-runner';
import { DecodedIdToken } from 'firebase-admin/auth';
import {
    cursedInputProtection,
    completenessDoctrineService,
    cognitiveStateManager,
} from '@/server/services/letta';
import { PERSONALITY_MODE_DEFINITIONS } from '@/types/agent-cognitive-state';

// =============================================================================
// MERIDIAN-ENHANCED AGENT EXECUTION
// =============================================================================

export interface MeridianEnhancedOptions {
    /** Enable cursed input protection (default: true) */
    enableInputProtection?: boolean;
    /** Enable completeness checking (default: true) */
    enableCompletenessCheck?: boolean;
    /** Enable cognitive state tracking (default: true) */
    enableStateTracking?: boolean;
    /** Apply personality mode sliders (default: true) */
    applyPersonalityMode?: boolean;
}

const DEFAULT_OPTIONS: MeridianEnhancedOptions = {
    enableInputProtection: true,
    enableCompletenessCheck: true,
    enableStateTracking: true,
    applyPersonalityMode: true,
};

/**
 * MERIDIAN-enhanced agent execution wrapper
 *
 * Wraps the standard agent runner with MERIDIAN safety and quality features.
 */
export async function runWithMeridian(
    agentId: string,
    agentName: string,
    userMessage: string,
    executeFn: () => Promise<AgentResult>,
    options: MeridianEnhancedOptions = {},
    injectedUser?: DecodedIdToken | null
): Promise<AgentResult> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const tenantId = injectedUser?.orgId || injectedUser?.brandId || injectedUser?.uid || 'default';

    const startTime = Date.now();

    // =========================================================================
    // 1. CURSED INPUT PROTECTION
    // =========================================================================
    if (config.enableInputProtection) {
        const inputCheck = await cursedInputProtection.checkInputSafety(userMessage);

        if (inputCheck.isCursed) {
            logger.warn('[MERIDIAN] Cursed input detected', {
                reason: inputCheck.reason,
                severity: inputCheck.severity,
                agentId,
            });

            // Log incident
            await cursedInputProtection.logIncident(
                inputCheck,
                userMessage,
                injectedUser?.uid || 'anonymous',
                tenantId
            );

            // Block critical threats
            if (inputCheck.severity === 'critical') {
                return {
                    content: "I detected a potentially malicious input pattern and cannot process this request for security reasons. Please rephrase your question.",
                    toolCalls: [],
                    metadata: {
                        type: 'cursed_input_blocked',
                        reason: inputCheck.reason,
                        severity: inputCheck.severity,
                    },
                };
            }

            // For non-critical, use sanitized version
            if (inputCheck.sanitized) {
                userMessage = inputCheck.sanitized;
            }
        }
    }

    // =========================================================================
    // 2. LOAD COGNITIVE STATE & APPLY PERSONALITY
    // =========================================================================
    let systemPromptAdditions = '';

    if (config.applyPersonalityMode) {
        try {
            const state = await cognitiveStateManager.getState(agentId, tenantId);

            if (state) {
                // Apply personality mode modifier
                const modeDefinition = PERSONALITY_MODE_DEFINITIONS[state.personalityMode];
                if (modeDefinition.systemPromptModifier) {
                    systemPromptAdditions += `\n\n${modeDefinition.systemPromptModifier}`;
                }

                // Apply behavior slider modifiers
                const sliders = state.behaviorSliders;

                // Verbosity
                if (sliders.verbosity >= 70) {
                    systemPromptAdditions += '\nProvide detailed, comprehensive responses with examples and explanations.';
                } else if (sliders.verbosity <= 30) {
                    systemPromptAdditions += '\nBe concise and direct. Provide brief, to-the-point responses.';
                }

                // Creativity
                if (sliders.creativity >= 70) {
                    systemPromptAdditions += '\nThink creatively and propose innovative solutions. Consider unconventional approaches.';
                } else if (sliders.creativity <= 30) {
                    systemPromptAdditions += '\nStick to proven, conventional approaches. Prioritize stability over innovation.';
                }

                // Directness
                if (sliders.directness >= 70) {
                    systemPromptAdditions += '\nBe direct and straightforward. Get to the point quickly.';
                } else if (sliders.directness <= 30) {
                    systemPromptAdditions += '\nBe diplomatic and considerate. Soften critiques with positive framing.';
                }

                // Technicality
                if (sliders.technicality >= 70) {
                    systemPromptAdditions += '\nUse technical language and industry-specific terminology. Assume expert-level knowledge.';
                } else if (sliders.technicality <= 30) {
                    systemPromptAdditions += '\nUse simple, accessible language. Explain technical concepts in layman\'s terms.';
                }

                // Proactivity
                if (sliders.proactivity >= 70) {
                    systemPromptAdditions += '\nProactively suggest next steps, improvements, and related actions the user should consider.';
                } else if (sliders.proactivity <= 30) {
                    systemPromptAdditions += '\nRespond only to what was asked. Avoid unsolicited suggestions.';
                }

                // Humor
                if (sliders.humor >= 70) {
                    systemPromptAdditions += '\nIncorporate appropriate humor, wit, and personality into responses.';
                } else if (sliders.humor <= 30) {
                    systemPromptAdditions += '\nMaintain a serious, professional tone. Avoid jokes or humor.';
                }

                // Compliance
                if (sliders.compliance >= 70) {
                    systemPromptAdditions += '\nStrictly follow all rules, regulations, and compliance requirements. Flag any potential issues.';
                } else if (sliders.compliance <= 30) {
                    systemPromptAdditions += '\nBe flexible and pragmatic. Focus on outcomes over strict rule adherence.';
                }

                // Speed
                if (sliders.speed >= 70) {
                    systemPromptAdditions += '\nPrioritize speed and efficiency. Provide quick, surface-level analysis.';
                } else if (sliders.speed <= 30) {
                    systemPromptAdditions += '\nBe thorough and comprehensive. Take time to analyze deeply.';
                }

                // Mark as active
                await cognitiveStateManager.markActive(agentId, tenantId);
            }
        } catch (error) {
            logger.warn('[MERIDIAN] Failed to load cognitive state', { error, agentId });
        }
    }

    // TODO: Inject systemPromptAdditions into agent execution
    // This requires modifying the agent harness or runAgent to accept dynamic system prompt additions
    // For now, we log them and they'll be integrated in future agent refactor

    // =========================================================================
    // 3. COMPLETENESS DOCTRINE (Intent Extraction)
    // =========================================================================
    let intents: any[] = [];

    if (config.enableCompletenessCheck) {
        try {
            intents = await completenessDoctrineService.extractUserIntents(userMessage);
            logger.info('[MERIDIAN] Extracted intents', {
                count: intents.length,
                agentId,
            });
        } catch (error) {
            logger.warn('[MERIDIAN] Intent extraction failed', { error, agentId });
        }
    }

    // =========================================================================
    // 4. EXECUTE AGENT
    // =========================================================================
    if (config.enableStateTracking) {
        await cognitiveStateManager.updateCognitiveLoad(agentId, tenantId, 1, 0, 0);
    }

    let result: AgentResult;
    try {
        result = await executeFn();
    } finally {
        // Reset cognitive load
        if (config.enableStateTracking) {
            const responseTime = Date.now() - startTime;
            await cognitiveStateManager.updateCognitiveLoad(agentId, tenantId, 0, 0, responseTime);
            await cognitiveStateManager.markIdle(agentId, tenantId);
        }
    }

    // =========================================================================
    // 5. COMPLETENESS VERIFICATION
    // =========================================================================
    if (config.enableCompletenessCheck && intents.length > 0) {
        try {
            const completenessCheck = await completenessDoctrineService.verifyCompleteness(
                intents,
                result.content
            );

            logger.info('[MERIDIAN] Completeness check', {
                score: completenessCheck.completenessScore,
                missed: completenessCheck.missedIntents.length,
                agentId,
            });

            // Log to Firestore for analytics
            await completenessDoctrineService.logCompletenessCheck(
                tenantId,
                agentId,
                intents,
                completenessCheck,
                false // wasCompleted (auto-complete disabled for now)
            );

            // Track completeness score
            if (config.enableStateTracking) {
                await cognitiveStateManager.recordCompletenessScore(
                    agentId,
                    tenantId,
                    completenessCheck.completenessScore
                );
            }

            // TODO: Auto-complete if score is too low (disabled for now to avoid changing agent behavior)
            // if (completenessCheck.completenessScore < 0.8) {
            //     result.content = await completenessDoctrineService.generateCompletion(
            //         completenessCheck.missedIntents,
            //         result.content
            //     );
            // }

            // Add metadata
            result.metadata = {
                ...result.metadata,
                completeness: {
                    score: completenessCheck.completenessScore,
                    missedIntents: completenessCheck.missedIntents.length,
                    allCovered: completenessCheck.allIntentsCovered,
                },
            };
        } catch (error) {
            logger.warn('[MERIDIAN] Completeness verification failed', { error, agentId });
        }
    }

    // =========================================================================
    // 6. CONFIDENCE SCORING (for future enhancement)
    // =========================================================================
    // TODO: Extract confidence from agent response metadata
    // For now, we'll use a default confidence of 0.75 for responses with tool calls
    if (config.enableStateTracking) {
        const confidence = result.toolCalls && result.toolCalls.length > 0 ? 0.85 : 0.75;
        await cognitiveStateManager.recordResponseConfidence(agentId, tenantId, confidence);
    }

    return result;
}

/**
 * Get MERIDIAN system prompt additions for an agent
 *
 * This can be called separately to inject personality/slider behaviors into agent prompts.
 */
export async function getMeridianSystemPromptAdditions(
    agentId: string,
    tenantId: string
): Promise<string> {
    try {
        const state = await cognitiveStateManager.getState(agentId, tenantId);
        if (!state) return '';

        let additions = '';

        // Apply personality mode
        const modeDefinition = PERSONALITY_MODE_DEFINITIONS[state.personalityMode];
        if (modeDefinition.systemPromptModifier) {
            additions += `\n\n${modeDefinition.systemPromptModifier}`;
        }

        // Apply behavior sliders (same logic as above)
        const sliders = state.behaviorSliders;

        if (sliders.verbosity >= 70) {
            additions += '\nProvide detailed, comprehensive responses with examples and explanations.';
        } else if (sliders.verbosity <= 30) {
            additions += '\nBe concise and direct. Provide brief, to-the-point responses.';
        }

        if (sliders.creativity >= 70) {
            additions += '\nThink creatively and propose innovative solutions.';
        } else if (sliders.creativity <= 30) {
            additions += '\nStick to proven, conventional approaches.';
        }

        if (sliders.directness >= 70) {
            additions += '\nBe direct and straightforward.';
        } else if (sliders.directness <= 30) {
            additions += '\nBe diplomatic and considerate.';
        }

        if (sliders.technicality >= 70) {
            additions += '\nUse technical language and industry terminology.';
        } else if (sliders.technicality <= 30) {
            additions += '\nUse simple, accessible language.';
        }

        if (sliders.proactivity >= 70) {
            additions += '\nProactively suggest next steps and improvements.';
        } else if (sliders.proactivity <= 30) {
            additions += '\nRespond only to what was asked.';
        }

        if (sliders.humor >= 70) {
            additions += '\nIncorporate appropriate humor and personality.';
        } else if (sliders.humor <= 30) {
            additions += '\nMaintain a serious, professional tone.';
        }

        if (sliders.compliance >= 70) {
            additions += '\nStrictly follow all compliance requirements.';
        } else if (sliders.compliance <= 30) {
            additions += '\nBe flexible and pragmatic.';
        }

        if (sliders.speed >= 70) {
            additions += '\nPrioritize speed and efficiency.';
        } else if (sliders.speed <= 30) {
            additions += '\nBe thorough and comprehensive.';
        }

        return additions;
    } catch (error) {
        logger.warn('[MERIDIAN] Failed to get system prompt additions', { error, agentId });
        return '';
    }
}
