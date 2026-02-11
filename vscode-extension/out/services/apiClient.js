"use strict";
/**
 * BakedBot API Client
 *
 * Handles communication with BakedBot backend APIs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VibeAPIClient = void 0;
const axios_1 = __importDefault(require("axios"));
class VibeAPIClient {
    constructor(baseURL, context) {
        this.context = context;
        this.axios = axios_1.default.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add auth token interceptor
        this.axios.interceptors.request.use((config) => {
            const token = this.getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }
    getAuthToken() {
        return this.context.globalState.get('authToken');
    }
    async setAuthToken(token) {
        await this.context.globalState.update('authToken', token);
    }
    async createProject(data) {
        const response = await this.axios.post('/vibe/projects', data);
        return response.data;
    }
    async getProject(projectId) {
        const response = await this.axios.get(`/vibe/projects/${projectId}`);
        return response.data;
    }
    async listProjects() {
        const response = await this.axios.get('/vibe/projects');
        return response.data.projects || [];
    }
    async updateProject(projectId, data) {
        const response = await this.axios.patch(`/vibe/projects/${projectId}`, data);
        return response.data;
    }
    async deleteProject(projectId) {
        await this.axios.delete(`/vibe/projects/${projectId}`);
    }
    async downloadTemplate(templateId) {
        const response = await this.axios.post(`/vibe/templates/${templateId}/download`);
        return response.data;
    }
    async listTemplates(filter) {
        const response = await this.axios.get('/vibe/templates', { params: filter });
        return response.data.templates || [];
    }
}
exports.VibeAPIClient = VibeAPIClient;
//# sourceMappingURL=apiClient.js.map