const fs = require('fs');
const path = require('path');

const files = [
  'src/server/tools/analytics-tools.ts',
  'src/server/tools/crm-tools.ts',
  'src/server/tools/database-tools.ts',
  'src/server/tools/jina-tools.ts',
  'src/server/tools/intuition-tools.ts',
  'src/server/tools/incident-tools.ts',
  'src/server/tools/inbox-tools.ts',
  'src/server/tools/github-tools.ts',
  'src/server/tools/firecrawl-mcp.ts',
  'src/server/tools/letta-memory.ts',
  'src/server/tools/linkedin-tools.ts',
  'src/server/tools/mcp-tools.ts',
  'src/server/tools/profitability-tools.ts',
  'src/server/tools/social-tools.ts',
  'src/server/tools/system-health-tools.ts',
  'src/server/tools/web-discovery.ts',
  'src/server/tools/youtube-tools.ts',
  'src/server/tools/campaign-tools.ts',
  'src/server/tools/browser-tools.ts',
  'src/server/tools/bash-tool.ts',
  'src/server/tools/context-tools.ts'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/import { z } from 'zod';/g, "import { z } from 'zod/v3';");
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${file}`);
    } else {
      console.log(`Skipped (already bridged or no match): ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
