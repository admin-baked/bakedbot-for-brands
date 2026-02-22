import fs from 'fs';
import path from 'path';

const cronRoutePaths = [
    'src/app/api/cron/collect-metrics/route.ts',
    'src/app/api/cron/dayday-international-discovery/route.ts',
    'src/app/api/cron/pricing-alerts/route.ts',
    'src/app/api/cron/tick/route.ts',
];

function getSource(relativePath: string): string {
    return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
}

describe('Cron route auth await regressions (2026-02-21 build fix)', () => {
    it.each(cronRoutePaths)('awaits requireCronSecret in %s', (relativePath) => {
        const source = getSource(relativePath);

        expect(source).toMatch(/await\s+requireCronSecret\(/);
        expect(source).not.toMatch(
            /(?:const|let|var)\s+\w+\s*=\s*requireCronSecret\(/,
        );
    });
});
