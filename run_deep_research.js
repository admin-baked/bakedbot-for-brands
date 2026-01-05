
const { spawn } = require('child_process');
const path = require('path');

const p = spawn('python', [
    'python/sidecar.py', 
    '--action', 'competitor_analysis', 
    '--data', JSON.stringify({ competitors: ['Dispensary A', 'Dispensary B'] })
]);

p.stdout.on('data', d => console.log(d.toString()));
p.stderr.on('data', d => console.error(d.toString()));
