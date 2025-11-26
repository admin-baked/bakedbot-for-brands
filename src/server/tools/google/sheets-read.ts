// Google Sheets Read Tool - reads data from Google Sheets

import { BaseTool } from '../base-tool';
import type { ToolContext, ToolResult, GoogleSheetsReadInput, GoogleSheetsReadOutput } from '@/types/tool';

/**
 * Google Sheets Read Tool
 * Reads data from Google Sheets using the Sheets API
 */
export class GoogleSheetsReadTool extends BaseTool<GoogleSheetsReadInput, GoogleSheetsReadOutput> {
    readonly id = 'google_sheets_read';
    readonly name = 'Google Sheets Read';
    readonly description = 'Read data from Google Sheets';
    readonly category = 'data' as const;

    readonly capabilities = [
        {
            name: 'read_range',
            description: 'Read a specific range of cells',
            examples: [
                'Read customer data from CRM sheet',
                'Read product pricing from catalog',
                'Read campaign metrics from tracking sheet'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object',
        properties: {
            spreadsheetId: {
                type: 'string',
                description: 'Google Sheets spreadsheet ID'
            },
            range: {
                type: 'string',
                description: 'Range in A1 notation (e.g., "Sheet1!A1:B10")'
            }
        },
        required: ['spreadsheetId', 'range']
    };

    readonly outputSchema = {
        type: 'object',
        properties: {
            values: {
                type: 'array',
                items: { type: 'array' }
            },
            metadata: {
                type: 'object'
            }
        }
    };

    readonly authType = 'service_account' as const;
    readonly requiresAuth = true;

    visible = true;
    icon = '📊';
    color = '#34A853'; // Google green

    estimatedDuration = 2000;
    estimatedCost = 0; // Free (Google Sheets API)

    async execute(
        input: GoogleSheetsReadInput,
        context: ToolContext
    ): Promise<ToolResult<GoogleSheetsReadOutput>> {
        const startTime = Date.now();

        try {
            this.validateInput(input);

            // Get API key (service account or OAuth token)
            const apiKey = process.env.GOOGLE_SHEETS_API_KEY || context.credentials?.googleSheetsApiKey;

            if (!apiKey) {
                throw this.createError(
                    'AUTH_REQUIRED',
                    'Google Sheets API key is required',
                    false
                );
            }

            // Build API URL
            const url = new URL(
                `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}`
            );
            url.searchParams.append('key', apiKey);

            // Make API request
            const response = await fetch(url.toString());

            if (!response.ok) {
                const error = await response.json();
                throw this.createError(
                    'API_ERROR',
                    `Google Sheets API error: ${error.error?.message || response.statusText}`,
                    response.status === 429
                );
            }

            const data = await response.json();

            const output: GoogleSheetsReadOutput = {
                values: data.values || [],
                metadata: {
                    spreadsheetName: input.spreadsheetId,
                    sheetName: input.range.split('!')[0],
                    rowCount: data.values?.length || 0,
                    columnCount: data.values?.[0]?.length || 0
                }
            };

            const executionTime = Date.now() - startTime;

            return this.createResult(
                output,
                {
                    executionTime,
                    apiCalls: 1
                },
                {
                    type: 'table',
                    title: `Data from ${input.range}`,
                    content: output.values,
                    preview: `Read ${output.metadata.rowCount} rows`,
                    icon: '📊'
                },
                0.9
            );

        } catch (error: any) {
            if (error.code) {
                return this.createFailedResult(error);
            }

            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error.message || 'Failed to read from Google Sheets',
                    true
                )
            );
        }
    }
}

export const googleSheetsReadTool = new GoogleSheetsReadTool();
