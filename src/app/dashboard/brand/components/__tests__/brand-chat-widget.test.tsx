import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandChatWidget } from '../brand-chat-widget';
import '@testing-library/jest-dom';

// Mock PuffChat to verify props
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: jest.fn(({ initialTitle, hideHeader, className }) => (
        <div data-testid="mock-puff-chat">
            <span data-testid="title">{initialTitle}</span>
            <span data-testid="hide-header">{hideHeader ? 'true' : 'false'}</span>
            <span data-testid="class-name">{className}</span>
        </div>
    ))
}));

describe('BrandChatWidget', () => {
    it('renders PuffChat with correct props', () => {
        render(<BrandChatWidget />);

        const puffChat = screen.getByTestId('mock-puff-chat');
        expect(puffChat).toBeInTheDocument();

        expect(screen.getByTestId('title')).toHaveTextContent('Revenue Ops Assistant');
        expect(screen.getByTestId('hide-header')).toHaveTextContent('true');
        expect(screen.getByTestId('class-name')).toHaveTextContent('h-full border-0 shadow-none rounded-none');
    });
});
