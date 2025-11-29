import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import fs from 'fs';
import path from 'path';

async function runAudit() {
    console.log('Starting Lighthouse audit...');

    const chrome = await launch({ chromeFlags: ['--headless'] });
    const options = {
        logLevel: 'info',
        output: 'html',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        port: chrome.port,
    };

    const runnerResult = await lighthouse('http://localhost:3000', options);

    // `.report` is the HTML report as a string
    const reportHtml = runnerResult.report;
    const reportPath = path.join(process.cwd(), 'lighthouse-report.html');

    fs.writeFileSync(reportPath, reportHtml);

    // `.lhr` is the Lighthouse Result as a JS object
    console.log('Report is done for', runnerResult.lhr.finalUrl);
    console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

    await chrome.kill();
}

runAudit().catch(console.error);
