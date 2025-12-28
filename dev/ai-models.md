# BakedBot AI Model Configuration

> **Last Updated:** 2025-12-28
> **Status:** Production

This document describes the AI models used by BakedBot and their tier-based access levels.

## Text Generation Models

| Model ID | Display Name | API String | Tier Required | Features |
|----------|-------------|------------|---------------|----------|
| `lite` | Lite | `gemini-2.5-flash-lite` | Free | Ultra-efficient, 1M context, fast |
| `standard` | Standard | `gemini-3-flash-preview` | Paid | Fast frontier model, balanced |
| `advanced` | Advanced | `gemini-3-pro-preview` | Paid | Complex reasoning, agentic |
| `expert` | Reasoning | `gemini-3-pro-preview` + High Thinking | Super | Deep thought, test-time compute |
| `genius` | Genius | `gemini-3-pro-preview` + Max Thinking | Super | Maximum intelligence |

### Default Models by Tier
- **Free Users:** `lite` (Gemini 2.5 Flash Lite)
- **Paid Users:** `standard` (Gemini 3 Flash)
- **Super Users:** `genius` (Gemini 3 Pro + Max Thinking)

---

## Image Generation Models

| Model ID | Display Name | API String | Tier Required | Resolution |
|----------|-------------|------------|---------------|------------|
| Free | Nano Banana | `gemini-2.5-flash-image` | Free | 1024px |
| Paid | Nano Banana Pro | `gemini-3-pro-image-preview` | Paid/Super | Up to 4K |

### Image Model Features
- **Nano Banana (2.5 Flash Image):** High-volume, low-latency, cost-effective
- **Nano Banana Pro (3 Pro Image):** Professional quality, Google Search grounding, "Thinking" mode

---

## Agentic Model Routing

For complex tasks requiring tool calling, playbook creation, and thought signatures, BakedBot **always uses Gemini 3 Pro** regardless of user tier.

| Task Type | Model Used | Reason |
|-----------|-----------|--------|
| Simple Q&A | `gemini-2.5-flash-lite` | Cost-effective, fast |
| Product Search | `gemini-2.5-flash-lite` | High volume, low complexity |
| Playbook Creation | `gemini-3-pro-preview` | Agentic features, thought signatures |
| Deep Research | `gemini-3-pro-preview` | Complex reasoning, tool calling |
| Image Generation | Tier-based | See Image Models section |

### Why Gemini 3 Pro for Agentic Tasks?
Reference: [Building AI Agents with Gemini 3](https://developers.googleblog.com/building-ai-agents-with-google-gemini-3-and-open-source-frameworks/)

- **Thought Signatures:** Structured reasoning traces
- **Tool Calling:** Native function calling for complex workflows
- **Long Context:** 2M token window for comprehensive analysis

---

## Free Tier Usage Limits

Free users have weekly limits on premium features:

| Feature | Weekly Limit | Resets |
|---------|-------------|--------|
| Playbook Creations | 1 | Every Sunday UTC |
| Deep Research Tasks | 1 | Every Sunday UTC |
| Image Generations | 5 | Every Sunday UTC |

### Tracking Implementation
- **Service:** `src/server/services/usage-tracking.ts`
- **Collection:** `user_usage` in Firestore
- **Functions:** `checkUsage()`, `incrementUsage()`, `getRemainingUsage()`

---

## Configuration Files

### Primary Configuration
- **`src/ai/model-selector.ts`** - Model tier definitions, agentic model, usage limits
- **`src/ai/genkit.ts`** - Default model (free tier)
- **`src/ai/flows/generate-social-image.ts`** - Image generation with tier support
- **`src/ai/flows/suggest-playbook.ts`** - Playbook generation (uses AGENTIC_MODEL)
- **`src/server/services/usage-tracking.ts`** - Free tier usage limits

### UI Components
- **`src/app/dashboard/ceo/components/model-selector.tsx`** - Intelligence dropdown

---

## API Usage

### Getting Model Config
```typescript
import { getModelConfig, getAvailableModels, getGenerateOptions } from '@/ai/model-selector';

// Get config for a specific level
const config = getModelConfig('advanced');
// { model: 'googleai/gemini-3-pro-preview', thinkingLevel: undefined, ... }

// Get available models for user tier
const available = getAvailableModels('paid');
// ['lite', 'standard', 'advanced']

// Get Genkit options for generation
const options = getGenerateOptions('genius');
// { model: '...', config: { thinkingConfig: { thinkingLevel: 'max' } } }
```

### Using Image Generation with Tier
```typescript
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';

// Free tier (default)
const freeImage = await generateImageFromPrompt('A futuristic dispensary');

// Paid tier
const proImage = await generateImageFromPrompt('A premium cannabis product', { tier: 'paid' });
```

---

## Gemini Models Reference

### Official Documentation Links
- [Gemini 2.5 Flash Lite](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-lite)
- [Gemini 3 Pro Preview](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-3-pro-preview)
- [Nano Banana (Image Gen)](https://ai.google.dev/gemini-api/docs/nanobanana)
- [Image Generation Guide](https://ai.google.dev/gemini-api/docs/image-generation)

### Model Capabilities Summary

| Model | Context Window | Thinking | Multimodal | Best For |
|-------|---------------|----------|------------|----------|
| 2.5 Flash Lite | 1M tokens | Yes | Input only | High-volume, cost-sensitive |
| 3 Flash | 1M tokens | Partial | Yes | Balanced performance |
| 3 Pro | 2M tokens | Full | Yes | Complex reasoning, agents |

---

## Environment Variables

Required for model access:
```
GEMINI_API_KEY=your_key_here
# or
GOOGLE_API_KEY=your_key_here
```

---

## Unit Tests

Run model selector tests:
```bash
npm test -- --testPathPattern=model-selector
```

See: `src/ai/__tests__/model-selector.test.ts`
