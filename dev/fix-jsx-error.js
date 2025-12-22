// Fix JSX syntax error in src/app/page.tsx
// Removes stray closing brace that blocks all deployments

const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/app/page.tsx', 'utf8');

// Fix the specific issues
let fixed = content;

// 1. Remove stray } after Final CTA comment
fixed = fixed.replace(/\{\/\*\s*Final\s*CTA\s*\*\/\s*\}/, '{/* Final CTA */}');

// 2. Fix any </div > with extra space  
fixed = fixed.replace(/<\/div\s+>/g, '</div>');

// 3. Fix section indentation
fixed = fixed.replace(
    /(\{\/\* Final CTA \*\/\})\s*\n\s*<section className="mx-auto max-w-6xl/,
    '$1\n    <section className="mx-auto max-w-6xl'
);

// Write back
fs.writeFileSync('src/app/page.tsx', fixed, 'utf8');

console.log('✅ Fixed JSX errors in src/app/page.tsx');
console.log('   - Removed stray } after Final CTA comment');
console.log('   - Fixed closing div tags');
console.log('   - Fixed indentation');
