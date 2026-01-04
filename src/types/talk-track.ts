/**
 * Talk Tracks (Conversational Scripts)
 * 
 * Defines the structure for "Talk Tracks" - pre-defined conversation flows
 * that allow agents to demonstrate "Episodic Thinking" and structured guidance.
 * These are distinct from "Playbooks" (background automation).
 */

export interface TalkTrackStep {
    id: string;
    order: number;
    type: 'response' | 'question' | 'action';
    triggerKeywords?: string[]; // Triggers for this specific step (e.g. "Instagram integration?")
    
    // Content
    thought?: string;   // The "Episodic Thinking" internal monologue (shown in UI)
    steps?: string[];   // Detailed execution steps (triggers ThinkingWindow)
    message: string;    // The actual message sent to the user
    
    // UI Enrichments
    // Optional data visualizations to show with this step
    dataView?: 'competitor_map' | 'price_chart' | 'lead_list' | 'menu_grid' | 'compliance_checklist';
    
    // Automation (Optional)
    // If this step triggers a backend action (like "scrape_menus")
    actionTrigger?: string;
}

export interface TalkTrack {
    id: string;
    name: string;               // e.g. "Cannabis Menu Discovery"
    description?: string;       // Internal description
    
    // Targeting
    role: 'dispensary' | 'brand' | 'customer' | 'all';
    triggerKeywords: string[];  // e.g. ["scrape menu", "market scout", "competitor"]
    
    // The Script
    steps: TalkTrackStep[];
    
    // Metadata
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}
