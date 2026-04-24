import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '../../src/app/page';
import '@testing-library/jest-dom';

const mockHeaders = jest.fn();

jest.mock('next/headers', () => ({
    headers: () => mockHeaders(),
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, src, fill: _fill, priority: _priority, ...props }: any) => <img alt={alt} src={src} {...props} />,
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/components/landing/bakedbot-home', () => ({
    BakedBotHome: () => <div data-testid="bakedbot-home">BakedBotHome</div>,
}));

describe('Homepage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the bakedbot home experience for non-Andrews hosts', async () => {
        mockHeaders.mockResolvedValue({
            get: (key: string) => (key === 'host' ? 'bakedbot.ai' : null),
        });

        render(await HomePage());

        expect(screen.getByTestId('bakedbot-home')).toBeInTheDocument();
    });

    it('renders the Andrews experience for the Andrews hostname', async () => {
        mockHeaders.mockResolvedValue({
            get: (key: string) => (key === 'host' ? 'andrewsdevelopments.bakedbot.ai' : null),
        });

        render(await HomePage());

        expect(screen.getByText(/Step into a new/i)).toBeInTheDocument();
        expect(screen.getByAltText('Andrews Developments hero poster')).toBeInTheDocument();
        expect(screen.getByText('info@andrewsdevelopments.com')).toBeInTheDocument();
    });
});
