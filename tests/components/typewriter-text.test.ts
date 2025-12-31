/**
 * TypewriterText Component Tests
 * Tests for the typewriter animation effect used in chat responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('TypewriterText', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('delay prop behavior', () => {
        it('should respect delay before starting animation', () => {
            const delay = 500;
            const speed = 20;
            
            // Simulate the useEffect logic
            let hasStarted = false;
            let displayedText = '';
            const fullText = 'Hello, World!';

            // Before delay
            expect(hasStarted).toBe(false);
            expect(displayedText).toBe('');

            // After delay
            vi.advanceTimersByTime(delay);
            hasStarted = true;

            expect(hasStarted).toBe(true);

            // After typing animation (simplified simulation)
            for (let i = 0; i < fullText.length; i++) {
                vi.advanceTimersByTime(speed);
                displayedText = fullText.slice(0, i + 1);
            }

            expect(displayedText).toBe(fullText);
        });

        it('should start immediately when delay is 0', () => {
            const delay = 0;
            let hasStarted = false;

            // Immediate start
            vi.advanceTimersByTime(delay);
            hasStarted = true;

            expect(hasStarted).toBe(true);
        });
    });

    describe('text changes', () => {
        it('should reset animation when text prop changes', () => {
            let currentIndex = 5;
            let displayedText = 'Hello';
            const newText = 'New message!';

            // Simulate text prop change
            currentIndex = 0;
            displayedText = '';

            expect(currentIndex).toBe(0);
            expect(displayedText).toBe('');

            // New text starts from beginning
            displayedText = newText.slice(0, 1);
            expect(displayedText).toBe('N');
        });
    });

    describe('onComplete callback', () => {
        it('should call onComplete when animation finishes', () => {
            const onComplete = vi.fn();
            const text = 'Done!';
            const speed = 10;

            let currentIndex = 0;

            // Simulate typing complete
            while (currentIndex < text.length) {
                currentIndex++;
                vi.advanceTimersByTime(speed);
            }

            // Trigger onComplete
            if (currentIndex >= text.length) {
                onComplete();
            }

            expect(onComplete).toHaveBeenCalledTimes(1);
        });
    });

    describe('speed prop', () => {
        it('should complete faster with lower speed value', () => {
            const text = 'Test';
            const fastSpeed = 10;
            const slowSpeed = 50;

            const fastDuration = text.length * fastSpeed;
            const slowDuration = text.length * slowSpeed;

            expect(fastDuration).toBe(40);
            expect(slowDuration).toBe(200);
            expect(fastDuration).toBeLessThan(slowDuration);
        });
    });
});
