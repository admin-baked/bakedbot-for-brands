/**
 * Opencode Agent HTTP Server
 *
 * Simple HTTP server that calls AI APIs directly (Anthropic/Gemini).
 * Accepts a prompt + optional file paths, injects repo context, returns result.
 *
 * POST /run
 *   { prompt: string, model?: string, files?: string[] }
 *   → { result: string, model: string }
 *
 * GET /health
 *   → { healthy: true, version: "1.0" }
 *
 * Auth: HTTP Basic (username: opencode, password: OPENCODE_SERVER_PASSWORD)
 *
 * Models:
 *   google/gemini-2.0-flash          — fast, cheap (default)
 *   google/gemini-2.5-pro            — most capable Google
 *   anthropic/claude-haiku-4-5       — fast, cheap Anthropic
 *   anthropic/claude-sonnet-4-6      — most capable Anthropic (billed)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 8080;
const PASSWORD = (process.env.OPENCODE_SERVER_PASSWORD || '').replace(/[\r\n]/g, '');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const REPO_DIR = process.env.REPO_DIR || '/workspace/bakedbot-for-brands';

const DEFAULT_MODEL = 'google/gemini-2.0-flash';
const TIMEOUT_MS = 60_000;

console.log(`[opencode-server] Starting on port ${PORT}`);
console.log(`[opencode-server] Auth: ${PASSWORD ? 'enabled' : 'DISABLED'}`);
console.log(`[opencode-server] Anthropic key: ${ANTHROPIC_API_KEY ? 'set' : 'missing'}`);
console.log(`[opencode-server] Gemini key: ${GEMINI_API_KEY ? 'set' : 'missing'}`);
console.log(`[opencode-server] Repo: ${REPO_DIR}`);

function checkAuth(req) {
    if (!PASSWORD) return true;
    const header = req.headers['authorization'] || '';
    if (!header.startsWith('Basic ')) return false;
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const colon = decoded.indexOf(':');
    return decoded.slice(0, colon) === 'opencode' && decoded.slice(colon + 1) === PASSWORD;
}

function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
    res.end(payload);
}

function readRepoFiles(filePaths) {
    const results = [];
    for (const rel of filePaths) {
        const abs = path.resolve(REPO_DIR, rel);
        if (!abs.startsWith(REPO_DIR)) continue; // prevent path traversal
        try {
            const content = fs.readFileSync(abs, 'utf8');
            results.push(`// FILE: ${rel}\n${content}`);
        } catch {
            results.push(`// FILE: ${rel} (not found)`);
        }
    }
    return results.join('\n\n---\n\n');
}

async function callAnthropic(model, systemPrompt, userPrompt) {
    const modelId = model.replace('anthropic/', '');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: modelId,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? '(no response)';
}

async function callGemini(model, systemPrompt, userPrompt) {
    const modelId = model.replace('google/', '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no response)';
}

const SYSTEM_PROMPT = `You are a senior software engineer working on BakedBot AI — an agentic commerce OS for the cannabis industry built with Next.js 15, Firebase, and Claude AI.

Rules:
- TypeScript only, typed boundaries, no silent catches
- Use @/lib/logger not console.log
- Use 'use server' for mutations
- Use @google-cloud/firestore (not client SDK)
- Follow existing patterns in the repo

Respond with code or analysis as requested. Be concise.`;

const server = http.createServer(async (req, res) => {
    if (!checkAuth(req)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure Area"' });
        res.end('Unauthorized');
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { healthy: true, version: '1.0', anthropic: !!ANTHROPIC_API_KEY, gemini: !!GEMINI_API_KEY });
        return;
    }

    if (req.method === 'POST' && url.pathname === '/run') {
        let body = '';
        for await (const chunk of req) body += chunk;

        let parsed;
        try { parsed = JSON.parse(body); } catch {
            sendJson(res, 400, { error: 'Invalid JSON body' });
            return;
        }

        const prompt = parsed.prompt?.trim();
        const model = (parsed.model || DEFAULT_MODEL).trim();
        const files = Array.isArray(parsed.files) ? parsed.files : [];

        if (!prompt) {
            sendJson(res, 400, { error: 'prompt is required' });
            return;
        }

        console.log(`[opencode-server] Running (model=${model}): ${prompt.slice(0, 80)}...`);

        // Build user prompt with optional file context
        let userPrompt = prompt;
        if (files.length > 0) {
            const fileContext = readRepoFiles(files);
            userPrompt = `${prompt}\n\n## Repo context\n\n${fileContext}`;
        }

        try {
            let result;
            if (model.startsWith('anthropic/')) {
                if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
                result = await callAnthropic(model, SYSTEM_PROMPT, userPrompt);
            } else if (model.startsWith('google/')) {
                if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
                result = await callGemini(model, SYSTEM_PROMPT, userPrompt);
            } else {
                throw new Error(`Unknown model provider in "${model}". Use google/... or anthropic/...`);
            }

            console.log(`[opencode-server] Done. ${result.length} chars.`);
            sendJson(res, 200, { result, model });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[opencode-server] Error: ${message.slice(0, 200)}`);
            sendJson(res, 500, { error: message });
        }
        return;
    }

    sendJson(res, 404, { error: 'Not found. Use POST /run or GET /health' });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[opencode-server] Ready at http://0.0.0.0:${PORT}`);
});
