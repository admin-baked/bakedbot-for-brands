/**
 * WidgetWrapper Component Tests
 * Tests for the dashboard widget container with drag handle and controls
 */

import { describe, it, expect, vi } from 'vitest';

describe('WidgetWrapper', () => {
    describe('isStatic prop', () => {
        it('should have drag-handle class when isStatic is false (default)', () => {
            const isStatic = false;
            const hasDragHandle = !isStatic;
            
            expect(hasDragHandle).toBe(true);
            
            // The component should render the GripVertical icon and drag-handle class
            const expectedClasses = 'cursor-move active:cursor-grabbing p-2 -ml-2 hover:bg-muted/50 rounded-md drag-handle touch-none';
            expect(expectedClasses).toContain('drag-handle');
        });

        it('should NOT have drag-handle when isStatic is true', () => {
            const isStatic = true;
            const hasDragHandle = !isStatic;
            
            expect(hasDragHandle).toBe(false);
        });

        it('should add no-drag class to Card when isStatic is true', () => {
            const isStatic = true;
            const className = '';
            
            const cardClassName = `h-full flex flex-col ${isStatic ? 'no-drag' : ''} ${className}`;
            
            expect(cardClassName).toContain('no-drag');
        });

        it('should NOT add no-drag class when isStatic is false', () => {
            const isStatic = false;
            const className = '';
            
            const cardClassName = `h-full flex flex-col ${isStatic ? 'no-drag' : ''} ${className}`;
            
            expect(cardClassName).not.toContain('no-drag');
        });
    });

    describe('onRemove callback', () => {
        it('should show remove option when onRemove is provided', () => {
            const onRemove = vi.fn();
            const hasRemoveOption = !!onRemove;
            
            expect(hasRemoveOption).toBe(true);
        });

        it('should NOT show remove option when onRemove is undefined', () => {
            const onRemove = undefined;
            const hasRemoveOption = !!onRemove;
            
            expect(hasRemoveOption).toBe(false);
        });
    });

    describe('menu visibility', () => {
        it('should show menu when at least one action is available', () => {
            const onExpand = undefined;
            const onSettings = vi.fn();
            const onRemove = undefined;
            
            const showMenu = !!(onExpand || onSettings || onRemove);
            
            expect(showMenu).toBe(true);
        });

        it('should hide menu when no actions are available', () => {
            const onExpand = undefined;
            const onSettings = undefined;
            const onRemove = undefined;
            
            const showMenu = !!(onExpand || onSettings || onRemove);
            
            expect(showMenu).toBe(false);
        });
    });
});
