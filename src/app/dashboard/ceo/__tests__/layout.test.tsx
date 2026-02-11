import { render, screen } from '@testing-library/react';
import CeoLayout from '../layout';
import { requireSuperUser } from '@/server/auth/auth';

jest.mock('@/server/auth/auth', () => ({
    requireSuperUser: jest.fn(),
}));

const mockRedirect = jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
});

jest.mock('next/navigation', () => ({
    redirect: (...args: any[]) => mockRedirect(...args),
}));

describe('dashboard/ceo layout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders children for authorized super users', async () => {
        (requireSuperUser as jest.Mock).mockResolvedValue({ uid: 'super-user-1' });

        const element = await CeoLayout({
            children: <div>CEO page content</div>,
        });

        render(<>{element}</>);

        expect(requireSuperUser).toHaveBeenCalledTimes(1);
        expect(screen.getByText('CEO page content')).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('redirects unauthorized users to /super-admin', async () => {
        (requireSuperUser as jest.Mock).mockRejectedValue(new Error('Forbidden'));

        await expect(
            CeoLayout({
                children: <div>CEO page content</div>,
            })
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(mockRedirect).toHaveBeenCalledWith('/super-admin');
    });
});
