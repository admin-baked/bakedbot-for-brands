/**
 * A/B Testing Framework
 * Enables feature experiments and marketing campaign testing
 */



import { createServerClient } from '@/firebase/server-client';

export interface Experiment {
    id: string;
    name: string;
    description: string;
    variants: {
        id: string;
        name: string;
        weight: number; // 0-100, total should be 100
        config: Record<string, any>;
    }[];
    status: 'draft' | 'active' | 'paused' | 'completed';
    targetAudience?: {
        userType?: 'all' | 'new' | 'returning';
        brandIds?: string[];
        minOrders?: number;
    };
    metrics: {
        primary: string; // e.g., 'conversion_rate', 'revenue_per_user'
        secondary?: string[];
    };
    startDate: Date;
    endDate?: Date;
    createdAt: Date;
    createdBy: string;
}

export interface ExperimentAssignment {
    userId: string;
    experimentId: string;
    variantId: string;
    assignedAt: Date;
}

export interface ExperimentMetric {
    experimentId: string;
    variantId: string;
    userId: string;
    metricName: string;
    value: number;
    timestamp: Date;
}

export class ABTestingService {
    /**
     * Create a new experiment
     */
    async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt'>): Promise<string> {
        const { firestore } = await createServerClient();

        // Validate variant weights sum to 100
        const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
        if (totalWeight !== 100) {
            throw new Error('Variant weights must sum to 100');
        }

        const experimentDoc = {
            ...experiment,
            createdAt: new Date(),
        };

        const docRef = await firestore.collection('experiments').add(experimentDoc);
        return docRef.id;
    }

    /**
     * Assign a user to an experiment variant
     */
    async assignUserToExperiment(userId: string, experimentId: string): Promise<string> {
        const { firestore } = await createServerClient();

        // Check if user already assigned
        const existingAssignment = await firestore
            .collection('experiment_assignments')
            .where('userId', '==', userId)
            .where('experimentId', '==', experimentId)
            .limit(1)
            .get();

        if (!existingAssignment.empty) {
            return existingAssignment.docs[0].data().variantId;
        }

        // Get experiment
        const experimentDoc = await firestore.collection('experiments').doc(experimentId).get();
        if (!experimentDoc.exists) {
            throw new Error('Experiment not found');
        }

        const experiment = experimentDoc.data() as Experiment;

        // Select variant based on weights
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedVariant = experiment.variants[0];

        for (const variant of experiment.variants) {
            cumulative += variant.weight;
            if (random <= cumulative) {
                selectedVariant = variant;
                break;
            }
        }

        // Store assignment
        const assignment: ExperimentAssignment = {
            userId,
            experimentId,
            variantId: selectedVariant.id,
            assignedAt: new Date(),
        };

        await firestore.collection('experiment_assignments').add(assignment);

        return selectedVariant.id;
    }

    /**
     * Get user's variant for an experiment
     */
    async getUserVariant(userId: string, experimentId: string): Promise<string | null> {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('experiment_assignments')
            .where('userId', '==', userId)
            .where('experimentId', '==', experimentId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        return snapshot.docs[0].data().variantId;
    }

    /**
     * Track experiment metric
     */
    async trackMetric(
        experimentId: string,
        variantId: string,
        userId: string,
        metricName: string,
        value: number
    ): Promise<void> {
        const { firestore } = await createServerClient();

        const metric: ExperimentMetric = {
            experimentId,
            variantId,
            userId,
            metricName,
            value,
            timestamp: new Date(),
        };

        await firestore.collection('experiment_metrics').add(metric);
    }

    /**
     * Get experiment results
     */
    async getExperimentResults(experimentId: string): Promise<{
        variants: {
            id: string;
            name: string;
            users: number;
            metrics: Record<string, { mean: number; count: number }>;
        }[];
    }> {
        const { firestore } = await createServerClient();

        // Get experiment
        const experimentDoc = await firestore.collection('experiments').doc(experimentId).get();
        if (!experimentDoc.exists) {
            throw new Error('Experiment not found');
        }

        const experiment = experimentDoc.data() as Experiment;

        // Get assignments
        const assignmentsSnapshot = await firestore
            .collection('experiment_assignments')
            .where('experimentId', '==', experimentId)
            .get();

        // Get metrics
        const metricsSnapshot = await firestore
            .collection('experiment_metrics')
            .where('experimentId', '==', experimentId)
            .get();

        // Aggregate results by variant
        const results = experiment.variants.map(variant => {
            const variantAssignments = assignmentsSnapshot.docs.filter(
                doc => doc.data().variantId === variant.id
            );

            const variantMetrics = metricsSnapshot.docs.filter(
                doc => doc.data().variantId === variant.id
            );

            // Calculate metric aggregates
            const metricAggregates: Record<string, { mean: number; count: number }> = {};

            // Group by metric name
            const metricsByName: Record<string, number[]> = {};
            variantMetrics.forEach(doc => {
                const data = doc.data();
                if (!metricsByName[data.metricName]) {
                    metricsByName[data.metricName] = [];
                }
                metricsByName[data.metricName].push(data.value);
            });

            // Calculate means
            Object.entries(metricsByName).forEach(([name, values]) => {
                metricAggregates[name] = {
                    mean: values.reduce((a, b) => a + b, 0) / values.length,
                    count: values.length,
                };
            });

            return {
                id: variant.id,
                name: variant.name,
                users: variantAssignments.length,
                metrics: metricAggregates,
            };
        });

        return { variants: results };
    }

    /**
     * End an experiment
     */
    async endExperiment(experimentId: string, winningVariantId?: string): Promise<void> {
        const { firestore } = await createServerClient();

        await firestore.collection('experiments').doc(experimentId).update({
            status: 'completed',
            endDate: new Date(),
            ...(winningVariantId && { winningVariantId }),
        });
    }
}

export const abTestingService = new ABTestingService();
