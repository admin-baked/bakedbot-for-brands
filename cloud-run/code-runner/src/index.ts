/**
 * BakedBot Code Runner - Cloud Run Service
 *
 * Secure, isolated code execution for training challenges.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { executeCode } from './executor';
import { validateExecutionRequest } from './validator';
import type { ExecutionRequest, ExecutionResult } from './types';

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://bakedbot.ai'],
    methods: ['POST'],
}));
app.use(express.json({ limit: '100kb' })); // Limit payload size

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(JSON.stringify({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
        }));
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// Code execution endpoint
app.post('/execute', async (req, res) => {
    try {
        // Validate request
        const validation = validateExecutionRequest(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: validation.errors,
            });
        }

        const request: ExecutionRequest = validation.data!;

        // Execute code
        const result: ExecutionResult = await executeCode(request);

        res.json(result);
    } catch (error) {
        console.error('Execution error:', error);

        res.status(500).json({
            success: false,
            error: 'Execution failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Code Runner listening on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`   Node version: ${process.version}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
