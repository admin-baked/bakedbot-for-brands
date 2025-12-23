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
    
    it('should have icon configuration pointing to SVG', () => {
        expect(manifest.icons).toBeDefined();
        expect(Array.isArray(manifest.icons)).toBe(true);
        expect(manifest.icons.length).toBeGreaterThan(0);
        
        const iconConfig = manifest.icons[0];
        expect(iconConfig.src).toBe('/icon.svg');
        expect(iconConfig.type).toBe('image/svg+xml');
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
    
    it('should have icon with proper purpose for PWA compatibility', () => {
        const iconConfig = manifest.icons[0];
        expect(iconConfig.purpose).toBeDefined();
        expect(iconConfig.purpose).toContain('maskable');
    });
});
