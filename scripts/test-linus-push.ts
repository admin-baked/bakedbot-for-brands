import { executeGithubPush } from '../src/server/tools/github-tools';

async function run() {
    console.log('Initiating Linus GitHub Push Tool...');
    const result = await executeGithubPush({
        files: [
            'src/server/agents/linus.ts',
            'src/server/tools/database-tools.ts',
            'src/server/tools/incident-tools.ts',
            'src/server/tools/github-tools.ts'
        ],
        commitMessage: 'feat(agents): upgrade Linus to full CTO capability (Linear, GCP Logs, Slack Incidents, GitHub PRs)',
        branch: 'main'
    });
    console.log('\n--- Result ---\n');
    console.log(result);
}

run().catch(console.error);
