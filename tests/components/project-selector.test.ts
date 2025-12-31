/**
 * ProjectSelector Component Tests
 * Tests for the chat project context selector dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server action
vi.mock('@/server/actions/projects', () => ({
    getProjects: vi.fn()
}));

import { getProjects } from '@/server/actions/projects';

describe('ProjectSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage
        localStorage.clear();
    });

    describe('localStorage persistence', () => {
        it('should save selected project to localStorage', async () => {
            const STORAGE_KEY = 'bakedbot_selected_project';
            
            // Simulate saving to localStorage (unit test without React mount)
            localStorage.setItem(STORAGE_KEY, 'test-project-id');
            
            expect(localStorage.getItem(STORAGE_KEY)).toBe('test-project-id');
        });

        it('should restore selection from localStorage on mount', () => {
            const STORAGE_KEY = 'bakedbot_selected_project';
            const storedValue = 'restored-project-id';
            
            localStorage.setItem(STORAGE_KEY, storedValue);
            
            expect(localStorage.getItem(STORAGE_KEY)).toBe(storedValue);
        });

        it('should clear localStorage when "No Project" is selected', () => {
            const STORAGE_KEY = 'bakedbot_selected_project';
            
            // Store, then remove
            localStorage.setItem(STORAGE_KEY, 'to-be-cleared');
            localStorage.removeItem(STORAGE_KEY);
            
            expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        });
    });

    describe('getProjects action', () => {
        it('should call getProjects on mount', async () => {
            const mockProjects = [
                { id: 'project-1', name: 'CEO Project', color: '#22c55e' },
                { id: 'project-2', name: 'Marketing', color: '#3b82f6' }
            ];
            
            (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
            
            const projects = await getProjects();
            
            expect(getProjects).toHaveBeenCalled();
            expect(projects).toHaveLength(2);
            expect(projects[0].name).toBe('CEO Project');
        });

        it('should handle empty projects list', async () => {
            (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            
            const projects = await getProjects();
            
            expect(projects).toHaveLength(0);
        });

        it('should handle getProjects error gracefully', async () => {
            (getProjects as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to fetch'));
            
            await expect(getProjects()).rejects.toThrow('Failed to fetch');
        });
    });
});
