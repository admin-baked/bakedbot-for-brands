# Conflict Resolution Patch (Semantic Search Agent Merge)

This folder contains a clean patch for resolving the recurring PR merge conflicts between `work` and `main` in the agent files:

- `src/server/agents/dayday.ts`
- `src/server/agents/executive.ts`
- `src/server/agents/glenda.ts`
- `src/server/agents/jack.ts`
- `src/server/agents/leo.ts`
- `src/server/agents/mrsParker.ts`

## Resolution Rule
Keep the incoming `semanticSearchEntityId` strategy in each agent `act()` method:

```ts
const semanticSearchEntityId =
  (brandMemory.brand_profile as any)?.id ||
  (brandMemory.brand_profile as any)?.orgId ||
  'unknown';
```

Then pass this into semantic tools:

```ts
makeSemanticSearchToolsImpl(semanticSearchEntityId)
```

## Apply Locally

```bash
git apply docs/conflict-resolution/semantic-search-merge-resolution.patch
```

## Apply in GitHub Conflict Editor
Use this patch as the source-of-truth for the six conflicted files and pick the `semanticSearchEntityId` variant over `brandId` / `orgId`-only variants.
