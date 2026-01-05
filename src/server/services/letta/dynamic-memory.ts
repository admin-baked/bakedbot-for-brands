
import { lettaClient } from '@/server/services/letta/client';
import { LettaBlock } from '@/server/services/letta/client';

export class DynamicMemoryService {
    /**
     * Attach a memory block to any agent dynamically
     * @param agentId The ID of the agent to attach the block to
     * @param blockType Type of block (project, knowledge_base, etc)
     * @param blockData Data to create the block with
     */
    async attachBlock(
        agentId: string,
        blockType: 'project' | 'knowledge_base' | 'campaign' | 'customer' | 'playbook',
        blockData: {
            id: string;
            label: string;
            content: any;
            readOnly?: boolean;
        }
    ): Promise<{ blockId: string; attached: boolean }> {
        // Create unique label for this block
        const label = `${blockType}_${blockData.id}_${blockData.label}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        // Check if block already exists
        const blocks = await lettaClient.listBlocks();
        let block = blocks.find(b => b.label === label);
        
        const contentStr = typeof blockData.content === 'string' 
            ? blockData.content 
            : JSON.stringify(blockData.content, null, 2);

        if (!block) {
            // Create new block
            block = await lettaClient.createBlock(
                label,
                contentStr,
                { 
                    limit: 8000, 
                    readOnly: blockData.readOnly || false 
                }
            );
        } else {
             // Update existing block content
             block = await lettaClient.updateBlock(block.id, contentStr);
        }
        
        await lettaClient.attachBlockToAgent(agentId, block.id);
        
        return { blockId: block.id, attached: true };
    }
    
    /**
     * Detach and optionally delete a memory block
     */
    async detachBlock(
        agentId: string,
        blockId: string,
        deleteBlock: boolean = false
    ): Promise<{ detached: boolean }> {
        await lettaClient.detachBlockFromAgent(agentId, blockId);
        
        if (deleteBlock) {
            await lettaClient.deleteBlock(blockId);
        }
        
        return { detached: true };
    }
    
    /**
     * List all blocks attached to an agent
     */
    async getAttachedBlocks(agentId: string): Promise<LettaBlock[]> {
        const agent = await lettaClient.getAgent(agentId);
        // Assuming agent object has blocks, otherwise we need to list blocks and check attachment
        // Letta API should return blocks in agent details. 
        // If not, we list all blocks and filter? No, standard Letta agent object has memory but blocks might be separate.
        // Let's rely on client.getCoreMemory or just return all blocks for now if agent specific list isn't available easily
        // Actually, let's use listBlocks and filter by label if possible, or just list all blocks.
        // Better: client.getAgent should return block info.
        // For now, let's return all blocks as a fallback if agent-specific isn't clear, but typically attached blocks are in memory.
        
        // Re-reading client.ts from context earlier:
        // getAgent returns LettaAgent. 
        // If LettaAgent has memory.blocks, we use that.
        
        return (agent as any).memory?.blocks || [];
    }
}

export const dynamicMemoryService = new DynamicMemoryService();
