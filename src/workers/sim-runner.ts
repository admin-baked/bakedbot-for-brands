/**
 * Cloud Run Worker - Simulation Runner
 * 
 * Entry point for the async simulation worker.
 * Subscribes to Pub/Sub messages -> runs simulation -> updates Firestore/GCS.
 */

import express from 'express';
import { loadScenario, loadSimInputs, createInputsSnapshot } from '@/server/services/simulation/inputs';
import { generatePopulation } from '@/server/services/simulation/population';
import { simulateDay } from '@/server/services/simulation/simulate-day';
import { createServerClient } from '@/firebase/server-client';
import { SimDaySummary } from '@/types/simulation';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.post('/pubsub/push', async (req, res) => {
    try {
        if (!req.body) {
            const msg = 'no Pub/Sub message received';
            console.error(`error: ${msg}`);
            res.status(400).send(`Bad Request: ${msg}`);
            return;
        }

        if (!req.body.message) {
            const msg = 'invalid Pub/Sub message format';
            console.error(`error: ${msg}`);
            res.status(400).send(`Bad Request: ${msg}`);
            return;
        }

        const pubSubMessage = req.body.message;
        const payload = pubSubMessage.data
            ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
            : null;

        if (!payload) {
            console.log('empty payload');
            res.status(204).send();
            return;
        }

        const job = JSON.parse(payload);
        console.log(`Processing simulation run: ${job.runId} for tenant: ${job.tenantId}`);

        // Execute the simulation logic
        await executeSimulationRun(job.tenantId, job.runId, job.scenarioId, job.seed);

        res.status(204).send();
    } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).send();
    }
});

/**
 * Re-uses the core logic from actions.ts but optimized for long-running worker context
 */
async function executeSimulationRun(tenantId: string, runId: string, scenarioId: string, seed: number) {
    const { firestore } = await createServerClient();

    // 1. Load context
    const scenario = await loadScenario(tenantId, scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const runRef = firestore.doc(`tenants/${tenantId}/sim/runs/${runId}`);

    try {
        // 2. Load and snapshot inputs
        const { inputs, warnings } = await loadSimInputs(tenantId, scenario);

        await runRef.update({
            status: 'running',
            warnings,
            startDate: new Date().toISOString()
        });

        const dataRefs = await createInputsSnapshot(tenantId, runId, inputs);
        await runRef.update({ dataRefs });

        // 3. Generate population
        const populationSize = scenario.assumptions.customerPopulationSize || 500;
        const customers = generatePopulation(inputs, seed, { size: populationSize });

        // 4. Run days
        const metrics = {
            netRevenue: [] as number[],
            orders: [] as number[],
            discountTotal: [] as number[],
        };

        const startDate = new Date(); // In real app, read from run doc

        for (let day = 0; day < scenario.horizonDays; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);

            const result = simulateDay(inputs, customers, seed, {
                date,
                runId,
                dayIndex: day,
            });

            // Write day summary
            const dateStr = date.toISOString().split('T')[0];
            const summary: SimDaySummary = {
                ...result.summary,
                ledgerRef: {
                    bucket: process.env.GCS_BUCKET || 'bakedbot-sim',
                    path: `tenants/${tenantId}/sim/runs/${runId}/ledgers/${dateStr}.jsonl.gz`,
                    contentType: 'application/gzip',
                },
            };

            await firestore.doc(`tenants/${tenantId}/sim/runs/${runId}/days/${dateStr}`).set(summary);

            // Write ledger to GCS (mock for now, would use @google-cloud/storage)
            // await uploadToGCS(summary.ledgerRef.path, result.orders);

            metrics.netRevenue.push(result.summary.netRevenue);
            metrics.orders.push(result.summary.orders);
            metrics.discountTotal.push(result.summary.discountTotal);
        }

        // 5. Calculate final stats
        const finalSummary = {
            netRevenue: calculatePercentiles(metrics.netRevenue),
            orders: calculatePercentiles(metrics.orders),
            discountTotal: calculatePercentiles(metrics.discountTotal),
            units: { p10: 0, p50: 0, p90: 0 }, // TODO
            aov: { p10: 0, p50: 0, p90: 0 },   // TODO
        };

        await runRef.update({
            status: 'completed',
            summaryMetrics: finalSummary,
            completedAt: new Date(),
        });

    } catch (err) {
        console.error(err);
        await runRef.update({
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
            completedAt: new Date(),
        });
    }
}

function calculatePercentiles(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    return {
        p10: sorted[Math.floor(sorted.length * 0.1)] || 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p90: sorted[Math.floor(sorted.length * 0.9)] || 0,
    };
}

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Simulation worker listening on port ${PORT}`);
    });
}
