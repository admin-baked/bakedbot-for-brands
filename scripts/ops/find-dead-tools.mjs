import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'src/server/tools');
const agentDirs = [
  path.join(process.cwd(), 'src/server/agents'),
  path.join(process.cwd(), 'src/server/tools'),
  path.join(process.cwd(), 'src/server/services'),
  path.join(process.cwd(), 'src/app')
];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const allSearchFiles = [];
agentDirs.forEach(d => getAllFiles(d, allSearchFiles));

const toolFiles = fs.readdirSync(toolsDir)
  .filter(f => f.endsWith('.ts') && f !== 'tool-registry.ts');

const unused = [];

for (const toolFile of toolFiles) {
  const baseName = toolFile.replace('.ts', '');
  let found = false;

  for (const searchFile of allSearchFiles) {
    // Don't search the file itself
    if (searchFile.endsWith('/tools/' + toolFile) || searchFile.endsWith('\\tools\\' + toolFile)) continue;
    
    const content = fs.readFileSync(searchFile, 'utf8');
    if (content.includes(`/${baseName}'`) || content.includes(`/${baseName}"`) || content.includes(`/${baseName}\``)) {
      found = true;
      break;
    }
  }

  if (!found) {
    unused.push(toolFile);
  }
}

console.log('Unused Tools:');
console.log(unused.join('\n'));
