
const genkit = require('genkit');
console.log('Has defineTool:', 'defineTool' in genkit);
console.log('Has tool:', 'tool' in genkit);

try {
  const ai = require('@genkit-ai/ai');
  console.log('AI Has defineTool:', 'defineTool' in ai);
} catch (e) {
  console.log('AI not found');
}
