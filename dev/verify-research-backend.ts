
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config();

function initFirebase() {
    if (getApps().length === 0) {
        const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; // OR file path
        
        let serviceAccount;
        // Try file first (local dev)
        if (fs.existsSync('service-account.json')) {
             serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
        } else if (keyPath) {
             // Try parsing JSON string
             try {
                serviceAccount = JSON.parse(keyPath);
             } catch (e) {
                // assume base64
                const buff = Buffer.from(keyPath, 'base64');
                serviceAccount = JSON.parse(buff.toString('utf-8'));
             }
        } else {
            console.error("❌ No service-account.json or FIREBASE_SERVICE_ACCOUNT_KEY found.");
            process.exit(1);
        }

        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("🔥 Firebase Initialized (Test Mode)");
    }
}

async function verifyResearchTaskCreation() {
    initFirebase();
    
    // Dynamic import to ensure Firebase is ready
    const { createResearchTaskAction } = await import('@/app/dashboard/research/actions');
    const { researchService } = await import('@/server/services/research-service');

    console.log("🧪 Starting Research Task Verification...");

    // Mock User ID and Brand ID (assuming the emulator or dev DB handles this)
    const userId = 'test-user-123';
    const brandId = 'demo-brand-verification';
    const query = 'Analyze the impact of AI on cannabis retail in 2025';

    console.log(`1️⃣ Creating task for brand: ${brandId}`);
    const result = await createResearchTaskAction(userId, brandId, query);

    if (!result.success || !result.taskId) {
        console.error("❌ Failed to create task:", result.error);
        process.exit(1);
    }

    console.log(`✅ Task created successfully. ID: ${result.taskId}`);

    console.log("2️⃣ Verifying task exists in Firestore...");
    const task = await researchService.getTask(result.taskId);

    if (!task) {
        console.error("❌ Task not found in Firestore!");
        process.exit(1);
    }

    if (task.query === query && task.status === 'pending') {
        console.log("✅ Task verified: Correct Query and Status 'pending'.");
    } else {
        console.error("❌ Task data mismatch:", task);
        process.exit(1);
    }

    console.log("3️⃣ Checking task list for brand...");
    const tasks = await researchService.getTasksByBrand(brandId);
    const found = tasks.find(t => t.id === result.taskId);

    if (found) {
        console.log(`✅ Task found in brand list. Total tasks: ${tasks.length}`);
    } else {
        console.error("❌ Task not found in list!");
        process.exit(1);
    }

    console.log("4️⃣ Polling for Sidecar pickup (Expect status change from 'pending')...");
    let attempts = 0;
    while (attempts < 15) {
        attempts++;
        const updatedTask = await researchService.getTask(result.taskId);
        
        if (updatedTask?.status !== 'pending') {
             console.log(`🎉 Status Changed! Current Status: ${updatedTask?.status}`);
             if (updatedTask?.status === 'completed') {
                 console.log("✅ Research Completed! Report ID:", updatedTask.resultReportId);
             } else if (updatedTask?.status === 'processing') {
                 console.log("✅ Sidecar is processing the task (Listener working).");
             } else if (updatedTask?.status === 'failed') {
                 console.error("❌ Task failed:", updatedTask.metadata);
             }
             process.exit(0);
        }
        
        process.stdout.write(".");
        await new Promise(r => setTimeout(r, 2000));
    }

    console.error("\n❌ Timeout: Task remained 'pending' for 30s. Sidecar might not be listening.");
    process.exit(1);
}

verifyResearchTaskCreation().catch(e => {
    console.error("❌ Usage Error:", e);
    process.exit(1);
});
