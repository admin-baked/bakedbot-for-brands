/**
 * OpenClaw REST API Wrapper
 *
 * Provides REST endpoints that wrap OpenClaw CLI commands
 * for WhatsApp gateway integration.
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const http = require('http');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.OPENCLAW_API_KEY || 'dev-key-12345';

// Middleware
app.use(cors());
app.use(express.json());

// API Key authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing API key' });
    }

    const token = authHeader.substring(7);
    if (token !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    next();
}

// Helper function to check if OpenClaw gateway is reachable
async function checkGatewayHealth() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:18789/', (res) => {
            resolve({ reachable: res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 301 });
        });

        req.on('error', () => {
            resolve({ reachable: false });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ reachable: false });
        });
    });
}

// Helper function to execute OpenClaw CLI commands
async function runOpenClawCommand(command, args = []) {
    try {
        const argsString = args.map(arg => {
            // Escape quotes in arguments
            const escaped = arg.replace(/"/g, '\\"');
            return `"${escaped}"`;
        }).join(' ');

        const fullCommand = `openclaw ${command} ${argsString}`;
        console.log('[OpenClaw CLI]', fullCommand);

        const { stdout, stderr } = await execAsync(fullCommand, {
            timeout: 30000, // 30 second timeout
            maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        });

        if (stderr && !stderr.includes('DeprecationWarning')) {
            console.warn('[OpenClaw STDERR]', stderr);
        }

        return { success: true, output: stdout };
    } catch (error) {
        console.error('[OpenClaw Error]', error.message);
        return {
            success: false,
            error: error.message,
            stderr: error.stderr,
        };
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'openclaw-rest-wrapper', version: '1.0.0' });
});

// Get WhatsApp session status
app.get('/whatsapp/session/status', requireAuth, async (req, res) => {
    try {
        // Check if OpenClaw gateway is reachable on port 18789
        const health = await checkGatewayHealth();

        if (health.reachable) {
            // Gateway is running
            // TODO: Parse session files or query gateway API to get real WhatsApp status
            res.json({
                connected: false, // Change to true once WhatsApp is configured
                phoneNumber: null, // Would parse from session files
                lastConnected: null,
                qrRequired: true, // User needs to run: openclaw channels login
            });
        } else {
            // Gateway not running
            res.json({
                connected: false,
                phoneNumber: null,
                lastConnected: null,
                qrRequired: true,
            });
        }
    } catch (error) {
        console.error('[Status Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate QR code for WhatsApp authentication
app.post('/whatsapp/session/qr', requireAuth, async (req, res) => {
    try {
        // OpenClaw generates QR code when you start the gateway
        // This is a simplified version - in production, you'd need to
        // capture the QR code output from the gateway startup

        res.json({
            qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHRleHQgeD0iNTAiIHk9IjEwMCI+UVIgQ29kZSBQbGFjZWhvbGRlcjwvdGV4dD48L3N2Zz4=',
            message: 'Note: QR code generation requires gateway restart. Use: openclaw gateway --port 18789',
        });
    } catch (error) {
        console.error('[QR Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// Disconnect WhatsApp session
app.post('/whatsapp/session/disconnect', requireAuth, async (req, res) => {
    try {
        // In OpenClaw, you'd typically stop the gateway to disconnect
        res.json({
            message: 'To disconnect, stop the OpenClaw gateway service',
            success: true,
        });
    } catch (error) {
        console.error('[Disconnect Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// Send WhatsApp message
app.post('/whatsapp/message/send', requireAuth, async (req, res) => {
    try {
        const { to, message, mediaUrl } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Missing required fields: to, message' });
        }

        // Build OpenClaw message send command
        const args = [
            'send',
            '--channel', 'whatsapp',
            '--target', to,
            '--message', message,
        ];

        if (mediaUrl) {
            args.push('--media', mediaUrl);
        }

        const result = await runOpenClawCommand('message', args);

        if (result.success) {
            res.json({
                messageId: `msg_${Date.now()}`,
                status: 'sent',
                timestamp: new Date().toISOString(),
            });
        } else {
            res.status(500).json({
                error: result.error || 'Failed to send message',
                details: result.stderr,
            });
        }
    } catch (error) {
        console.error('[Send Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// Get message history
app.post('/whatsapp/message/history', requireAuth, async (req, res) => {
    try {
        const { phoneNumber, limit = 50, offset = 0 } = req.body;

        // OpenClaw stores messages in session files
        // This would require parsing the session JSON files
        // For now, return empty array

        res.json({
            messages: [],
            total: 0,
            note: 'Message history requires parsing OpenClaw session files',
        });
    } catch (error) {
        console.error('[History Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🦞 OpenClaw REST Wrapper running on http://localhost:${PORT}`);
    console.log(`API Key: ${API_KEY}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /health`);
    console.log(`  GET  /whatsapp/session/status`);
    console.log(`  POST /whatsapp/session/qr`);
    console.log(`  POST /whatsapp/session/disconnect`);
    console.log(`  POST /whatsapp/message/send`);
    console.log(`  POST /whatsapp/message/history`);
    console.log(`\nAuthentication: Bearer ${API_KEY}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down OpenClaw REST Wrapper...');
    process.exit(0);
});
