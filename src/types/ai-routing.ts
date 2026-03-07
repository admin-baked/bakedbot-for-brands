export type AIProvider = 'glm' | 'anthropic';

export type AISensitivityLabel =
  | 'public'
  | 'internal_non_pii'
  | 'sensitive';

export type AITextTaskClass =
  | 'extraction'
  | 'fast_synthesis'
  | 'standard'
  | 'strategic';

export interface AIRoutingMetadata {
  sensitivity: AISensitivityLabel;
  provider: AIProvider;
  model: string;
  task: AITextTaskClass;
  reason?: string;
}
