'use server';

/**
 * Customer Import Server Actions
 *
 * Handles CSV and Excel file imports with automatic column normalization.
 * Supports various column name formats from different POS systems and CRMs.
 */

import { z } from 'zod';
import Papa from 'papaparse';
// @ts-ignore - xlsx types may not be available in all environments
import * as XLSX from 'xlsx';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile, CustomerSegment } from '@/types/customers';
import { calculateSegment } from '@/types/customers';
import {
    buildColumnMapping,
    getMappingSummary,
    normalizeSegment,
    normalizeTier,
    normalizePriceRange,
    normalizeSource,
    normalizeBoolean,
    normalizeNumber,
    normalizeDate,
    normalizeArray,
    normalizePhone,
    normalizeEmail,
    type ImportableCustomerField,
} from '@/lib/customer-import/column-mapping';

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerImportPreview {
    headers: string[];
    mappingSummary: Array<{
        original: string;
        mapped: string | null;
        index: number;
    }>;
    sampleRows: Record<string, unknown>[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: Array<{
        row: number;
        field: string;
        message: string;
    }>;
    warnings: Array<{
        row: number;
        field: string;
        message: string;
    }>;
}

export interface CustomerImportResult {
    success: boolean;
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{
        row: number;
        email?: string;
        message: string;
    }>;
}

export interface ManualColumnMapping {
    [originalColumn: string]: ImportableCustomerField | null;
}

// =============================================================================
// PARSE FILE
// =============================================================================

/**
 * Parse file content (CSV or Excel) into rows
 */
async function parseFileContent(
    content: string,
    fileType: 'csv' | 'xlsx'
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    if (fileType === 'xlsx') {
        // Parse Excel file from base64
        const workbook = XLSX.read(content, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
            return { headers: [], rows: [] };
        }

        const headers = Object.keys(jsonData[0]);
        return { headers, rows: jsonData };
    }

    // Parse CSV
    return new Promise((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(content, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
                const headers = results.meta.fields || [];
                resolve({ headers, rows: results.data });
            },
            error: (error: Error) => {
                reject(new Error(`CSV parsing failed: ${error.message}`));
            }
        });
    });
}

// =============================================================================
// VALIDATE PREVIEW
// =============================================================================

/**
 * Validate and preview customer import data
 */
export async function validateCustomerImport(
    content: string,
    fileType: 'csv' | 'xlsx',
    manualMapping?: ManualColumnMapping
): Promise<CustomerImportPreview> {
    try {
        const { headers, rows } = await parseFileContent(content, fileType);

        if (headers.length === 0 || rows.length === 0) {
            return {
                headers: [],
                mappingSummary: [],
                sampleRows: [],
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                errors: [{ row: 0, field: 'file', message: 'No data found in file' }],
                warnings: []
            };
        }

        // Build column mapping
        const mappingSummary = getMappingSummary(headers);

        // Apply manual overrides if provided
        if (manualMapping) {
            mappingSummary.forEach(item => {
                if (manualMapping[item.original] !== undefined) {
                    item.mapped = manualMapping[item.original];
                }
            });
        }

        // Build effective mapping
        const effectiveMapping = new Map<number, ImportableCustomerField>();
        mappingSummary.forEach(item => {
            if (item.mapped) {
                effectiveMapping.set(item.index, item.mapped as ImportableCustomerField);
            }
        });

        // Check if we have email mapping (required)
        const hasEmailMapping = mappingSummary.some(m => m.mapped === 'email');

        const errors: CustomerImportPreview['errors'] = [];
        const warnings: CustomerImportPreview['warnings'] = [];

        if (!hasEmailMapping) {
            errors.push({
                row: 0,
                field: 'email',
                message: 'No email column found. Email is required for customer import.'
            });
        }

        // Validate rows
        let validRows = 0;
        let invalidRows = 0;

        rows.forEach((row, rowIndex) => {
            const emailHeader = mappingSummary.find(m => m.mapped === 'email')?.original;
            const email = emailHeader ? row[emailHeader] : null;

            if (!email || typeof email !== 'string' || !email.includes('@')) {
                errors.push({
                    row: rowIndex + 1,
                    field: 'email',
                    message: email ? `Invalid email format: ${email}` : 'Missing email'
                });
                invalidRows++;
            } else {
                validRows++;
            }

            // Warn about unmapped columns with data
            headers.forEach((header, idx) => {
                if (!effectiveMapping.has(idx) && row[header] && rowIndex === 0) {
                    warnings.push({
                        row: 0,
                        field: header,
                        message: `Column "${header}" was not auto-mapped and will be ignored`
                    });
                }
            });
        });

        return {
            headers,
            mappingSummary,
            sampleRows: rows.slice(0, 5),
            totalRows: rows.length,
            validRows,
            invalidRows,
            errors,
            warnings
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[CustomerImport] Validation failed:', { error: errorMessage });
        throw new Error(`Failed to validate file: ${errorMessage}`);
    }
}

// =============================================================================
// IMPORT CUSTOMERS
// =============================================================================

/**
 * Import customers from validated data
 */
export async function importCustomers(
    orgId: string,
    content: string,
    fileType: 'csv' | 'xlsx',
    manualMapping?: ManualColumnMapping
): Promise<CustomerImportResult> {
    const db = getAdminFirestore();

    try {
        const { headers, rows } = await parseFileContent(content, fileType);

        if (rows.length === 0) {
            return {
                success: false,
                totalRows: 0,
                imported: 0,
                updated: 0,
                skipped: 0,
                errors: [{ row: 0, message: 'No data found in file' }]
            };
        }

        // Build column mapping
        const autoMapping = buildColumnMapping(headers);

        // Apply manual overrides
        const effectiveMapping = new Map(autoMapping);
        if (manualMapping) {
            headers.forEach((header, index) => {
                if (manualMapping[header] !== undefined) {
                    if (manualMapping[header]) {
                        effectiveMapping.set(index, manualMapping[header] as ImportableCustomerField);
                    } else {
                        effectiveMapping.delete(index);
                    }
                }
            });
        }

        const errors: CustomerImportResult['errors'] = [];
        let imported = 0;
        let updated = 0;
        let skipped = 0;

        // Process in batches of 500
        const batchSize = 500;
        const batches = Math.ceil(rows.length / batchSize);

        for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, rows.length);
            const batchRows = rows.slice(batchStart, batchEnd);

            const batch = db.batch();

            for (let i = 0; i < batchRows.length; i++) {
                const row = batchRows[i];
                const rowIndex = batchStart + i + 1;

                try {
                    // Convert row to customer profile
                    const customer = rowToCustomerProfile(row, headers, effectiveMapping, orgId);

                    if (!customer.email) {
                        errors.push({ row: rowIndex, message: 'Missing email' });
                        skipped++;
                        continue;
                    }

                    // Check if customer exists in top-level customers collection
                    const existingQuery = await db
                        .collection('customers')
                        .where('orgId', '==', orgId)
                        .where('email', '==', customer.email)
                        .limit(1)
                        .get();

                    if (!existingQuery.empty) {
                        // Update existing customer
                        const existingDoc = existingQuery.docs[0];
                        const existingData = existingDoc.data() as CustomerProfile;

                        // Merge: keep existing data, update with new non-empty values
                        const mergedData = mergeCustomerData(existingData, customer);
                        batch.update(existingDoc.ref, mergedData);
                        updated++;
                    } else {
                        // Create new customer in top-level customers collection
                        const newRef = db
                            .collection('customers')
                            .doc();

                        customer.id = newRef.id;
                        customer.createdAt = new Date();
                        customer.updatedAt = new Date();

                        // Calculate segment if not provided
                        if (!customer.segment || customer.segment === 'new') {
                            customer.segment = calculateSegment(customer);
                        }

                        batch.set(newRef, customer);
                        imported++;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({
                        row: rowIndex,
                        email: String(row[headers.find((h, idx) => effectiveMapping.get(idx) === 'email') || ''] || ''),
                        message: errorMessage
                    });
                    skipped++;
                }
            }

            // Commit batch
            await batch.commit();

            logger.info(`[CustomerImport] Batch ${batchIndex + 1}/${batches} committed`, {
                orgId,
                imported,
                updated,
                skipped
            });
        }

        // Log activity (try both potential activity collection locations)
        try {
            await db.collection('activities').add({
                type: 'customer_import',
                orgId,
                description: `Imported ${imported} new customers, updated ${updated}`,
                metadata: {
                    totalRows: rows.length,
                    imported,
                    updated,
                    skipped,
                    errorCount: errors.length
                },
                createdAt: new Date()
            });
        } catch (activityError) {
            // Activity logging is non-critical, don't fail the import
            logger.warn('[CustomerImport] Could not log activity:', { error: activityError });
        }

        return {
            success: errors.length === 0,
            totalRows: rows.length,
            imported,
            updated,
            skipped,
            errors
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[CustomerImport] Import failed:', { error: errorMessage, orgId });
        throw new Error(`Import failed: ${errorMessage}`);
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a row to CustomerProfile
 */
function rowToCustomerProfile(
    row: Record<string, unknown>,
    headers: string[],
    mapping: Map<number, ImportableCustomerField>,
    orgId: string
): Partial<CustomerProfile> {
    const profile: Partial<CustomerProfile> = {
        orgId,
        source: 'import',
        preferredCategories: [],
        preferredProducts: [],
        customTags: [],
        priceRange: 'mid',
        tier: 'bronze',
        points: 0,
        totalSpent: 0,
        orderCount: 0,
        avgOrderValue: 0,
        lifetimeValue: 0,
    };

    headers.forEach((header, index) => {
        const field = mapping.get(index);
        if (!field) return;

        const rawValue = row[header];
        if (rawValue === undefined || rawValue === null || rawValue === '') return;

        const value = String(rawValue);

        switch (field) {
            // String fields
            case 'email':
                profile.email = normalizeEmail(value);
                break;
            case 'phone':
                profile.phone = normalizePhone(value);
                break;
            case 'firstName':
                profile.firstName = value.trim();
                break;
            case 'lastName':
                profile.lastName = value.trim();
                break;
            case 'displayName':
                profile.displayName = value.trim();
                break;
            case 'notes':
                profile.notes = value.trim();
                break;
            case 'acquisitionCampaign':
                profile.acquisitionCampaign = value.trim();
                break;
            case 'referralCode':
                profile.referralCode = value.trim();
                break;
            case 'birthDate':
                profile.birthDate = value.trim();
                break;

            // Numeric fields
            case 'totalSpent':
                profile.totalSpent = normalizeNumber(value);
                profile.lifetimeValue = profile.totalSpent; // Default LTV to total spent
                break;
            case 'orderCount':
                profile.orderCount = normalizeNumber(value);
                break;
            case 'avgOrderValue':
                profile.avgOrderValue = normalizeNumber(value);
                break;
            case 'points':
                profile.points = normalizeNumber(value);
                break;
            case 'lifetimeValue':
                profile.lifetimeValue = normalizeNumber(value);
                break;

            // Date fields
            case 'lastOrderDate':
                profile.lastOrderDate = normalizeDate(value);
                break;
            case 'firstOrderDate':
                profile.firstOrderDate = normalizeDate(value);
                break;

            // Enum fields
            case 'segment':
                profile.segment = normalizeSegment(value);
                break;
            case 'tier':
                profile.tier = normalizeTier(value);
                break;
            case 'priceRange':
                profile.priceRange = normalizePriceRange(value);
                break;
            case 'source':
                profile.source = normalizeSource(value);
                break;

            // Boolean fields
            case 'equityStatus':
                profile.equityStatus = normalizeBoolean(value);
                break;

            // Array fields
            case 'customTags':
                profile.customTags = normalizeArray(value);
                break;
            case 'preferredCategories':
                profile.preferredCategories = normalizeArray(value);
                break;
            case 'preferredProducts':
                profile.preferredProducts = normalizeArray(value);
                break;
        }
    });

    // Compute display name if not provided
    if (!profile.displayName && (profile.firstName || profile.lastName)) {
        profile.displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }

    // Calculate days since last order
    if (profile.lastOrderDate) {
        profile.daysSinceLastOrder = Math.floor(
            (Date.now() - new Date(profile.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        );
    }

    // Calculate AOV if not provided but we have total spent and order count
    if (!profile.avgOrderValue && profile.totalSpent && profile.orderCount && profile.orderCount > 0) {
        profile.avgOrderValue = profile.totalSpent / profile.orderCount;
    }

    return profile;
}

/**
 * Merge existing customer data with new import data
 */
function mergeCustomerData(
    existing: CustomerProfile,
    imported: Partial<CustomerProfile>
): Partial<CustomerProfile> {
    const merged: Partial<CustomerProfile> = {
        ...existing,
        updatedAt: new Date(),
    };

    // Only overwrite with non-empty values from import
    const fieldsToMerge: (keyof CustomerProfile)[] = [
        'phone', 'firstName', 'lastName', 'displayName',
        'totalSpent', 'orderCount', 'avgOrderValue',
        'lastOrderDate', 'firstOrderDate', 'daysSinceLastOrder',
        'segment', 'tier', 'points', 'lifetimeValue',
        'birthDate', 'notes', 'acquisitionCampaign', 'referralCode',
        'equityStatus', 'priceRange'
    ];

    fieldsToMerge.forEach(field => {
        const importedValue = imported[field];
        if (importedValue !== undefined && importedValue !== null && importedValue !== '') {
            (merged as Record<string, unknown>)[field] = importedValue;
        }
    });

    // Merge arrays (append unique values)
    if (imported.customTags?.length) {
        merged.customTags = [...new Set([...(existing.customTags || []), ...imported.customTags])];
    }
    if (imported.preferredCategories?.length) {
        merged.preferredCategories = [...new Set([...(existing.preferredCategories || []), ...imported.preferredCategories])];
    }
    if (imported.preferredProducts?.length) {
        merged.preferredProducts = [...new Set([...(existing.preferredProducts || []), ...imported.preferredProducts])];
    }

    // Recalculate segment
    merged.segment = calculateSegment(merged as CustomerProfile);

    return merged;
}

// =============================================================================
// DOWNLOAD TEMPLATE
// =============================================================================

/**
 * Get CSV template content
 */
export async function getCustomerImportTemplate(): Promise<string> {
    const headers = [
        'email',
        'first_name',
        'last_name',
        'phone',
        'total_spent',
        'order_count',
        'last_order_date',
        'segment',
        'tier',
        'points',
        'tags',
        'notes'
    ];

    const sampleRow = [
        'customer@example.com',
        'John',
        'Doe',
        '555-123-4567',
        '450.00',
        '5',
        '2024-01-15',
        'loyal',
        'silver',
        '1500',
        'flower lover, preroll fan',
        'Prefers indica strains'
    ];

    return [
        headers.join(','),
        sampleRow.join(',')
    ].join('\n');
}
