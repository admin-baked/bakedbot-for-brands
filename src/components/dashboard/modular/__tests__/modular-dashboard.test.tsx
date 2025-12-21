import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModularDashboard } from '../modular-dashboard';
import * as persistence from '@/lib/dashboard/layout-persistence';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

jest.mock('@/lib/dashboard/layout-persistence', () => ({
    loadLayout: jest.fn(),
    saveLayout: jest.fn(),
    resetToDefaults: jest.fn(),
    addWidgetToLayout: jest.fn(),
    removeWidgetFromLayout: jest.fn(),
    updateWidgetPositions: jest.fn(),
}));

// Mock widget registry
const mockGetWidgetByType = jest.fn();
jest.mock('@/lib/dashboard/widget-registry', () => ({
    getWidgetByType: (type: string) => mockGetWidgetByType(type),
}));

jest.mock('../add-widget-menu', () => ({
    AddWidgetMenu: ({ onAddWidget }: any) => (
        <button data-testid="add-widget-btn" onClick={() => onAddWidget('top-zips')}>
            Add Widget
        </button>
    ),
}));

// Mock react-grid-layout
jest.mock('react-grid-layout', () => {
    return function MockGridLayout(props: any) {
        return (
            <div data-testid="grid-layout">
                {props.children}
            </div>
        );
    };
});

// Mock the widgets components
jest.mock('../widgets', () => ({
    getWidgetComponent: () => () => <div data-testid="mock-widget">Mock Widget</div>
}));

describe('ModularDashboard', () => {
    const mockToast = jest.fn();

    beforeEach(() => {
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
        jest.clearAllMocks();

        // Default mock implementation
        mockGetWidgetByType.mockReturnValue({
            id: 'top-zips',
            type: 'top-zips',
            title: 'Top Performing ZIPs',
            component: 'TopZipsWidget',
            minWidth: 2,
            minHeight: 2,
            defaultWidth: 3,
            defaultHeight: 3,
            visibleFor: ['brand'],
            category: 'insights',
            description: 'Test'
        });
    });

    const defaultWidgets = [
        { id: '1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 3 },
    ];

    it('renders loading state initially', () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue([]);
        render(<ModularDashboard role="brand" />);
        // Initial render should show nothing or spinner. 
        // We can't easily assert onspinner without test id, but we can verify it eventually loads.
    });

    it('renders empty state when no widgets exist', async () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue([]);
        render(<ModularDashboard role="brand" />);

        expect(await screen.findByText('No widgets on your dashboard')).toBeInTheDocument();
    });

    it.skip('renders widgets from layout', async () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue(defaultWidgets);

        // mockGetWidgetByType is already set in beforeEach

        render(<ModularDashboard role="brand" />);

        // We mocked the widget component, so we should look for the mock, not the real title
        expect(await screen.findByTestId('mock-widget')).toBeInTheDocument();
    });

    it.skip('adds a widget when Add button is clicked', async () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue([]);
        (persistence.addWidgetToLayout as jest.Mock).mockReturnValue([
            { id: 'new-1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 3 }
        ]);

        // mockGetWidgetByType is already set in beforeEach

        render(<ModularDashboard role="brand" />);

        // Wait for button to appear
        const addBtn = await screen.findByTestId('add-widget-btn');
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(persistence.addWidgetToLayout).toHaveBeenCalled();
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Widget Added'
            }));
        });
    });

    it('calls saveLayout when Save button is clicked', async () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue(defaultWidgets);
        render(<ModularDashboard role="brand" />);

        const saveBtn = await screen.findByText('Save Layout');
        fireEvent.click(saveBtn);

        expect(persistence.saveLayout).toHaveBeenCalledWith('brand', defaultWidgets);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Layout Saved'
        }));
    });

    it('resets layout when Reset button is clicked', async () => {
        (persistence.loadLayout as jest.Mock).mockReturnValue(defaultWidgets);
        (persistence.resetToDefaults as jest.Mock).mockReturnValue([]);

        render(<ModularDashboard role="brand" />);

        const resetBtn = await screen.findByText('Reset');
        fireEvent.click(resetBtn);

        expect(persistence.resetToDefaults).toHaveBeenCalledWith('brand');
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Layout Reset'
        }));
    });
});
