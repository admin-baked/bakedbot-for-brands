/**
 * WhatsApp REST API Service
 *
 * Production-ready WhatsApp gateway using whatsapp-web.js
 * Uses LocalAuth with Firebase Storage backup for persistence.
 *
 * Local Mode: Set LOCAL_MODE=true to skip Firebase (for development)
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.OPENCLAW_API_KEY || 'dev-key-12345';
const LOCAL_MODE = process.env.LOCAL_MODE === 'true' || !process.env.STORAGE_BUCKET;
const STORAGE_BUCKET = process.env.STORAGE_BUCKET;

// Initialize Firebase Admin only in production mode
let sessionManager = null;
if (!LOCAL_MODE) {
    const admin = require('firebase-admin');
    const SessionManager = require('./session-manager');
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    sessionManager = new SessionManager(STORAGE_BUCKET);
    console.log('[WhatsApp] Running in PRODUCTION mode with Firebase backup');
} else {
    console.log('[WhatsApp] Running in LOCAL mode (no cloud backup)');
    // Create a no-op session manager for local dev
    sessionManager = {
        restore: async () => { console.log('[Local] Skipping restore'); return false; },
        backup: async () => { console.log('[Local] Skipping backup'); return true; }
    };
}

// Middleware
app.use(cors());
app.use(express.json());

// State
let whatsappClient = null;
let currentQRCode = null;
let clientReady = false;
let clientInfo = null;
let backupInterval = null;

// Auth Middleware
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

async function startWhatsApp() {
    console.log('[WhatsApp] Starting service...');

    // 1. Restore session from Storage (if exists)
    await sessionManager.restore();

    // 2. Initialize Client
    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: './whatsapp-sessions'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    // Event Handlers
    whatsappClient.on('qr', async (qr) => {
        console.log('[WhatsApp] QR Code generated');
        try {
            currentQRCode = await qrcode.toDataURL(qr);
            clientReady = false;
        } catch (error) {
            console.error('[WhatsApp] QR Code generation failed:', error);
        }
    });

    whatsappClient.on('authenticated', () => {
        console.log('[WhatsApp] Authentication successful! Initializing...');
    });

    whatsappClient.on('auth_failure', (msg) => {
        console.error('[WhatsApp] Authentication failed:', msg);
    });

    whatsappClient.on('loading_screen', (percent, message) => {
        console.log(`[WhatsApp] Loading: ${percent}% - ${message}`);
    });

    whatsappClient.on('ready', async () => {
        console.log('[WhatsApp] Client is ready!');
        clientReady = true;
        currentQRCode = null;
        try {
            clientInfo = whatsappClient.info;
            console.log('[WhatsApp] Connected as:', clientInfo.wid.user);

            // Backup immediately on ready
            await sessionManager.backup();

            // Start periodic backups (every 5 minutes)
            if (backupInterval) clearInterval(backupInterval);
            backupInterval = setInterval(() => {
                sessionManager.backup();
            }, 5 * 60 * 1000);

        } catch (error) {
            console.error('[WhatsApp] Failed to get client info:', error);
        }
    });

    whatsappClient.on('disconnected', (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        clientReady = false;
        clientInfo = null;
        if (backupInterval) clearInterval(backupInterval);
    });

    whatsappClient.initialize().catch(err => {
        console.error('[WhatsApp] Init failed:', err);
    });
}

// Routes
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'whatsapp-gateway',
        version: '2.0.0',
        whatsappReady: clientReady
    });
});

// Session status endpoint
app.get('/whatsapp/session/status', requireAuth, (req, res) => {
    res.json({
        connected: clientReady,
        phoneNumber: clientInfo?.wid?.user || null,
        platform: clientInfo?.platform || null,
        pushname: clientInfo?.pushname || null
    });
});

app.post('/whatsapp/session/qr', requireAuth, async (req, res) => {
    if (!whatsappClient) {
        await startWhatsApp();
        // Wait for QR
        await new Promise(r => setTimeout(r, 4000));
    }

    if (clientReady) {
        return res.json({ connected: true, message: 'Already connected' });
    }

    if (currentQRCode) {
        return res.json({ qrCode: currentQRCode, connected: false });
    }

    res.json({ connected: false, message: 'Generating QR...' });
});

app.post('/whatsapp/message/send', requireAuth, async (req, res) => {
    if (!clientReady) return res.status(503).json({ error: 'Not connected' });

    const { to, message, mediaUrl } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Missing to/message' });

    try {
        const chatId = to.replace(/[^0-9]/g, '') + '@c.us';
        let sent;
        if (mediaUrl) {
            const { MessageMedia } = require('whatsapp-web.js');
            const media = await MessageMedia.fromUrl(mediaUrl);
            sent = await whatsappClient.sendMessage(chatId, media, { caption: message });
        } else {
            sent = await whatsappClient.sendMessage(chatId, message);
        }
        res.json({ id: sent.id.id, status: 'sent' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`WhatsApp Gateway listening on ${PORT}`);
});

// Shutdown Hook
const shutdown = async () => {
    console.log('Shutting down...');
    if (clientReady) {
        await sessionManager.backup();
    }
    if (whatsappClient) await whatsappClient.destroy();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
