import fs from 'fs';
import path from 'path';

describe('Cleanup products rollback (2026-02-21 late-night commits)', () => {
    it('keeps deprecated cleanup API route removed from app router', () => {
        const routePath = path.join(
            process.cwd(),
            'src/app/api/admin/cleanup-products/route.ts',
        );
        expect(fs.existsSync(routePath)).toBe(false);
    });

    it('keeps deprecated cleanup server action removed', () => {
        const actionPath = path.join(
            process.cwd(),
            'src/server/actions/cleanup-products.ts',
        );
        expect(fs.existsSync(actionPath)).toBe(false);
    });
});
