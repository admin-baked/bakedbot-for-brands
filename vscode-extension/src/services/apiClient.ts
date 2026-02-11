/**
 * BakedBot API Client
 *
 * Handles communication with BakedBot backend APIs.
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface VibeProject {
  id: string;
  name: string;
  description: string;
  category: string;
  files: ProjectFile[];
  vibeConfig: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export class VibeAPIClient {
  private axios: AxiosInstance;
  private context: vscode.ExtensionContext;

  constructor(baseURL: string, context: vscode.ExtensionContext) {
    this.context = context;
    this.axios = axios.create({
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

  private getAuthToken(): string | undefined {
    return this.context.globalState.get<string>('authToken');
  }

  async setAuthToken(token: string): Promise<void> {
    await this.context.globalState.update('authToken', token);
  }

  async createProject(data: {
    name: string;
    description: string;
    category: string;
  }): Promise<VibeProject> {
    const response = await this.axios.post('/vibe/projects', data);
    return response.data;
  }

  async getProject(projectId: string): Promise<VibeProject> {
    const response = await this.axios.get(`/vibe/projects/${projectId}`);
    return response.data;
  }

  async listProjects(): Promise<VibeProject[]> {
    const response = await this.axios.get('/vibe/projects');
    return response.data.projects || [];
  }

  async updateProject(projectId: string, data: Partial<VibeProject>): Promise<VibeProject> {
    const response = await this.axios.patch(`/vibe/projects/${projectId}`, data);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/vibe/projects/${projectId}`);
  }

  async downloadTemplate(templateId: string): Promise<VibeProject> {
    const response = await this.axios.post(`/vibe/templates/${templateId}/download`);
    return response.data;
  }

  async listTemplates(filter?: any): Promise<any[]> {
    const response = await this.axios.get('/vibe/templates', { params: filter });
    return response.data.templates || [];
  }
}
