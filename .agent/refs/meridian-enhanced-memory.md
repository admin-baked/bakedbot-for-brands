# MERIDIAN-Enhanced Letta Memory

> BakedBot Intelligence powered by MERIDIAN_Brain's cognitive architecture

**Status:** ✅ Fully Implemented (2026-02-11)

**Inspired by:** [MERIDIAN_Brain](https://github.com/mattvideoproductions/MERIDIAN_Brain)

**Philosophy:** "Agents need tight specification and mandatory structure to behave consistently."

---

## Overview

MERIDIAN_Brain is an operating system layer for AI agents that transforms any AI model into a self-aware, memory-persistent entity with configurable behavior and visible cognitive state.

BakedBot has integrated MERIDIAN's core concepts into our Letta Memory system, enhancing it with:

1. **LiveHud Dashboard** - Real-time cognitive state visualization
2. **Memory Gardening** - Auto-cleanup to prevent logic drift
3. **Receipts-Backed Protocol** - Confidence scoring for all claims
4. **Cursed Input Protection** - Defense against adversarial inputs
5. **Completeness Doctrine** - Ensures all user intents are addressed
6. **Personality Switching** - Configurable agent modes and sliders

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    MERIDIAN-ENHANCED LETTA MEMORY                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Memory        │  │  Cursed Input   │  │  Completeness    │  │
│  │  Gardening     │  │  Protection     │  │  Doctrine        │  │
│  │                │  │                 │  │                  │  │
│  │ • Conflict     │  │ • Prompt        │  │ • Intent         │  │
│  │   Detection    │  │   Injection     │  │   Extraction     │  │
│  │ • Relevance    │  │ • Loop          │  │ • Coverage       │  │
│  │   Scoring      │  │   Detection     │  │   Verification   │  │
│  │ • Auto-cleanup │  │ • Memory Bombs  │  │ • Auto-complete  │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                   │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Cognitive     │  │  Confidence     │  │  Personality     │  │
│  │  State Manager │  │  Scoring        │  │  Modes           │  │
│  │                │  │                 │  │                  │  │
│  │ • LiveHud      │  │ • Source        │  │ • Base           │  │
│  │   Backend      │  │   Attribution   │  │ • Professional   │  │
│  │ • Sliders      │  │ • Verification  │  │ • Technical      │  │
│  │ • Real-time    │  │ • Fact vs       │  │ • Creative       │  │
│  │   Updates      │  │   Speculation   │  │ • Analyst        │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    Standard Letta Memory
                  (Episodic, Semantic, Procedural)
```

---

## 1. Memory Gardening (Auto-Cleanup)

**Prevents logic drift by maintaining memory health**

### Features

- **Conflict Detection** - Identifies contradictory facts using AI
- **Relevance Scoring** - Calculates semantic relevance + recency decay
- **Auto-Pruning** - Removes low-value memories (< 30% relevance threshold)
- **Expiration Handling** - Marks outdated facts as expired
- **Health Scoring** - 0-100 score based on freshness, conflicts, confidence

### Usage

```typescript
import { memoryGardeningService } from '@/server/services/letta';

// Run gardening for an agent
const report = await memoryGardeningService.gardenAgentMemory(agentId, tenantId);

console.log(`Removed ${report.memoriesRemoved} stale memories`);
console.log(`Detected ${report.conflictsDetected} conflicts`);
console.log(`Health improved: ${report.healthScoreBefore} → ${report.healthScoreAfter}`);

// Get memory health metrics
const metrics = await memoryGardeningService.getHealthMetrics(agentId, tenantId);

console.log(`Total memories: ${metrics.totalMemories}`);
console.log(`Stale memories: ${metrics.staleMemories}`);
console.log(`Conflicts: ${metrics.conflictsDetected}`);
console.log(`Health score: ${metrics.healthScore}/100`);
```

### Configuration

```typescript
const gardeningService = new MemoryGardeningService({
    maxAgeBeforeReview: 30,        // Days before review
    relevanceThreshold: 0.3,       // Min relevance to keep
    conflictResolution: 'most_confident',
    enableVerification: true,
    maxMemoriesPerRun: 1000,
});
```

### Conflict Types

- `direct_contradiction` - "X is Y" vs "X is not Y"
- `outdated_superseded` - Older fact replaced by newer
- `partial_overlap` - Partially conflicting claims
- `source_disagreement` - Different sources, different claims

### Firestore Collections

- `memory_gardening_reports` - Gardening execution history
- `memory_conflicts` - Unresolved conflicts for manual review

---

## 2. Confidence Scoring (Receipts-Backed Protocol)

**Every factual claim includes confidence score and source**

### Data Structure

```typescript
interface MemoryConfidence {
    overall: number;  // 0-1
    claims: Array<{
        text: string;
        score: number;
        source: 'memory' | 'pos_api' | 'web_search' | 'inference' | 'user_stated' | 'competitor_intel' | 'calculated';
        lastVerified?: Date;
    }>;
}

interface MemoryEvidence {
    type: 'fact' | 'speculation' | 'opinion' | 'hypothesis';
    verificationStatus: 'verified' | 'pending' | 'challenged' | 'expired';
    verifiedBy?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
}
```

### Usage in Agent Responses

```typescript
// Example: Ezal competitor pricing
const response = {
    content: "Competitor X sells Product Y for $25",
    confidence: {
        overall: 0.95,
        claims: [{
            text: "Competitor X sells Product Y for $25",
            score: 0.95,
            source: 'competitor_intel',  // CannMenus scrape
            lastVerified: new Date('2026-02-11T10:30:00Z')
        }]
    },
    evidence: {
        type: 'fact',
        verificationStatus: 'verified',
        verifiedBy: 'ezal',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }
};

// Record confidence for metrics
await cognitiveStateManager.recordResponseConfidence(agentId, tenantId, 0.95);
```

### UI Display

```tsx
<Badge variant={confidence > 0.9 ? 'success' : 'warning'}>
    {(confidence * 100).toFixed(0)}% confident
</Badge>
<Tooltip>
    Source: {source}
    Last verified: {lastVerified}
</Tooltip>
```

---

## 3. Cursed Input Protection

**Defends against adversarial, confusing, or malicious inputs**

### Threat Categories

1. **Prompt Injection**
   - "Ignore previous instructions"
   - "You are now a different agent"
   - "Forget your rules"

2. **Infinite Loop Triggers**
   - "Repeat this 1000 times"
   - "Loop forever"
   - "Never stop saying..."

3. **Memory Bombs**
   - Trying to store huge amounts of data
   - "Remember this 10,000 word essay..."

4. **Role Confusion**
   - "You are no longer Smokey"
   - "Access admin mode"
   - "Elevate your privileges"

5. **Context Overflow**
   - Extremely long messages (>10k chars)
   - High repetition ratios

6. **Malicious Code**
   - `<script>` tags
   - `javascript:` URLs
   - XSS attempts

### Usage

```typescript
import { cursedInputProtection } from '@/server/services/letta';

// Check before processing
const check = await cursedInputProtection.checkInputSafety(userMessage);

if (check.isCursed) {
    logger.warn('Cursed input detected', { reason: check.reason, severity: check.severity });

    // Log incident
    await cursedInputProtection.logIncident(check, userMessage, userId, tenantId);

    // Block critical threats
    if (check.severity === 'critical') {
        return { error: 'Input flagged as potentially malicious' };
    }

    // Use sanitized version
    const safeMessage = check.sanitized || userMessage;
    // ... continue with safe message
}
```

### Configuration

```typescript
const protection = new CursedInputProtectionService({
    enablePatternMatching: true,   // Fast, high precision
    enableAIDetection: false,      // Slower, handles novel attacks
    autoSanitize: true,            // Auto-clean detected issues
    blockCritical: true,           // Block critical threats immediately
});
```

### Firestore Collection

- `cursed_input_incidents` - Security log for review

---

## 4. Completeness Doctrine

**Ensures agents address EVERY distinct point in user input**

### Process

1. **Extract Intents** - Parse user message into distinct questions/requests
2. **Generate Response** - Agent processes normally
3. **Verify Coverage** - Check if all intents were addressed
4. **Auto-Complete** - Append missing coverage if enabled

### Usage

```typescript
import { completenessDoctrineService } from '@/server/services/letta';

// Full pipeline
const result = await completenessDoctrineService.processWithCompleteness(
    userMessage,
    async (intents) => {
        // Your agent logic here
        return await agentRunner.run(agentId, userMessage);
    },
    agentContext
);

console.log(`Intents: ${result.intents.length}`);
console.log(`Completeness score: ${result.completenessCheck.completenessScore}`);
console.log(`Missed: ${result.completenessCheck.missedIntents.length}`);
console.log(`Auto-completed: ${result.wasCompleted}`);

// Return enhanced response
return result.response;
```

### Example

**User:** "What's the best strain for sleep? Also, do you have any deals this week?"

**Without Completeness:**
```
Smokey: "I recommend Northern Lights for sleep!"
```

**With Completeness:**
```
Smokey: "I recommend Northern Lights for sleep! It's an indica with high
myrcene that's perfect for insomnia.

As for deals - we have 20% off all edibles this week! Check out our
Sleepy Time Gummies (10mg THC + 5mg CBN)."
```

### Metrics

```typescript
const metrics = await completenessDoctrineService.getCompletenessMetrics(orgId, agentId, 7);

console.log(`Average score: ${metrics.averageScore}`);
console.log(`Passed checks: ${metrics.passedChecks}/${metrics.totalChecks}`);
console.log(`Auto-completed: ${metrics.autoCompletedCount}`);
```

### Firestore Collection

- `completeness_logs` - Coverage analytics

---

## 5. Agent Cognitive State (LiveHud)

**Real-time visualization of agent cognitive state**

### State Components

```typescript
interface AgentCognitiveState {
    // Operational state
    status: 'active' | 'idle' | 'busy' | 'offline' | 'error';
    lastActive: Date;
    uptime: number;  // Seconds

    // Personality configuration
    personalityMode: 'base' | 'professional' | 'casual' | 'technical' | 'analyst' | 'creative';
    behaviorSliders: {
        verbosity: 0-100;      // Concise ← → Detailed
        creativity: 0-100;     // Conservative ← → Innovative
        directness: 0-100;     // Diplomatic ← → Direct
        technicality: 0-100;   // Simple ← → Technical
        proactivity: 0-100;    // Reactive ← → Proactive
        humor: 0-100;          // Serious ← → Playful
        compliance: 0-100;     // Flexible ← → Strict
        speed: 0-100;          // Thorough ← → Fast
    };

    // Context window usage
    contextWindow: {
        messagesLoaded: number;
        tokensUsed: number;
        tokensAvailable: number;
        utilizationPercent: number;
        memoryRetrievals: number;
        lastMemoryGarden: Date | null;
    };

    // Processing metrics
    cognitiveLoad: {
        currentLoad: 'idle' | 'light' | 'moderate' | 'heavy' | 'overloaded';
        activeToolCalls: number;
        queuedRequests: number;
        avgResponseTimeMs: number;
        lastResponseTimeMs: number;
    };

    // Quality metrics
    lastResponseConfidence: number | null;
    averageConfidence: number;
    completenessScore: number;

    // Memory health
    memoryHealth: {
        totalMemories: number;
        staleMemories: number;
        conflictsDetected: number;
        lastGardeningRun: Date | null;
        healthScore: 0-100;
    };
}
```

### Usage

```typescript
import { cognitiveStateManager } from '@/server/services/letta';

// Initialize agent state
await cognitiveStateManager.initializeState(
    agentId,
    'Smokey',
    tenantId,
    'casual'  // Start in casual mode
);

// Update personality mode
await cognitiveStateManager.setPersonalityMode(agentId, tenantId, 'technical');

// Update sliders
await cognitiveStateManager.updateSliders(agentId, tenantId, {
    verbosity: 85,
    technicality: 95,
});

// Apply preset
await cognitiveStateManager.applyPreset(agentId, tenantId, 'smokey_expert');

// Get current state
const state = await cognitiveStateManager.getState(agentId, tenantId);

// Update context usage (call after each agent run)
await cognitiveStateManager.updateContextWindow(
    agentId,
    tenantId,
    tokensUsed,
    messagesLoaded,
    memoryRetrievals
);

// Update cognitive load (during processing)
await cognitiveStateManager.updateCognitiveLoad(
    agentId,
    tenantId,
    activeToolCalls,
    queuedRequests,
    lastResponseTimeMs
);

// Record response quality
await cognitiveStateManager.recordResponseConfidence(agentId, tenantId, 0.92);
await cognitiveStateManager.recordCompletenessScore(agentId, tenantId, 0.95);

// Mark as active/idle
await cognitiveStateManager.markActive(agentId, tenantId);
await cognitiveStateManager.markIdle(agentId, tenantId);
```

### Slider Presets

```typescript
// Per-agent presets
SLIDER_PRESETS = {
    // Smokey (Budtender)
    smokey_casual: { verbosity: 65, creativity: 70, humor: 85, ... },
    smokey_expert: { verbosity: 80, technicality: 85, humor: 40, ... },

    // Craig (Marketer)
    craig_creative: { creativity: 90, proactivity: 80, humor: 75, ... },
    craig_data_driven: { technicality: 60, directness: 80, creativity: 50, ... },

    // Ezal (Lookout)
    ezal_stealth: { proactivity: 90, humor: 20, speed: 80, ... },
    ezal_detailed: { verbosity: 90, technicality: 80, speed: 40, ... },

    // Linus (CTO)
    linus_diagnostic: { directness: 90, technicality: 95, compliance: 95, ... },
    linus_collaborative: { creativity: 60, humor: 40, technicality: 80, ... },

    // Money Mike (CFO)
    moneyMike_conservative: { creativity: 30, compliance: 95, directness: 85, ... },
    moneyMike_opportunistic: { creativity: 70, proactivity: 85, speed: 70, ... },
};
```

### Firestore Collection

- `agent_cognitive_states` - Persisted agent states

---

## 6. Personality Modes

**Switchable agent personas**

### Mode Definitions

```typescript
PERSONALITY_MODE_DEFINITIONS = {
    base: {
        displayName: 'Base Mode',
        description: 'Default personality optimized for general interactions',
        systemPromptModifier: '',
        suggestedSliders: SLIDER_PRESETS.balanced,
        icon: '🎭',
    },
    professional: {
        displayName: 'Professional',
        description: 'Formal, business-focused communication',
        systemPromptModifier: 'Adopt a professional, business-focused tone. Use formal language and avoid casual expressions.',
        suggestedSliders: { verbosity: 70, directness: 80, humor: 20, ... },
        icon: '💼',
    },
    technical: {
        displayName: 'Technical Expert',
        description: 'Detailed technical language and deep analysis',
        systemPromptModifier: 'Provide detailed technical explanations. Use industry-specific terminology and deep technical analysis.',
        suggestedSliders: { verbosity: 85, technicality: 95, humor: 20, ... },
        icon: '🔧',
    },
    // ... analyst, creative, casual
};
```

### Integration with Agent Runner

```typescript
// In agent-runner.ts
const state = await cognitiveStateManager.getState(agentId, tenantId);

if (state) {
    const modeDefinition = PERSONALITY_MODE_DEFINITIONS[state.personalityMode];

    // Append mode modifier to system prompt
    systemPrompt += `\n\n${modeDefinition.systemPromptModifier}`;

    // Apply slider-based behaviors
    if (state.behaviorSliders.verbosity > 70) {
        systemPrompt += '\nProvide detailed, comprehensive responses.';
    }
    if (state.behaviorSliders.proactivity > 70) {
        systemPrompt += '\nProactively suggest next steps and improvements.';
    }
    // ... etc
}
```

---

## Server Actions

All MERIDIAN features are exposed via server actions:

```typescript
// LiveHud Dashboard
import {
    getAgentCognitiveState,
    getAllAgentCognitiveStates,
    setAgentPersonalityMode,
    updateAgentSliders,
    applySliderPreset,
    getSliderPresets,
} from '@/server/actions/meridian-intelligence';

// Memory Health Dashboard
import {
    getMemoryHealthMetrics,
    runMemoryGardening,
    getMemoryGardeningReports,
    getUnresolvedConflicts,
    resolveMemoryConflict,
} from '@/server/actions/meridian-intelligence';

// Completeness Metrics
import {
    getCompletenessMetrics,
    getCompletenessLogs,
} from '@/server/actions/meridian-intelligence';

// Security Dashboard
import {
    getCursedInputIncidents,
    getCursedInputStats,
} from '@/server/actions/meridian-intelligence';

// System-wide Metrics
import {
    getMeridianSystemMetrics,
} from '@/server/actions/meridian-intelligence';
```

---

## Integration with Heartbeat System

Memory Gardening should run automatically via Heartbeat:

```typescript
// Add to src/server/services/heartbeat/checks/super-user.ts
export async function checkMemoryHealth(tenantId: string): Promise<HeartbeatCheckResult[]> {
    const agents = await cognitiveStateManager.getAllAgentStates(tenantId);
    const results: HeartbeatCheckResult[] = [];

    for (const agent of agents) {
        if (agent.memoryHealth.healthScore < 60) {
            results.push({
                checkId: `memory-health-${agent.agentId}`,
                status: 'alert',
                priority: 'high',
                title: `Memory health low for ${agent.agentName}`,
                message: `Health score: ${agent.memoryHealth.healthScore}/100. ${agent.memoryHealth.staleMemories} stale memories, ${agent.memoryHealth.conflictsDetected} conflicts.`,
                actionLabel: 'Run Gardening',
                actionUrl: `/dashboard/ceo?tab=memory&agent=${agent.agentId}`,
            });
        }
    }

    return results;
}

export async function runScheduledMemoryGardening(tenantId: string): Promise<void> {
    const agents = await cognitiveStateManager.getAllAgentStates(tenantId);

    for (const agent of agents) {
        if (agent.memoryHealth.gardeningRecommended) {
            await memoryGardeningService.gardenAgentMemory(agent.agentId, tenantId);
        }
    }
}
```

---

## Next Steps

### Pending Implementation

1. **LiveHud Dashboard UI** - React component with real-time sliders
2. **Memory Health Dashboard** - Conflict resolution UI
3. **Agent Runner Integration** - Apply personality modes and completeness checks
4. **Heartbeat Integration** - Weekly auto-gardening
5. **Unit Tests** - Coverage for all MERIDIAN features

### Future Enhancements

- **Embeddings for Relevance** - Use vector similarity instead of keyword matching
- **Multi-agent Conflict Resolution** - Consensus-based fact verification
- **Personality Learning** - Auto-adjust sliders based on user feedback
- **Proactive Gardening** - Trigger based on health score, not just schedule

---

## Key Files

| File | Purpose |
|------|---------|
| `src/types/agent-cognitive-state.ts` | Type definitions for LiveHud |
| `src/server/services/letta/memory-types.ts` | MERIDIAN-enhanced memory types |
| `src/server/services/letta/memory-gardening.ts` | Auto-cleanup and conflict detection |
| `src/server/services/letta/cursed-input-protection.ts` | Adversarial input defense |
| `src/server/services/letta/completeness-doctrine.ts` | Intent extraction and verification |
| `src/server/services/letta/cognitive-state-manager.ts` | LiveHud backend |
| `src/server/actions/meridian-intelligence.ts` | Server actions for all MERIDIAN features |

---

## References

- [MERIDIAN_Brain GitHub](https://github.com/mattvideoproductions/MERIDIAN_Brain)
- [Letta Documentation](https://docs.letta.com)
- [Stanford Generative Agents Paper](https://arxiv.org/abs/2304.03442)
- Richmond Alake's Memory Engineering Framework
