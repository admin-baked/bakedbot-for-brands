import { execSync } from 'child_process';
import { writeFileSync, appendFileSync } from 'fs';

const LOG_FILE = 'deploy-log.txt';
const DEPLOY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function log(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    console.log(formattedMessage);
    appendFileSync(LOG_FILE, formattedMessage);
}

async function checkDeploymentStatus() {
    try {
        log('Checking latest GitHub Actions run status...');
        const output = execSync('gh run list --limit 1 --json status,conclusion,url', { encoding: 'utf-8' });
        const runs = JSON.parse(output);
        if (runs.length === 0) return { status: 'none' };
        return runs[0];
    } catch (error) {
        log(`Error checking status: ${error.message}`);
        return { status: 'error' };
    }
}

async function triggerDeployment() {
    try {
        log('Triggering new deployment (empty commit to main)...');
        execSync('git commit --allow-empty -m "chore: manual deployment retry" && git push origin main', { stdio: 'inherit' });
        log('Deployment triggered successfully.');
    } catch (error) {
        log(`Error triggering deployment: ${error.message}`);
    }
}

async function run() {
    log('Starting Deployment Watcher Strategy...');
    
    while (true) {
        const run = await checkDeploymentStatus();
        
        if (run.status === 'completed' && run.conclusion === 'success') {
            log('SUCCESS: Deployment succeeded! Stopping watcher.');
            process.exit(0);
        } else if (run.status === 'completed' && (run.conclusion === 'failure' || run.conclusion === 'cancelled' || run.conclusion === 'timed_out')) {
            log(`FAILURE: Previous run ${run.conclusion}. Retrying now...`);
            await triggerDeployment();
        } else if (run.status === 'in_progress' || run.status === 'queued' || run.status === 'waiting') {
            log(`IN PROGRESS: A deployment is currently ${run.status}. Waiting for next interval...`);
        } else {
            log('No active or failed deployments found. Initializing first run...');
            await triggerDeployment();
        }

        log(`Sleeping for 1 hour until next check...`);
        await new Promise(resolve => setTimeout(resolve, DEPLOY_INTERVAL_MS));
    }
}

run().catch(err => {
    log(`FATAL ERROR: ${err.message}`);
    process.exit(1);
});
