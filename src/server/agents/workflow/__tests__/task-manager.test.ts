
import { TaskManager, Task } from '../task-manager';
import { ai } from '@/ai/genkit';

// Mock Genkit (Relative path to ensure cache hit)
jest.mock('../../../../ai/genkit', () => ({
    ai: {
        generate: jest.fn()
    }
}));

jest.mock('@/ai/model-selector', () => ({
    getGenerateOptions: jest.fn(() => ({}))
}));

describe('TaskManager', () => {
    let manager: TaskManager;
    const mockTask: Task = { id: '1', content: 'Do generic research', status: 'pending' };

    beforeEach(() => {
        manager = new TaskManager('TestAgent');
        jest.clearAllMocks();
    });

    it('should evolve a task content', async () => {
        (ai.generate as jest.Mock).mockResolvedValue({ text: 'Do SPECIFIC research on X' });

        const evolved = await manager.evolve(mockTask);

        expect(ai.generate).toHaveBeenCalled();
        expect(evolved.content).toBe('Do SPECIFIC research on X');
        expect(evolved.id).toBe(mockTask.id);
    });

    it('should decompose a task into subtasks', async () => {
        const mockSubtasks = { subtasks: ['Step 1', 'Step 2'] };
        // Improve mock to handle both output styles (object vs text) depending on how I implemented the class
        (ai.generate as jest.Mock).mockResolvedValue({ 
            text: JSON.stringify(mockSubtasks),
            output: mockSubtasks 
        });

        const subtasks = await manager.decompose(mockTask);

        expect(ai.generate).toHaveBeenCalled();
        expect(subtasks.length).toBe(2);
        expect(subtasks[0].id).toBe('1.1');
        expect(subtasks[0].content).toBe('Step 1');
        expect(subtasks[1].content).toBe('Step 2');
    });

    it('should handle decomposition errors gracefully', async () => {
        (ai.generate as jest.Mock).mockRejectedValue(new Error('AI Error'));

        const subtasks = await manager.decompose(mockTask);

        expect(subtasks).toEqual([]);
    });
});
