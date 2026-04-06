import {
  callClaude,
  CLAUDE_REASONING_MODEL,
  CLAUDE_TOOL_MODEL,
} from '@/ai/claude';
import { callGLM, GLM_MODELS, isGLMConfigured, type GLMModel } from '@/ai/glm';
import { getGLMUsageStatus } from '@/server/services/glm-usage';
import type {
  AIProvider,
  AIRoutingMetadata,
  AISensitivityLabel,
  AITextTaskClass,
} from '@/types/ai-routing';

export interface ResolveTextModelRouteInput {
  sensitivity: AISensitivityLabel;
  task?: AITextTaskClass;
  preferredProvider?: AIProvider;
  requiresTools?: boolean;
  requiresVision?: boolean;
}

export interface RoutedTextGenerationInput {
  sensitivity: AISensitivityLabel;
  task: AITextTaskClass;
  userMessage: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: AIProvider;
  requiresTools?: boolean;
  requiresVision?: boolean;
  allowFallback?: boolean;
}

export interface RoutedTextGenerationResult {
  content: string;
  route: AIRoutingMetadata;
}

function selectGLMModel(task: AITextTaskClass): GLMModel {
  switch (task) {
    case 'extraction':
      return GLM_MODELS.EXTRACTION;
    case 'fast_synthesis':
      return GLM_MODELS.FAST_SYNTHESIS;
    case 'strategic':
      return GLM_MODELS.STRATEGIC;
    case 'standard':
    default:
      return GLM_MODELS.STANDARD;
  }
}

function selectAnthropicModel(task: AITextTaskClass): string {
  return task === 'strategic' ? CLAUDE_REASONING_MODEL : CLAUDE_TOOL_MODEL;
}

export async function resolveTextModelRoute(
  input: ResolveTextModelRouteInput
): Promise<AIRoutingMetadata> {
  const task = input.task ?? 'standard';

  if (input.requiresTools || input.requiresVision) {
    return {
      sensitivity: input.sensitivity,
      provider: 'anthropic',
      model: selectAnthropicModel(task),
      task,
      reason: input.requiresTools
        ? 'Anthropic required for tool-calling workflows'
        : 'Anthropic required for vision workflows',
    };
  }

  if (input.sensitivity === 'sensitive') {
    return {
      sensitivity: input.sensitivity,
      provider: 'anthropic',
      model: selectAnthropicModel(task),
      task,
      reason: 'Sensitive workloads stay on Anthropic',
    };
  }

  const preferredProvider =
    input.preferredProvider ?? (await getGLMUsageStatus()).provider;

  if (preferredProvider === 'glm' && isGLMConfigured()) {
    return {
      sensitivity: input.sensitivity,
      provider: 'glm',
      model: selectGLMModel(task),
      task,
      reason: 'GLM selected for non-sensitive cost-optimized text generation',
    };
  }

  return {
    sensitivity: input.sensitivity,
    provider: 'anthropic',
    model: selectAnthropicModel(task),
    task,
    reason: preferredProvider === 'glm'
      ? 'GLM unavailable, falling back to Anthropic'
      : 'Anthropic selected by provider preference',
  };
}

export async function callRoutedTextModel(
  input: RoutedTextGenerationInput
): Promise<RoutedTextGenerationResult> {
  const route = await resolveTextModelRoute(input);

  if (route.provider === 'glm') {
    try {
      const content = await callGLM({
        userMessage: input.userMessage,
        systemPrompt: input.systemPrompt,
        model: route.model as GLMModel,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });

      return { content, route };
    } catch (error) {
      if (input.allowFallback === false) {
        throw error;
      }

      const fallbackRoute: AIRoutingMetadata = {
        sensitivity: input.sensitivity,
        provider: 'anthropic',
        model: selectAnthropicModel(input.task),
        task: input.task,
        reason: 'GLM failed, falling back to Anthropic',
      };

      const content = await callClaude({
        userMessage: input.userMessage,
        systemPrompt: input.systemPrompt,
        model: fallbackRoute.model,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });

      return { content, route: fallbackRoute };
    }
  }

  const content = await callClaude({
    userMessage: input.userMessage,
    systemPrompt: input.systemPrompt,
    model: route.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
  });

  return { content, route };
}

