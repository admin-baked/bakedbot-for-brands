const SIMPLE_FAST_PATH_PATTERNS = [
    /^(hi|hello|hey|yo|sup|greetings|good\s+(morning|afternoon|evening))[\s!?.]*$/i,
    /^(show|list|what\s+are)\s+(all\s+)?(active\s+)?agents/i,
    /^(who|what)\s+(are\s+)?(the\s+)?agents/i,
    /^agent\s+(status|list|squad)/i,
    /^(help|how\s+do\s+I|what\s+can\s+you\s+do)/i,
    /^(thanks|thank\s+you|ok|okay|got\s+it|understood)[\s!?.]*$/i,
];

const EXPLICIT_META_FAST_PATH_PATTERNS = [
    /^(?:(?:what|which)\s+(?:ai\s+)?(?:model|version|engine|brain)\s+(?:are\s+you\s+(?:using|on)|is\s+this)|what(?:'s| is)\s+(?:your|the)\s+(?:ai\s+)?(?:model|version|engine|brain)|are\s+you\s+using\s+(?:a\s+)?(?:different\s+)?(?:model|version|engine|brain))\b.*$/i,
    /^(?:(?:what|how)(?:'s| is)?\s+(?:your|the)\s+(?:latency|speed|performance)|how\s+(?:fast|slow)\s+are\s+you|why\s+(?:are\s+you|is\s+this)\s+(?:so\s+)?(?:slow|fast|laggy)|are\s+you\s+(?:slow|fast|laggy)|why\s+is\s+this\s+taking\s+so\s+long)\b.*$/i,
];

const AGENT_STATUS_QUERY_PATTERN = /show.*agents|agent.*status|list.*agents|agents.*active/i;

export interface FastPathClassification {
    isAgentStatusQuery: boolean;
    isFastPathQuery: boolean;
}

export function classifyFastPathQuery(userMessage: string): FastPathClassification {
    const trimmedMessage = userMessage.trim();
    const isSimpleFastPathQuery = SIMPLE_FAST_PATH_PATTERNS.some(pattern => pattern.test(trimmedMessage));
    const isExplicitMetaFastPathQuery = EXPLICIT_META_FAST_PATH_PATTERNS.some(pattern => pattern.test(trimmedMessage));
    const isAgentStatusQuery = AGENT_STATUS_QUERY_PATTERN.test(trimmedMessage);

    return {
        isAgentStatusQuery,
        isFastPathQuery: isSimpleFastPathQuery || isExplicitMetaFastPathQuery,
    };
}
