
/**
 * Agentic Eval Engine
 * A lightweight framework for evaluating agent-generated code and logic.
 */

export interface EvalResult {
    testName: string;
    passed: boolean;
    score: number; // 0 to 1
    feedback?: string;
    metadata?: Record<string, any>;
}

export interface Eval {
    name: string;
    category: 'correctness' | 'security' | 'readability' | 'reliability';
    run: (input: any) => Promise<EvalResult>;
}

export class EvalEngine {
    private static instance: EvalEngine;
    private evals: Eval[] = [];

    private constructor() {}

    public static getInstance(): EvalEngine {
        if (!EvalEngine.instance) {
            EvalEngine.instance = new EvalEngine();
        }
        return EvalEngine.instance;
    }

    public register(evaluation: Eval) {
        this.evals.push(evaluation);
    }

    public async runCategory(category: string, input: any): Promise<EvalResult[]> {
        const relevantEvals = this.evals.filter(e => e.category === category);
        const results: EvalResult[] = [];

        for (const evaluation of relevantEvals) {
            try {
                const result = await evaluation.run(input);
                results.push(result);
            } catch (error: any) {
                results.push({
                    testName: evaluation.name,
                    passed: false,
                    score: 0,
                    feedback: `Eval Failed: ${error.message}`
                });
            }
        }

        return results;
    }

    public async runAll(input: any): Promise<EvalResult[]> {
        const results: EvalResult[] = [];
        for (const evaluation of this.evals) {
            results.push(await evaluation.run(input));
        }
        return results;
    }
}
