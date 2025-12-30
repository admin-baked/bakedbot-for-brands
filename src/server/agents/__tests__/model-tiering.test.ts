
// Use relative path to ensure mock hits
jest.mock('../../../ai/genkit', () => ({
  ai: {
    generate: jest.fn().mockImplementation(async (opts: any) => ({ text: `Generated with ${opts.model}` }))
  }
}));

// Mock others
jest.mock('../../jobs/thought-stream', () => ({ emitThought: jest.fn() }));
jest.mock('../../auth/auth', () => ({ requireUser: jest.fn() }));
jest.mock('../persistence', () => ({ persistence: {} }));
jest.mock('../harness', () => ({ runAgent: jest.fn() }));
jest.mock('../../../ai/model-selector', () => ({
  getGenerateOptions: jest.fn((level) => {
      if (level === 'lite') return { model: 'lite-model' };
      if (level === 'deep_research') return { model: 'owl-model' };
      return { model: 'pro-model' };
  }),
  MODEL_CONFIGS: { lite: {}, standard: {} }
}));

// Mock Firebase Admin
jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(),
    DecodedIdToken: {}
}));
jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(),
    Timestamp: { now: jest.fn() }
}));
jest.mock('@/firebase/server-client', () => ({}));
jest.mock('@/server/services/cannmenus', () => ({ CannMenusService: class {} }));

// Mock Agents to prevent their imports from triggering side effects
jest.mock('../craig', () => ({ craigAgent: {} }));
jest.mock('../smokey', () => ({ smokeyAgent: {} }));
jest.mock('../pops', () => ({ popsAgent: {} }));
jest.mock('../ezal', () => ({ ezalAgent: {} }));
jest.mock('../moneyMike', () => ({ moneyMikeAgent: {} })); // The culprit in last run
jest.mock('../mrsParker', () => ({ mrsParkerAgent: {} }));
jest.mock('../deebo', () => ({ deebo: {} })); 

// Mock dynamic import targets (global mocks because they are imported dynamically)
jest.mock('../../services/research-service', () => ({
    researchService: { createTask: jest.fn().mockResolvedValue('task-123') } 
}));
jest.mock('../../../app/dashboard/research/actions', () => ({
    createResearchTaskAction: jest.fn().mockResolvedValue({ success: true, taskId: 'task-123' })
}));
jest.mock('../../actions/playbooks', () => ({
    createPlaybookFromNaturalLanguage: jest.fn().mockResolvedValue({ 
        success: true, 
        playbook: { name: 'Test PB', description: 'Desc', agent: 'General', category: 'Test', steps: [] } 
    })
}));
jest.mock('../agent-router', () => ({
    routeToAgent: jest.fn().mockResolvedValue({ primaryAgent: 'general', confidence: 1 })
}));
jest.mock('../agent-definitions', () => ({ AGENT_CAPABILITIES: [] }));
jest.mock('../../actions/knowledge-base', () => ({
    getKnowledgeBasesAction: jest.fn().mockResolvedValue([]),
    searchKnowledgeBaseAction: jest.fn().mockResolvedValue([])
}));
jest.mock('../../tools/web-search', () => ({ searchWeb: jest.fn() }));
jest.mock('../../tools/gmail', () => ({ gmailAction: jest.fn() }));
jest.mock('../../tools/calendar', () => ({ calendarAction: jest.fn() }));

// Import SUT
import { runAgentCore } from '../agent-runner';
import { ai } from '@/ai/genkit'; // This import might still resolve via Alias, but hopefully Jest cache hits the relative mock
import { DecodedIdToken } from 'firebase-admin/auth';

describe('Model Tiering & Owl Integration', () => {
    
    // We need to re-mock ai if the top-level mock didn't catch the alias import
    // But typically Jest connects them.

    const mockUser = (role: string): DecodedIdToken => ({
        uid: '123',
        role,
        email: 'test@example.com',
        aud: '', auth_time: 0, exp: 0, firebase: {} as any, iat: 0, iss: '', sub: '',
    } as any);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should downgrade Free (guest) user to Lite model', async () => {
        await runAgentCore('Hello', undefined, { modelLevel: 'advanced' }, mockUser('guest'));
        try {
            expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({
                model: 'lite-model'
            }));
        } catch (e) {
            // Fallback: Check if ANY call was made with lite-model if exact match fails on props
            // Console log to debug if needed
            throw e;
        }
    });

    it('should allow Paid (brand) user to use Advanced model', async () => {
        await runAgentCore('Hello', undefined, { modelLevel: 'advanced' }, mockUser('brand'));
        expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'pro-model'
        }));
    });

    it('should block Deep Research for Free user', async () => {
        const result = await runAgentCore('Research', undefined, { modelLevel: 'deep_research' }, mockUser('guest'));
        expect(result.content).toMatch(/Upgrade Required|Pro feature/);
        expect(ai.generate).not.toHaveBeenCalled();
    });

    it('should allow Deep Research for Super User', async () => {
        const result = await runAgentCore('Research', undefined, { modelLevel: 'deep_research' }, mockUser('super_admin'));
        expect(result.content).toContain('Task Created');
    });

    it('should block Playbook Creation for Free user', async () => {
        const result = await runAgentCore('Create a playbook for onboarding', undefined, undefined, mockUser('guest'));
        expect(result.content).toContain('Playbook creation is locked');
    });

    it('should allow Playbook Creation for Super User', async () => {
         const result = await runAgentCore('Create a playbook', undefined, undefined, mockUser('super_admin'));
         expect(result.content).toMatch(/created a playbook/i); // Relaxed match
    });

    it('should auto-route complex task to Deep Research for Paid user', async () => {
        const result = await runAgentCore('Analyze Ultra vs Love Cannabis', undefined, undefined, mockUser('brand'));
        expect(result.content).toContain('Task Created');
        expect(result.content).toContain('Automate this?'); // Check for suggestion
    });

    it('should NOT auto-route complex task for Free user', async () => {
        const result = await runAgentCore('Analyze Ultra vs Love Cannabis', undefined, undefined, mockUser('guest'));
        // Free user won't get "Upgrade Required" here because it falls through to standard processing (downgraded to lite)
        // rather than hitting the explicit modelLevel='deep_research' block I added earlier?
        // Wait, my auto-route logic in `agent-runner` explicitly checks `!isFreeUser`.
        // So for Free User, it does NOT enter the block, so it proceeds to Standard Agent execution (which uses Lite).
        
        expect(result.content).not.toContain('Task Created');
        // It might be a standard generation
        expect(ai.generate).toHaveBeenCalledTimes(1);
    });

});
