/**
 * Discovery Browser Service Index
 * 
 * Re-exports all browser automation functionality for easy imports.
 */

// Client (internal)
export { 
    getRTRVRClient, 
    isRTRVRAvailable,
    RTRVRClient,
    type RTRVRConfig,
    type RTRVRResponse,
    type RTRVRError,
} from './client';

// Agent API (internal)
export {
    executeAgentTask,
    continueAgentTask,
    summarizeUrl,
    extractFromUrl,
    fillForm,
    createRedditAdCampaign,
    type AgentRequest,
    type AgentResult,
    type AgentDataInput,
    type AgentStep,
} from './agent';

// Discovery Tools (public API)
export {
    DISCOVERY_BROWSER_TOOLS,
    executeDiscoveryBrowserTool,
    DISCOVERY_BROWSER_ALLOWED_AGENTS,
    canAgentUseDiscoveryBrowser,
    canRoleUseDiscoveryBrowser,
} from './tools';

// MCP - Logged-in Browser Control
export {
    executeMCPTool,
    getBrowserTabs,
    getPageData,
    takePageAction,
    runPlanner,
    act,
    extract,
    crawl,
    listDevices,
    getCredits,
    type MCPTool,
    type MCPRequest,
    type MCPResult,
    type MCPDevice,
} from './mcp';
