'use server';

import { PageGeneratorService } from '@/server/services/page-generator';

export async function runDispensaryScan(limit: number, dryRun: boolean) {
    try {
        const service = new PageGeneratorService();
        return await service.scanAndGenerateDispensaries({ limit, dryRun });
    } catch (error: any) {
        return { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
    }
}

export async function runBrandScan(limit: number, dryRun: boolean) {
    try {
        const service = new PageGeneratorService();
        return await service.scanAndGenerateBrands({ limit, dryRun });
    } catch (error: any) {
        return { success: false, itemsFound: 0, pagesCreated: 0, errors: [error.message] };
    }
}
