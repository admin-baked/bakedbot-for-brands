
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runDispensaryPilotAction, runBrandPilotAction } from '@/app/dashboard/ceo/actions';
import { PageGeneratorService } from '@/server/services/page-generator';

const ScanCityInput = z.object({
  city: z.string().describe('The city name (e.g. "Chicago")'),
  state: z.string().length(2).describe('The 2-letter state code (e.g. "IL")'),
  zip_codes: z.array(z.string()).optional().describe('Specific ZIP codes to scan. If omitted, may scan entire city (slower).'),
});

export const scanCity = ai.defineTool({
  name: 'sales_scanCity',
  description: 'Scans a city/ZIPs to discover dispensaries and brands, and generates SEO pages for them.',
  inputSchema: ScanCityInput,
  outputSchema: z.object({
    message: z.string(),
    stats: z.object({
      dispensariesFound: z.number().optional(),
      pagesCreated: z.number().optional()
    }).optional()
  })
}, async (input) => {
  // We use the existing server actions which wrap the PageGenerator jobs/logic
  // For finer control, we might instantiate PageGeneratorService directly, 
  // but the actions handle async job dispatching well.
  
  // 1. Run Dispensary Discovery (which creates ZIP pages)
  const dispResult = await runDispensaryPilotAction(input.city, input.state, input.zip_codes);
  
  // 2. Run Brand Discovery
  const brandResult = await runBrandPilotAction(input.city, input.state);

  // 3. For immediate feedback, we also run a synchronous quick-scan for ZIP pages if specific ZIPs provided
  let quickStats = {};
  if (input.zip_codes && input.zip_codes.length > 0) {
      try {
        const gen = new PageGeneratorService();
        const res = await gen.scanAndGenerateDispensaries({
            city: input.city,
            state: input.state,
            locations: input.zip_codes,
            limit: 20 // Cap for interactive tool usage
        });
        quickStats = {
            dispensariesFound: res.itemsFound,
            pagesCreated: res.pagesCreated
        };
      } catch (e) {
          console.error("Quick scan failed:", e);
      }
  }

  return {
    message: `Started scanning ${input.city}, ${input.state}. ${dispResult.message}. ${brandResult.message}.`,
    stats: quickStats
  };
});

export const tools = [scanCity];
