import { checkToolPermission } from '@/server/services/tool-permissions';
import { getJuniorWork } from './registry';
import { JuniorContext } from './definition';

export async function runJuniorWork(userId: string, workId: string, inputs: any): Promise<any> {
    const work = getJuniorWork(workId);

    if (!work) {
        throw new Error(`JuniorWork not found: ${workId}`);
    }

    // 1. Permission Check
    const hasAccess = await checkToolPermission(userId, work.id);
    if (!hasAccess) {
        throw new Error(`PERMISSION_REQUIRED: ${work.id}`);
    }

    // 2. Input Validation
    const validation = work.inputSchema.safeParse(inputs);
    if (!validation.success) {
        throw new Error(`Invalid inputs for ${work.id}: ${validation.error.message}`);
    }

    // 3. Execution
    const context: JuniorContext = {
        userId
    };

    try {
        const result = await work.handler(validation.data, context);
        return result;
    } catch (error: any) {
        throw new Error(`JuniorWork execution failed: ${error.message}`);
    }
}
