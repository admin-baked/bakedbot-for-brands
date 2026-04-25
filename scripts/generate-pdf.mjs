/**
 * Generate a PDF from a markdown file using puppeteer-core + Chrome.
 * Usage: node scripts/generate-pdf.mjs <input.md> <output.pdf>
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import puppeteer from 'puppeteer-core';

const [,, inputArg, outputArg] = process.argv;
if (!inputArg) {
    console.error('Usage: node scripts/generate-pdf.mjs <input.md> [output.pdf]');
    process.exit(1);
}

const inputPath = resolve(inputArg);
const outputPath = outputArg
    ? resolve(outputArg)
    : inputPath.replace(/\.md$/, '.pdf');

const md = readFileSync(inputPath, 'utf-8');

// Convert markdown to HTML (basic renderer — handles headers, tables, code, lists)
function mdToHtml(text) {
    return text
        // Fenced code blocks
        .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
            `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Tables
        .replace(/^\|(.+)\|$/gm, (line) => {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            const isHeader = false;
            return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        })
        // Unordered list items
        .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
        // Ordered list items
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Blockquote
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Paragraphs (double newline)
        .replace(/\n\n(?!<[h|p|u|o|l|b|t|h|c|p|d])/g, '</p><p>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// Wrap table rows in proper <table> tags
function wrapTables(html) {
    return html.replace(/(<tr>[\s\S]*?<\/tr>(\s*<tr>[\s\S]*?<\/tr>)*)/g, (match) => {
        const rows = match.trim().split('</tr>').filter(r => r.trim());
        const withClose = rows.map(r => r + '</tr>');
        // First row is header if it came from a |---|---| separator row — skip separator rows
        const dataRows = withClose.filter(r => !r.includes('---|'));
        if (dataRows.length === 0) return '';
        const [header, ...body] = dataRows;
        const headerHtml = header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>');
        return `<table><thead>${headerHtml}</thead><tbody>${body.join('')}</tbody></table>`;
    });
}

// Wrap consecutive <li> in <ul>
function wrapLists(html) {
    return html.replace(/(<li>[\s\S]*?<\/li>(\s*<li>[\s\S]*?<\/li>)*)/g, '<ul>$1</ul>');
}

const bodyHtml = wrapLists(wrapTables(mdToHtml(md)));

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1a1a2e;
    max-width: 860px;
    margin: 0 auto;
    padding: 48px 56px;
  }
  h1 { font-size: 24px; color: #0d0d2b; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 18px; color: #0d0d2b; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 32px; }
  h3 { font-size: 14px; color: #374151; margin-top: 20px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  code {
    background: #f3f4f6;
    border-radius: 3px;
    padding: 2px 5px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 12px;
    color: #374151;
  }
  pre {
    background: #1e1e2e;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin: 12px 0;
  }
  pre code {
    background: none;
    color: #cdd6f4;
    font-size: 12px;
    padding: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 12.5px;
  }
  th {
    background: #f0fdf4;
    color: #065f46;
    font-weight: 600;
    text-align: left;
    padding: 8px 12px;
    border: 1px solid #d1fae5;
  }
  td {
    padding: 7px 12px;
    border: 1px solid #e5e7eb;
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fafafa; }
  ul { margin: 8px 0; padding-left: 20px; }
  li { margin: 3px 0; }
  blockquote {
    border-left: 3px solid #059669;
    margin: 12px 0;
    padding: 8px 16px;
    background: #f0fdf4;
    color: #374151;
    border-radius: 0 4px 4px 0;
  }
  a { color: #059669; text-decoration: none; }
  strong { color: #111827; }
  p { margin: 8px 0; }
  .header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 3px solid #059669;
  }
  .logo { font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.5px; }
  .logo span { color: #1a1a2e; }
  .doc-meta { font-size: 11px; color: #6b7280; text-align: right; }
</style>
</head>
<body>
<div class="header-bar">
  <div class="logo">Baked<span>Bot</span></div>
  <div class="doc-meta">Partner API Reference<br>Dutchie Integration · Confidential<br>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>
<p>${bodyHtml}</p>
</body>
</html>`;

const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });

await page.pdf({
    path: outputPath,
    format: 'Letter',
    margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' },
    printBackground: true,
});

await browser.close();
console.log(`PDF written to: ${outputPath}`);
