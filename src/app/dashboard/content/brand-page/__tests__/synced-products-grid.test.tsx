import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SyncedProductsGrid } from '../components/synced-products-grid';

// Mock Firebase
jest.mock('@/firebase/use-optional-firebase', () => ({
    useOptionalFirebase: () => null
}));

describe('SyncedProductsGrid', () => {
    it('renders empty state when no firebase and no products', () => {
        render(<SyncedProductsGrid brandId="test-brand" />);

        // Should show loader initially, then empty state
        // Since firebase is null, it should complete loading quickly
        expect(screen.queryByText('Import Products') || screen.queryByRole('button')).toBeTruthy();
    });

    it('shows import button when no products exist', async () => {
        render(<SyncedProductsGrid brandId="test-brand" />);

        // Wait for loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check for import CTA
        const importLink = screen.queryByText('Import Products') || screen.queryByText('Find My Products');
        expect(importLink).toBeTruthy();
    });
});
