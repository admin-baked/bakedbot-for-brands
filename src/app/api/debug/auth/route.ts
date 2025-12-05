
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: any = {
        steps: [],
        envVarPresent: false,
        envVarLength: 0,
        base64Decode: 'pending',
        jsonParse: 'pending',
        sdkInit: 'pending',
        error: null
    };

    try {
        // 1. Check Env Var
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        results.envVarPresent = !!serviceAccountKey;
        results.envVarLength = serviceAccountKey?.length || 0;

        // List all env keys for debugging (exclude values for security)
        results.envKeys = Object.keys(process.env).sort();
        results.steps.push('Checked env var');

        if (!serviceAccountKey) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing');
        }

        // 2. Decode Base64
        let jsonStr = '';
        try {
            jsonStr = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
            results.base64Decode = 'success';
            results.steps.push('Decoded base64');
        } catch (e: any) {
            results.base64Decode = 'failed';
            throw new Error(`Base64 decode failed: ${e.message}`);
        }

        // 3. Parse JSON
        let serviceAccount: any = null;
        try {
            serviceAccount = JSON.parse(jsonStr);
            results.jsonParse = 'success';
            results.projectId = serviceAccount.project_id;
            results.clientEmail = serviceAccount.client_email;
            results.privateKeyLength = serviceAccount.private_key?.length;
            results.steps.push('Parsed JSON');
        } catch (e: any) {
            results.jsonParse = 'failed';
            throw new Error(`JSON parse failed: ${e.message}`);
        }

        // 4. Initialize SDK
        try {
            if (getApps().length === 0) {
                initializeApp({
                    credential: cert(serviceAccount)
                });
                results.sdkInit = 'initialized_new';
            } else {
                results.sdkInit = 'already_initialized';
            }
            results.steps.push('Initialized SDK');
        } catch (e: any) {
            results.sdkInit = 'failed';
            throw new Error(`SDK initialization failed: ${e.message}`);
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            results,
            error: {
                message: error.message,
                stack: error.stack
            }
        }, { status: 500 });
    }
}
