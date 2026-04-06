import { GoogleAuth } from 'google-auth-library';
import { logger } from '@/lib/logger';
import { withCache, CachePrefix } from '@/lib/cache';

const PROJECT_ID = 'studio-567050101-bc6e8';
const INCIDENTS_URL = `https://servicehealth.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/incidents`;

export interface GCPIncident {
  name: string;
  title: string;
  description: string;
  impactedProducts: string[];
  impactedLocations: string[];
  startTime: string;
  updateTime: string;
  state: 'ACTIVE' | 'RESOLVED';
  relevance: string;
}

/**
 * Fetches active incidents from Google Cloud Service Health API.
 * Requires: Service Health API enabled and Service Account with Service Health Viewer role.
 */
async function fetchGCPIncidentsInternal(): Promise<GCPIncident[]> {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    
    const client = await auth.getClient();
    const url = INCIDENTS_URL;
    
    const response = await client.request<{ incidents?: GCPIncident[] }>({ url });
    
    if (!response.data || !response.data.incidents) {
      return [];
    }

    // Map and filter for ACTIVE incidents to reduce noise
    return (response.data.incidents || [])
      .filter((incident: GCPIncident) => incident.state === 'ACTIVE')
      .map((incident: GCPIncident) => ({
        name: incident.name,
        title: incident.title,
        description: incident.description,
        impactedProducts: incident.impactedProducts || [],
        impactedLocations: incident.impactedLocations || [],
        startTime: incident.startTime,
        updateTime: incident.updateTime,
        state: incident.state,
        relevance: incident.relevance,
      }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[GoogleServiceHealth] Failed to fetch incidents:', { error: message });
    
    // Fallback: If API fails (e.g. not enabled yet), return empty instead of crashing
    return [];
  }
}

/**
 * Get active GCP incidents with a 2-minute cache.
 */
export async function getActiveGCPIncidents(): Promise<GCPIncident[]> {
  return withCache(
    CachePrefix.DOMAIN, // Reusing DOMAIN prefix or we could add a new one, but DOMAIN is 2m TTL
    'gcp_incidents',
    fetchGCPIncidentsInternal,
    120 // 2 minutes TTL
  );
}

/**
 * Helper to determine if we should pause automated deployments.
 * Returns true if there are active incidents impacting Compute Engine, 
 * Cloud Run, or Cloud Build.
 */
export async function isGCPHealthyForDeploy(): Promise<{
  healthy: boolean;
  incidents: GCPIncident[];
  reason?: string;
}> {
  const incidents = await getActiveGCPIncidents();
  
  if (incidents.length === 0) {
    return { healthy: true, incidents: [] };
  }

  // Define critical products that impact our deployment pipeline
  const criticalProducts = [
    'Google Compute Engine',
    'Cloud Run',
    'Cloud Build',
    'Cloud Firestore',
    'Cloud Storage',
    'Artifact Registry'
  ];

  const relevantIncidents = incidents.filter((incident: GCPIncident) => 
    incident.impactedProducts.some(p => criticalProducts.some(cp => p.toLowerCase().includes(cp.toLowerCase())))
  );

  if (relevantIncidents.length > 0) {
    const titles = relevantIncidents.map((i: GCPIncident) => i.title).join(', ');
    return {
      healthy: false,
      incidents: relevantIncidents,
      reason: `GCP Incident(s) affecting core services: ${titles}`
    };
  }

  return { healthy: true, incidents };
}
