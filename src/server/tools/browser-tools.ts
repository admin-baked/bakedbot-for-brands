
import { z } from 'zod';

// ============================================================================
// BROWSER TOOL DEFINITIONS
// Enable agents to browse the web using Playwright
// ============================================================================

export const browserToolDefs = [
    {
        name: "browse_web",
        description: "Visit a website to read content, take a screenshot, or interact with elements. Use this for verifying UI, reading documentation, or general web research.",
        schema: z.object({
            url: z.string().describe("The URL to visit (e.g., 'http://localhost:3000' or 'https://google.com')"),
            action: z.enum(['read', 'screenshot', 'click', 'type']).optional().default('read').describe("Action to perform on the page. 'read' extracts text."),
            selector: z.string().optional().describe("CSS selector for click/type actions"),
            inputValue: z.string().optional().describe("Text to type for 'type' action")
        })
    }
];

export interface BrowserTools {
    browse_web(url: string, action?: 'read' | 'screenshot' | 'click' | 'type', selector?: string, inputValue?: string): Promise<any>;
}
