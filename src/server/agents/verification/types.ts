export interface VerificationResult {
    passed: boolean;
    score: number; // 0-100
    issues: string[];
    suggestion?: string;
}

export interface VerificationContext {
    agentId: string;
    task: string;
    originalPrompt: string;
    previousAttempts: number;
}

export interface Evaluator {
    name: string;
    audit(content: any, context: VerificationContext): Promise<VerificationResult>;
}

export type SuccessHook = (content: any, context: VerificationContext) => Promise<VerificationResult>;
