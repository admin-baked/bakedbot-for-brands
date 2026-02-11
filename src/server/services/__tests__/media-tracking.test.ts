/**
 * Unit tests for media-tracking.ts
 * Tests cost calculation and estimation logic
 */

import {
    calculateImageCost,
    calculateVideoCost,
    estimateMediaCost,
} from '../media-tracking';

describe('Media Tracking Service', () => {
    describe('calculateImageCost', () => {
        it('should calculate cost for gemini-flash images', () => {
            const cost = calculateImageCost('gemini-flash');
            expect(cost).toBe(0.02);
        });

        it('should calculate cost for gemini-pro images', () => {
            const cost = calculateImageCost('gemini-pro');
            expect(cost).toBe(0.04);
        });
    });

    describe('calculateVideoCost', () => {
        describe('Veo provider', () => {
            it('should calculate cost for 4-second videos', () => {
                const cost = calculateVideoCost('veo', 4);
                expect(cost).toBe(0.50);
            });

            it('should calculate cost for 5-second videos (rounds up to 6s tier)', () => {
                const cost = calculateVideoCost('veo', 5);
                expect(cost).toBe(0.625);
            });

            it('should calculate cost for 6-second videos', () => {
                const cost = calculateVideoCost('veo', 6);
                expect(cost).toBe(0.625);
            });

            it('should calculate cost for 8-second videos', () => {
                const cost = calculateVideoCost('veo', 8);
                expect(cost).toBe(0.75);
            });
        });

        describe('Sora provider', () => {
            it('should calculate cost for 4-second videos', () => {
                const cost = calculateVideoCost('sora', 4);
                expect(cost).toBe(0.50);
            });

            it('should calculate cost for 8-second videos', () => {
                const cost = calculateVideoCost('sora', 8);
                expect(cost).toBe(1.00);
            });

            it('should round up for durations between 4 and 8', () => {
                const cost = calculateVideoCost('sora', 6);
                expect(cost).toBe(1.00); // 6s rounds up to 8s tier
            });
        });
    });

    describe('estimateMediaCost', () => {
        describe('Image estimation', () => {
            it('should estimate cost for gemini-flash image', () => {
                const estimate = estimateMediaCost('image', 'gemini-flash');
                expect(estimate.provider).toBe('gemini-flash');
                expect(estimate.model).toBe('gemini-2.5-flash-image');
                expect(estimate.estimatedCostUsd).toBe(0.02);
                expect(estimate.breakdown.imageCost).toBe(0.02);
            });

            it('should estimate cost for gemini-pro image', () => {
                const estimate = estimateMediaCost('image', 'gemini-pro');
                expect(estimate.provider).toBe('gemini-pro');
                expect(estimate.model).toBe('gemini-3-pro-image-preview');
                expect(estimate.estimatedCostUsd).toBe(0.04);
                expect(estimate.breakdown.imageCost).toBe(0.04);
            });

            it('should estimate cost for image_edit type', () => {
                const estimate = estimateMediaCost('image_edit', 'gemini-pro');
                expect(estimate.provider).toBe('gemini-pro');
                expect(estimate.estimatedCostUsd).toBe(0.04);
            });
        });

        describe('Video estimation', () => {
            it('should estimate cost for veo video with default duration', () => {
                const estimate = estimateMediaCost('video', 'veo');
                expect(estimate.provider).toBe('veo');
                expect(estimate.model).toBe('veo-3.1-generate-preview');
                expect(estimate.estimatedCostUsd).toBe(0.50); // Default 4s
                expect(estimate.breakdown.videoCost).toBe(0.50);
            });

            it('should estimate cost for veo video with 8s duration', () => {
                const estimate = estimateMediaCost('video', 'veo', { durationSeconds: 8 });
                expect(estimate.estimatedCostUsd).toBe(0.75);
                expect(estimate.breakdown.videoCost).toBe(0.75);
            });

            it('should estimate cost for sora video with default duration', () => {
                const estimate = estimateMediaCost('video', 'sora');
                expect(estimate.provider).toBe('sora');
                expect(estimate.model).toBe('sora-2');
                expect(estimate.estimatedCostUsd).toBe(0.50); // Default 4s
            });

            it('should estimate cost for sora video with 8s duration', () => {
                const estimate = estimateMediaCost('video', 'sora', { durationSeconds: 8 });
                expect(estimate.estimatedCostUsd).toBe(1.00);
            });
        });

        describe('Invalid combinations', () => {
            it('should return 0 cost for invalid provider/type combination', () => {
                // Video provider for image type
                const estimate = estimateMediaCost('image', 'veo');
                expect(estimate.estimatedCostUsd).toBe(0);
            });

            it('should return 0 cost for image provider with video type', () => {
                const estimate = estimateMediaCost('video', 'gemini-flash');
                expect(estimate.estimatedCostUsd).toBe(0);
            });
        });
    });

    describe('Cost comparison helpers', () => {
        it('should show gemini-pro costs 2x gemini-flash', () => {
            const flashCost = calculateImageCost('gemini-flash');
            const proCost = calculateImageCost('gemini-pro');
            expect(proCost).toBe(flashCost * 2);
        });

        it('should show sora 8s costs 2x sora 4s', () => {
            const cost4s = calculateVideoCost('sora', 4);
            const cost8s = calculateVideoCost('sora', 8);
            expect(cost8s).toBe(cost4s * 2);
        });

        it('should show veo is generally cheaper than sora at same duration', () => {
            const veo8s = calculateVideoCost('veo', 8);
            const sora8s = calculateVideoCost('sora', 8);
            expect(veo8s).toBeLessThan(sora8s);
        });
    });
});
