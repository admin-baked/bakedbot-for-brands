# NotebookLM MCP Integration - Usage Examples

## Overview

This guide shows practical examples of using the NotebookLM MCP integration for research, competitive intelligence, and knowledge retrieval in your BakedBot system.

---

## Quick Start Examples

### 1. Direct API Testing (PowerShell)

#### Basic Health Check
```powershell
# Check if the service is running
Invoke-RestMethod -Uri "http://34.121.173.152:8080/health"
```

#### List Available Tools
```powershell
# See all 8 available MCP tools
$tools = Invoke-RestMethod -Uri "http://34.121.173.152:8080/mcp/list"
$tools | Format-Table name, description
```

#### Simple Chat Query
```powershell
# Ask a question about the notebook content
$body = @{
    tool_name = "chat_with_notebook"
    arguments = @{
        request = @{
            message = "What are the key insights from this research?"
        }
    }
} | ConvertTo-Json -Depth 5

$result = Invoke-RestMethod -Uri "http://34.121.173.152:8080/mcp/call" `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body

# Parse the response
$response = ($result.result.text | ConvertFrom-Json)
Write-Host $response.response
```

---

## BakedBot Agent Integration Examples

### 2. Big Worm Agent - Competitive Intelligence

**Use Case:** Analyze competitor pricing and product strategies stored in NotebookLM

```typescript
// src/server/agents/big-worm/notebooklm-research.ts

import { callPythonSidecar } from '@/server/services/python-sidecar';

export async function researchCompetitor(
  competitorName: string,
  topic: string
): Promise<string> {
  const message = `Analyze ${competitorName}'s strategy regarding ${topic}.
  Provide key insights, pricing information, and competitive advantages.`;

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: {
          message,
          notebook_id: '59f47d3e-9e5c-4adc-9254-bd78f076898c'
        }
      }
    }
  });

  if (result.success && result.result?.text) {
    const response = JSON.parse(result.result.text);
    return response.response || response.error;
  }

  throw new Error('Failed to get research insights');
}

// Usage in Big Worm agent
async function analyzeMarket() {
  const competitors = ['Competitor A', 'Competitor B', 'Competitor C'];

  for (const competitor of competitors) {
    const insights = await researchCompetitor(
      competitor,
      'CBD product pricing and positioning'
    );

    console.log(`\n=== ${competitor} Analysis ===`);
    console.log(insights);
  }
}
```

### 3. Ezal Agent - Market Research

**Use Case:** Query competitive intelligence gathered in NotebookLM

```typescript
// src/server/agents/ezal/market-intelligence.ts

interface MarketQuery {
  topic: string;
  brands?: string[];
  region?: string;
}

export async function queryMarketIntelligence(
  query: MarketQuery
): Promise<{
  insights: string;
  sources: string[];
  timestamp: Date;
}> {
  const message = `
    Market Research Query:
    - Topic: ${query.topic}
    ${query.brands ? `- Brands: ${query.brands.join(', ')}` : ''}
    ${query.region ? `- Region: ${query.region}` : ''}

    Provide a comprehensive analysis with specific data points.
  `.trim();

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message }
      }
    }
  });

  if (result.success) {
    const response = JSON.parse(result.result.text);
    return {
      insights: response.response,
      sources: response.sources || [],
      timestamp: new Date()
    };
  }

  throw new Error('Market intelligence query failed');
}

// Usage example
const marketData = await queryMarketIntelligence({
  topic: 'Cannabis delivery services in California',
  brands: ['Eaze', 'Dutchie', 'Jane'],
  region: 'Los Angeles'
});
```

### 4. Craig Agent - Marketing Research

**Use Case:** Generate marketing campaign ideas based on NotebookLM research

```typescript
// src/server/agents/craig/campaign-research.ts

export async function researchCampaignIdeas(
  productCategory: string,
  targetAudience: string,
  objective: string
): Promise<{
  campaigns: string[];
  trends: string[];
  recommendations: string;
}> {
  const message = `
    I need marketing campaign ideas for:
    - Product: ${productCategory}
    - Audience: ${targetAudience}
    - Goal: ${objective}

    Based on the research in this notebook, what are:
    1. Successful campaign strategies
    2. Current industry trends
    3. Specific recommendations for this use case
  `.trim();

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message }
      }
    }
  });

  if (result.success) {
    const response = JSON.parse(result.result.text);

    // Parse the structured response
    return {
      campaigns: extractCampaigns(response.response),
      trends: extractTrends(response.response),
      recommendations: response.response
    };
  }

  throw new Error('Campaign research failed');
}

// Usage in Craig agent
const campaignIdeas = await researchCampaignIdeas(
  'CBD wellness products',
  'health-conscious millennials',
  'increase brand awareness'
);
```

### 5. Product Knowledge for Smokey Agent

**Use Case:** Retrieve detailed product information for recommendations

```typescript
// src/server/agents/smokey/product-knowledge.ts

export async function getProductKnowledge(
  productType: string,
  question: string
): Promise<string> {
  const message = `
    Product Type: ${productType}
    Customer Question: ${question}

    Provide accurate, detailed information to help answer this question.
    Include effects, usage recommendations, and relevant warnings.
  `.trim();

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message }
      }
    }
  });

  if (result.success && result.result?.text) {
    const response = JSON.parse(result.result.text);
    return response.response;
  }

  return 'Unable to retrieve product information at this time.';
}

// Integration with Smokey's recommendation engine
async function enhanceProductRecommendation(
  product: Product,
  userQuery: string
): Promise<EnhancedProduct> {
  const knowledge = await getProductKnowledge(
    product.category,
    `What should I know about ${product.name}?`
  );

  return {
    ...product,
    aiEnhancedDescription: knowledge,
    answersUserQuery: true
  };
}
```

---

## Advanced Usage Patterns

### 6. Multi-Step Research Workflow

```typescript
// src/server/services/research-workflow.ts

export async function conductResearch(
  topic: string,
  depth: 'quick' | 'deep' = 'quick'
): Promise<ResearchReport> {
  // Step 1: Send initial query
  await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'send_chat_message',
      arguments: {
        request: {
          message: `Research topic: ${topic}`,
          wait_for_response: false
        }
      }
    }
  });

  // Step 2: Get response with streaming
  const response = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'get_chat_response',
      arguments: {
        request: {
          timeout: depth === 'deep' ? 60 : 30
        }
      }
    }
  });

  // Step 3: Process and structure results
  const data = JSON.parse(response.result.text);

  return {
    topic,
    summary: data.response,
    depth,
    timestamp: new Date(),
    sources: data.sources || []
  };
}
```

### 7. Batch Processing Multiple Queries

```typescript
// src/server/services/batch-research.ts

export async function batchResearch(
  queries: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const query of queries) {
    try {
      const result = await callPythonSidecar({
        action: 'mcp_call',
        data: {
          tool_name: 'chat_with_notebook',
          arguments: {
            request: { message: query }
          }
        }
      });

      if (result.success) {
        const response = JSON.parse(result.result.text);
        results.set(query, response.response);
      }

      // Rate limiting - wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Query failed: ${query}`, error);
      results.set(query, 'Error: Query failed');
    }
  }

  return results;
}

// Usage
const queries = [
  'What are the top-selling product categories?',
  'What pricing strategies are competitors using?',
  'What are customer pain points in the research?'
];

const insights = await batchResearch(queries);
```

### 8. Notebook Management

```typescript
// src/server/services/notebook-manager.ts

export class NotebookManager {
  private currentNotebook: string | null = null;

  async switchNotebook(notebookId: string): Promise<boolean> {
    const result = await callPythonSidecar({
      action: 'mcp_call',
      data: {
        tool_name: 'navigate_to_notebook',
        arguments: {
          request: { notebook_id: notebookId }
        }
      }
    });

    if (result.success) {
      this.currentNotebook = notebookId;
      return true;
    }

    return false;
  }

  async getCurrentNotebook(): Promise<string> {
    if (this.currentNotebook) {
      return this.currentNotebook;
    }

    const result = await callPythonSidecar({
      action: 'mcp_call',
      data: {
        tool_name: 'get_default_notebook',
        arguments: {}
      }
    });

    if (result.success && result.result?.text) {
      const data = JSON.parse(result.result.text);
      this.currentNotebook = data.notebook_id;
      return data.notebook_id;
    }

    throw new Error('Unable to get current notebook');
  }

  async setDefaultNotebook(notebookId: string): Promise<void> {
    await callPythonSidecar({
      action: 'mcp_call',
      data: {
        tool_name: 'set_default_notebook',
        arguments: {
          request: { notebook_id: notebookId }
        }
      }
    });

    this.currentNotebook = notebookId;
  }
}

// Usage
const nbManager = new NotebookManager();
await nbManager.switchNotebook('competitor-research-notebook-id');
const insights = await queryMarketIntelligence({ topic: 'pricing' });
```

---

## Real-World Use Cases

### 9. Automated Competitive Intelligence

```typescript
// src/server/jobs/daily-competitor-scan.ts

export async function dailyCompetitorScan(): Promise<void> {
  const competitors = await getActiveCompetitors();
  const report = {
    date: new Date(),
    insights: [] as any[]
  };

  for (const competitor of competitors) {
    const insights = await researchCompetitor(
      competitor.name,
      'pricing, promotions, and new product launches'
    );

    report.insights.push({
      competitor: competitor.name,
      analysis: insights,
      alertLevel: determineAlertLevel(insights)
    });

    // Store in Firestore for Leo's review
    await storeIntelligence({
      type: 'competitor_scan',
      competitor: competitor.name,
      data: insights,
      timestamp: new Date()
    });
  }

  // Notify Leo if critical changes detected
  if (report.insights.some(i => i.alertLevel === 'high')) {
    await notifyExecutive('leo', 'Critical competitor changes detected', report);
  }
}
```

### 10. Customer Query Enhancement

```typescript
// src/server/services/customer-support.ts

export async function enhanceCustomerResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  // First, get base response from your normal chatbot logic
  const baseResponse = await generateChatbotResponse(userMessage);

  // If query requires deep knowledge, augment with NotebookLM
  if (requiresResearch(userMessage)) {
    const researchQuery = `
      Customer asks: "${userMessage}"
      Context: ${context.productCategory || 'general inquiry'}

      Provide accurate, helpful information to supplement this response:
      "${baseResponse}"
    `.trim();

    try {
      const result = await callPythonSidecar({
        action: 'mcp_call',
        data: {
          tool_name: 'chat_with_notebook',
          arguments: {
            request: { message: researchQuery }
          }
        }
      });

      if (result.success) {
        const research = JSON.parse(result.result.text);
        return mergeResponses(baseResponse, research.response);
      }
    } catch (error) {
      console.error('Research augmentation failed:', error);
    }
  }

  return baseResponse;
}
```

### 11. Content Generation for Marketing

```typescript
// src/server/agents/craig/content-generator.ts

export async function generateMarketingContent(
  contentType: 'email' | 'sms' | 'social',
  campaign: CampaignDetails
): Promise<string> {
  const message = `
    Generate ${contentType} marketing content for:
    - Campaign: ${campaign.name}
    - Product: ${campaign.product}
    - Target: ${campaign.audience}
    - Tone: ${campaign.tone}

    Based on successful campaigns in this notebook, create compelling copy
    that drives ${campaign.goal}.
  `.trim();

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message }
      }
    }
  });

  if (result.success) {
    const response = JSON.parse(result.result.text);
    return formatForChannel(response.response, contentType);
  }

  throw new Error('Content generation failed');
}

// Usage in Craig's campaign builder
const emailCopy = await generateMarketingContent('email', {
  name: 'Spring Sale 2026',
  product: 'CBD Wellness Line',
  audience: 'existing customers',
  tone: 'friendly, informative',
  goal: 'conversion'
});
```

### 12. Compliance & Regulatory Research

```typescript
// src/server/agents/deebo/compliance-check.ts

export async function checkComplianceGuidelines(
  action: string,
  state: string
): Promise<{
  compliant: boolean;
  guidelines: string;
  recommendations: string[];
}> {
  const message = `
    Compliance check for: ${action}
    Location: ${state}

    What are the regulatory requirements and compliance guidelines?
    Is this action compliant? What are the key considerations?
  `.trim();

  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message }
      }
    }
  });

  if (result.success) {
    const response = JSON.parse(result.result.text);
    return parseComplianceResponse(response.response);
  }

  // Fail safe - assume non-compliant if can't verify
  return {
    compliant: false,
    guidelines: 'Unable to verify compliance',
    recommendations: ['Manual review required']
  };
}
```

---

## Testing & Debugging

### 13. Health Check Script

```powershell
# test-integration.ps1
# Quick script to verify everything is working

$VM_IP = "34.121.173.152"

Write-Host "Testing NotebookLM Integration..." -ForegroundColor Cyan

# 1. Health
$health = Invoke-RestMethod -Uri "http://${VM_IP}:8080/health"
Write-Host "✓ Health: $($health.status)" -ForegroundColor Green
Write-Host "✓ Session: $($health.notebooklm_mcp.session_id)" -ForegroundColor Green

# 2. Tools
$tools = Invoke-RestMethod -Uri "http://${VM_IP}:8080/mcp/list"
Write-Host "✓ Tools Available: $($tools.Count)" -ForegroundColor Green

# 3. Test Query
$body = @{
    tool_name = "healthcheck"
    arguments = @{}
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://${VM_IP}:8080/mcp/call" `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body

Write-Host "✓ MCP Call: $($result.success)" -ForegroundColor Green

Write-Host "`nIntegration Status: OPERATIONAL" -ForegroundColor Green
```

### 14. Error Handling Pattern

```typescript
// src/server/services/notebooklm-client.ts

export class NotebookLMClient {
  private retryAttempts = 3;
  private retryDelay = 2000;

  async query(message: string): Promise<string> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await callPythonSidecar({
          action: 'mcp_call',
          data: {
            tool_name: 'chat_with_notebook',
            arguments: {
              request: { message }
            }
          }
        });

        if (result.success && result.result?.text) {
          const response = JSON.parse(result.result.text);

          // Check for authentication error
          if (response.error?.includes('Not authenticated')) {
            throw new Error('NotebookLM authentication required');
          }

          return response.response;
        }

        throw new Error(result.error || 'Query failed');
      } catch (error) {
        if (attempt === this.retryAttempts) {
          console.error(`NotebookLM query failed after ${attempt} attempts:`, error);
          throw error;
        }

        console.warn(`Retry ${attempt}/${this.retryAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    throw new Error('Max retry attempts exceeded');
  }
}
```

---

## Performance Best Practices

### Tips for Production Use

1. **Rate Limiting**: Add delays between requests (2-3 seconds)
2. **Caching**: Cache frequently requested insights
3. **Async Processing**: Use background jobs for non-urgent queries
4. **Timeouts**: Set appropriate timeouts (30-60 seconds for chat)
5. **Error Handling**: Always have fallback responses
6. **Monitoring**: Log all requests and track success rates

### Example with Caching

```typescript
// src/server/services/cached-research.ts

import { redisClient } from '@/lib/redis';

const CACHE_TTL = 3600; // 1 hour

export async function getCachedResearch(
  query: string
): Promise<string> {
  const cacheKey = `notebooklm:${query}`;

  // Check cache
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('Cache hit for:', query);
    return cached;
  }

  // Query NotebookLM
  const result = await callPythonSidecar({
    action: 'mcp_call',
    data: {
      tool_name: 'chat_with_notebook',
      arguments: {
        request: { message: query }
      }
    }
  });

  if (result.success) {
    const response = JSON.parse(result.result.text);
    const answer = response.response;

    // Cache the result
    await redisClient.setex(cacheKey, CACHE_TTL, answer);

    return answer;
  }

  throw new Error('Research query failed');
}
```

---

## Next Steps

1. **Complete Authentication** (see INTEGRATION-COMPLETE.md)
2. **Test Examples Above** in your development environment
3. **Integrate with Agents** - Start with Big Worm or Ezal
4. **Monitor Performance** - Track response times and success rates
5. **Expand Use Cases** - Discover new ways to leverage the research

---

## Need Help?

- **Integration Guide**: See INTEGRATION-COMPLETE.md
- **API Reference**: Check tools-schema.json
- **Testing Scripts**: Use test-*.ps1 files in python-sidecar/
- **Diagnostics**: Run diagnose.ps1 for troubleshooting

The NotebookLM integration is ready to power your agentic commerce OS with deep research capabilities! 🚀
