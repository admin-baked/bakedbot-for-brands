
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function runAudit(url: string) {
    if (!url) {
        console.error('Usage: npx tsx scripts/audit-performance.ts <url>');
        process.exit(1);
    }

    console.log(`Starting Lighthouse audit for: ${url}`);
    console.log('This may take a minute...');

    const reportName = `lighthouse-report-${Date.now()}.json`;
    const outputPath = path.join(process.cwd(), reportName);

    try {
        // Run lighthouse via npx to avoid installing as heavy dependency if possible, 
        // or assume it's available. 
        // Using --chrome-flags="--headless" for server environments.
        const command = `npx lighthouse ${url} --output json --output-path "${outputPath}" --chrome-flags="--headless" --only-categories=performance --quiet`;
        
        await execAsync(command);

        const reportRaw = await fs.readFile(outputPath, 'utf-8');
        const report = JSON.parse(reportRaw);

        const scores = {
            performance: report.categories.performance.score * 100,
            lcp: report.audits['largest-contentful-paint'].numericValue,
            inp: report.audits['interactive'].numericValue, // Interaction to Next Paint approx or Total Blocking Time
            cls: report.audits['cumulative-layout-shift'].numericValue,
            tti: report.audits['interactive'].numericValue
        };

        console.log('\n--- Performance Audit Results ---');
        console.log(`URL: ${url}`);
        console.log(`Score: ${scores.performance}/100`);
        console.log(`LCP: ${(scores.lcp / 1000).toFixed(2)}s (Target: <2.5s)`);
        console.log(`CLS: ${scores.cls.toFixed(3)} (Target: <0.1)`);
        console.log(`TTI: ${(scores.tti / 1000).toFixed(2)}s`);
        
        // Clean up
        await fs.unlink(outputPath);

        // Fail if critical metrics are poor?
        if (scores.lcp > 2500) {
            console.warn('WARNING: LCP exceeds critical threshold of 2.5s');
        }

    } catch (error: any) {
        console.error(`Audit failed: ${error.message}`);
        process.exit(1);
    }
}

const urlArg = process.argv[2];
runAudit(urlArg);
