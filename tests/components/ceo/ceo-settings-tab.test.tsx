import fs from 'fs';
import path from 'path';

describe('CeoSettingsTab settings wiring', () => {
    it('uses the combined safe system settings actions', () => {
        const sourcePath = path.join(
            process.cwd(),
            'src/app/dashboard/ceo/components/ceo-settings-tab.tsx'
        );
        const source = fs.readFileSync(sourcePath, 'utf8');

        expect(source).toContain('getSafeSystemSettingsAction as getSettings');
        expect(source).toContain('updateSafeSystemSettingsAction as updateSettings');
        expect(source).toContain('await updateSettings({');
        expect(source).not.toContain('getOrgVideoProviderAction as getVideo');
        expect(source).not.toContain('updateOrgVideoProviderAction as updateVideo');
    });
});
