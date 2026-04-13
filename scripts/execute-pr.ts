
import { executeGithubCreatePr } from './src/server/tools/github-tools';

async function main() {
  console.log('Starting PR creation via GitHub API...');
  
  const result = await executeGithubCreatePr({
    branchName: 'fix/loyalty-tablet-build-2026-04-07',
    files: [
      '.agent/prime.md',
      'CLAUDE.md',
      'dev/progress_log.md',
      'src/app/api/v1/loyalty/members/route.ts',
      'src/app/loyalty-tablet/components/RecommendationsScreen.tsx',
      'src/app/loyalty-tablet/hooks/use-tablet-flow.ts',
      'src/app/me/loyalty/page.tsx',
      'src/lib/checkin/checkin-management-shared.ts',
      'src/lib/checkin/loyalty-tablet-shared.ts',
      'src/server/actions/loyalty-tablet.ts',
      'src/types/club.ts'
    ],
    commitMessage: 'fix: Resolve Loyalty Tablet build errors (11 files)',
    prTitle: 'Fix: Loyalty Tablet Build Errors',
    prBody: 'Resolves persistent build failures in the loyalty tablet code. Verified with green check:types.'
  });
  
  console.log('--- RESULT ---');
  console.log(result);
}

main().catch(console.error);
