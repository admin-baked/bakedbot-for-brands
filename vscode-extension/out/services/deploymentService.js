"use strict";
/**
 * Deployment Service
 *
 * Handles deployment to BakedBot hosting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DeploymentService {
    constructor(apiClient) {
        this._apiClient = apiClient;
    }
    async deploy(projectPath, subdomain) {
        try {
            // Build the project
            await execAsync('npm run build', { cwd: projectPath });
            // TODO: Implement actual deployment via BakedBot API
            // For now, return mock result
            return {
                success: true,
                url: `https://${subdomain}.bakedbot.ai`,
            };
        }
        catch (error) {
            return {
                success: false,
                url: '',
                error: error instanceof Error ? error.message : 'Deployment failed',
            };
        }
    }
}
exports.DeploymentService = DeploymentService;
//# sourceMappingURL=deploymentService.js.map