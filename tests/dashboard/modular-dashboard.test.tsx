/**
 * Unit tests for ModularDashboard component
 * Tests layout, widget management, and persistence
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModularDashboard } from '@/components/dashboard/modular/modular-dashboard';
import * as layoutPersistence from '@/lib/dashboard/layout-persistence';

// Mock react-grid-layout
jest.mock('react-grid-layout', () => {
    return function MockGridLayout({ children, onLayoutChange }: {
        children: React.ReactNode;
        onLayoutChange?: (layout: any[]) => void;
    }) {
        return <div data-testid="grid-layout">{children}</div>;
    };
});

// Mock CSS imports
jest.mock('react-grid-layout/css/styles.css', () => ({}));
jest.mock('react-resizable/css/styles.css', () => ({}));

// Mock layout persistence
jest.mock('@/lib/dashboard/layout-persistence', () => ({
    loadLayout: jest.fn(),
    saveLayout: jest.fn(),
    resetToDefaults: jest.fn(),
    addWidgetToLayout: jest.fn(),
    removeWidgetFromLayout: jest.fn(),
    updateWidgetPositions: jest.fn()
}));

// Mock widget registry  
jest.mock('@/lib/dashboard/widget-registry', () => ({
    getWidgetByType: jest.fn(() => ({
        type: 'test',
        minWidth: 2,
        minHeight: 2,
        defaultWidth: 3,
        defaultHeight: 2
    }))
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn()
    })
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
        <button onClick={onClick}>{children}</button>
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: { children: React.ReactNode }) =>
        <span data-testid="badge">{children}</span>
}));

// Mock AddWidgetMenu
jest.mock('@/components/dashboard/modular/add-widget-menu', () => ({
    AddWidgetMenu: ({ onAddWidget }: { onAddWidget: (type: string) => void }) =>
        <button data-testid="add-widget-menu" onClick={() => onAddWidget('test-widget')}>Add Widget</button>
}));

// Mock widgets
jest.mock('@/components/dashboard/modular/widgets', () => ({
    getWidgetComponent: jest.fn(() => {
        return function MockWidget({ onRemove }: { onRemove?: () => void }) {
            return (
                <div data-testid="mock-widget">
                    <button onClick={onRemove}>Remove</button>
                </div>
            );
        };
    })
}));

describe('ModularDashboard', () => {
    const mockWidgets = [
        { id: 'widget-1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 },
        { id: 'widget-2', widgetType: 'foot-traffic', x: 3, y: 0, w: 3, h: 2 }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (layoutPersistence.loadLayout as jest.Mock).mockReturnValue(mockWidgets);
        (layoutPersistence.resetToDefaults as jest.Mock).mockReturnValue(mockWidgets);
        (layoutPersistence.addWidgetToLayout as jest.Mock).mockReturnValue([
            ...mockWidgets,
            { id: 'new-widget', widgetType: 'test-widget', x: 0, y: 2, w: 2, h: 2 }
        ]);
        (layoutPersistence.removeWidgetFromLayout as jest.Mock).mockReturnValue([mockWidgets[1]]);
    });

    describe('Rendering', () => {
        it('should render dashboard title', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });
        });

        it('should display role badge', async () => {
            render(<ModularDashboard role="brand" />);
            await waitFor(() => {
                expect(screen.getByTestId('badge')).toHaveTextContent('brand');
            });
        });

        it('should render grid layout when widgets exist', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
            });
        });

        it('should show empty state when no widgets', async () => {
            (layoutPersistence.loadLayout as jest.Mock).mockReturnValue([]);
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByText('No widgets on your dashboard')).toBeInTheDocument();
            });
        });
    });

    describe('Layout loading', () => {
        it('should load layout on mount', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(layoutPersistence.loadLayout).toHaveBeenCalledWith('owner');
            });
        });

        it('should load different layout for different role', async () => {
            render(<ModularDashboard role="brand" />);
            await waitFor(() => {
                expect(layoutPersistence.loadLayout).toHaveBeenCalledWith('brand');
            });
        });
    });

    describe('Control buttons', () => {
        it('should have Add Widget button', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByTestId('add-widget-menu')).toBeInTheDocument();
            });
        });

        it('should have Reset button', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByText('Reset')).toBeInTheDocument();
            });
        });

        it('should have Save Layout button', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByText('Save Layout')).toBeInTheDocument();
            });
        });
    });

    describe('Save functionality', () => {
        it('should call saveLayout when Save clicked', async () => {
            render(<ModularDashboard role="owner" />);

            await waitFor(() => {
                expect(screen.getByText('Save Layout')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Save Layout'));

            expect(layoutPersistence.saveLayout).toHaveBeenCalledWith('owner', mockWidgets);
        });
    });

    describe('Reset functionality', () => {
        it('should call resetToDefaults when Reset clicked', async () => {
            render(<ModularDashboard role="owner" />);

            await waitFor(() => {
                expect(screen.getByText('Reset')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Reset'));

            expect(layoutPersistence.resetToDefaults).toHaveBeenCalledWith('owner');
        });
    });

    describe('Props', () => {
        it('should use default width when not provided', async () => {
            render(<ModularDashboard role="owner" />);
            await waitFor(() => {
                expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
            });
        });

        it('should accept custom width', async () => {
            render(<ModularDashboard role="owner" width={1400} />);
            await waitFor(() => {
                expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
            });
        });

        it('should accept custom cols', async () => {
            render(<ModularDashboard role="owner" cols={10} />);
            await waitFor(() => {
                expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
            });
        });

        it('should accept custom rowHeight', async () => {
            render(<ModularDashboard role="owner" rowHeight={100} />);
            await waitFor(() => {
                expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
            });
        });
    });
});

describe('ModularDashboard widget rendering', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (layoutPersistence.loadLayout as jest.Mock).mockReturnValue([
            { id: 'w1', widgetType: 'top-zips', x: 0, y: 0, w: 3, h: 2 }
        ]);
    });

    it('should render widgets from layout', async () => {
        render(<ModularDashboard role="owner" />);
        await waitFor(() => {
            expect(screen.getByTestId('mock-widget')).toBeInTheDocument();
        });
    });
});
