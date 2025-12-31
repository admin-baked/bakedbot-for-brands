
const fs = require('fs');
const path = require('path');

const content = `FIRECRAWL_API_KEY=fc-620b5ebe27784d198207a16abcdd543d
# Added by Agent for Mass Scraping
`;

const filePath = path.join(process.cwd(), '.env.local');

fs.writeFileSync(filePath, content, { encoding: 'utf8' });
console.log('Successfully wrote .env.local to:', filePath);
console.log('Content:', content);
