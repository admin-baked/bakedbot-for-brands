export const PULSE_PRESET_KEYS = ['regulations', 'marketing', 'products', 'trends'] as const;
export type PulsePresetKey = typeof PULSE_PRESET_KEYS[number];
export type PulseTopic = 'default' | PulsePresetKey;

export interface PulseNewsItem {
    title: string;
    url: string;
    snippet: string;
    suggestedAngle: string;
}

export interface PulseTopicResult {
    topic: PulseTopic;
    count: number;
    status: 'cached' | 'failed';
}
