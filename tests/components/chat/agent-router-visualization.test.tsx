
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentRouterVisualization, RouterStep } from '@/components/chat/agent-router-visualization';
import { act } from 'react-dom/test-utils';

// Mock ToolCallStep interface from where it's defined or just match the shape expected
// The component expects { id, toolName, description, status }
const mockSteps = [
    { id: '1', toolName: 'auth_check', description: 'Checking permission', status: 'completed' },
    { id: '2', toolName: 'search_web', description: 'Searching google', status: 'in-progress' },
    { id: '3', toolName: 'summarize', description: 'Summarizing', status: 'pending' }
];

describe('AgentRouterVisualization', () => {
    it('renders the active in-progress step', () => {
        render(<AgentRouterVisualization steps={mockSteps as any} isComplete={false} />);
        
        // Should show "Search Web" (formatted title) and description
        expect(screen.getByText(/Search Web/i)).toBeInTheDocument();
        expect(screen.getByText(/Searching google/i)).toBeInTheDocument();
        
        // Should NOT show the completed step "Auth Check" (as episodic view focuses on current)
        // Adjust expectation based on implementation: 
        // Logic: find(in-progress) || find(completed.last) || steps[0]
        expect(screen.queryByText(/Auth Check/i)).not.toBeInTheDocument();
    });

    it('renders the last completed step if nothing is in progress', () => {
        const steps = [
             { id: '1', toolName: 'auth_check', description: 'Checking permission', status: 'completed' },
             { id: '2', toolName: 'search_web', description: 'Searching google', status: 'completed' },
             { id: '3', toolName: 'summarize', description: 'Summarizing', status: 'pending' }
        ];
        render(<AgentRouterVisualization steps={steps as any} isComplete={false} />);
        
        // Should show "Search Web" (last completed)
        expect(screen.getByText(/Search Web/i)).toBeInTheDocument();
    });

    it('collapses when complete', async () => {
        jest.useFakeTimers();
        const { container } = render(
            <AgentRouterVisualization 
                steps={mockSteps as any} 
                isComplete={true} 
            />
        );
        
        // Initially visible
        expect(container.firstChild).not.toBeNull();
        
        // Fast-forward
        act(() => {
            jest.advanceTimersByTime(2000);
        });
        
        // Should be null now
        expect(container.firstChild).toBeNull();
        jest.useRealTimers();
    });
});
