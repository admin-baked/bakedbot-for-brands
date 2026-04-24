/**
 * PWA Manifest Tests
 * Tests that the manifest.json has proper icon configuration
 */

import * as fs from 'fs';
import * as path from 'path';

describe('PWA Manifest', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const iconPath = path.join(process.cwd(), 'public', 'icon.svg');
    
    let manifest: any;
    
    beforeAll(() => {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
    });
    
    it('should have a valid manifest.json file', () => {
        expect(manifest).toBeDefined();
        expect(manifest.name).toBe('BakedBot AI');
        expect(manifest.short_name).toBe('BakedBot');
    });
    
    it('should include PNG and SVG icon entries', () => {
        expect(manifest.icons).toBeDefined();
        expect(Array.isArray(manifest.icons)).toBe(true);
        expect(manifest.icons.length).toBeGreaterThan(0);

        expect(
            manifest.icons,
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    src: '/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                }),
                expect.objectContaining({
                    src: '/icon.svg',
                    sizes: 'any',
                    type: 'image/svg+xml',
                }),
            ]),
        );
    });
    
    it('should have icon file that is a valid SVG (not a URL placeholder)', () => {
        const iconContent = fs.readFileSync(iconPath, 'utf-8');
        
        // Should start with XML/SVG declaration, not a URL
        expect(iconContent).toMatch(/^<svg/);
        expect(iconContent).not.toMatch(/^https?:\/\//);
        
        // Should contain SVG elements
        expect(iconContent).toContain('viewBox');
        expect(iconContent).toContain('</svg>');
    });
    
    it('should include a dedicated maskable icon for PWA compatibility', () => {
        const maskableIcon = manifest.icons.find((icon: any) => icon.purpose?.includes('maskable'));

        expect(maskableIcon).toBeDefined();
        expect(maskableIcon).toEqual(
            expect.objectContaining({
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            }),
        );
    });
});
