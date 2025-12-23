import { render, screen } from '@testing-library/react';
import { ModelSelector } from '@/app/dashboard/ceo/components/model-selector';
import React from 'react';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('ModelSelector Component', () => {
    
    it('renders without crashing', () => {
        render(<ModelSelector value="standard" onChange={() => {}} userPlan="free" />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('displays the correct label', () => {
        render(<ModelSelector value="genius" onChange={() => {}} userPlan="growth_5" />);
        // "Genius" text is inside the button
        expect(screen.getByText('Genius')).toBeInTheDocument();
    });
});
