import { z } from 'zod/v3';
import { getActiveGCPIncidents, isGCPHealthyForDeploy } from '../services/google-service-health';

export const getSystemHealthToolDef = {
    name: 'get_system_health',
    description: 'Check real-time health status of Google Cloud Platform (GCP) and internal BakedBot systems. Always check this before suggesting code changes or deployments, especially if builds are failing or slow.',
    schema: z.object({})
};

/**
 * Tool for Linus to check platform health.
 */
export async function executeGetSystemHealth(): Promise<string> {
    try {
        const gcpHealth = await isGCPHealthyForDeploy();
        const allIncidents = await getActiveGCPIncidents();
        
        let report = `System Health Status: ${gcpHealth.healthy ? 'HEALTHY' : 'UNSTABLE'}\n\n`;
        
        if (allIncidents.length === 0) {
            report += 'No active Google Cloud incidents detected.';
        } else {
            report += `Active Google Cloud Incidents (${allIncidents.length}):\n`;
            allIncidents.forEach((incident: any) => {
                const gcpIncident = incident as { state: string, title: string, impactedProducts: string[] };
                report += `- [${gcpIncident.state}] ${gcpIncident.title}\n  Products: ${gcpIncident.impactedProducts.join(', ')}\n  Link: https://console.cloud.google.com/servicehealth/incidents?chat=true&authuser=0&project=studio-567050101-bc6e8\n\n`;
            });
        }
        
        if (!gcpHealth.healthy) {
            report += `CRITICAL NOTE: Automated deployments are currently BLOCKED internally due to platform instability.\nReason: ${gcpHealth.reason}`;
        }
        
        return report;
    } catch (error: any) {
        return `Failed to fetch system health: ${error.message}`;
    }
}
