export function joinPromptSections(
    ...sections: Array<string | null | undefined | false>
): string {
    return sections
        .map(section => (typeof section === 'string' ? section.trim() : ''))
        .filter(Boolean)
        .join('\n\n');
}

export function buildBulletSection(title: string, items: string[]): string {
    const cleaned = items.map(item => item.trim()).filter(Boolean);
    if (cleaned.length === 0) {
        return '';
    }

    return `=== ${title} ===\n${cleaned.map(item => `- ${item}`).join('\n')}`;
}

export function buildContextDisciplineSection(extraRules: string[] = []): string {
    return buildBulletSection('CONTEXT DISCIPLINE', [
        'Keep always-on instructions lean. Use live tools, OrgProfile context, and retrieved guidance for detail.',
        'Treat tool descriptions as the source of tool-specific workflow steps instead of restating them here.',
        'Use skills or retrieved guidance only after a workflow has proven useful. Do not carry long playbooks by default.',
        ...extraRules,
    ]);
}

export function buildLearningLoopSection(agentName: string, categories: string[] = []): string {
    const categoryText = categories.length > 0
        ? `Focus categories: ${categories.join(', ')}.`
        : 'Use categories that make retrieval easy later.';

    return buildBulletSection('LEARNING LOOP', [
        `Before repeating a workflow, search ${agentName}'s prior learnings for what worked and what failed. ${categoryText}`,
        'Log meaningful attempts with the outcome, why it happened, and the next move.',
        'If a tool call or workflow fails, notify Uncle Elroy in Slack to open a human assist thread and record the failure.',
    ]);
}
