import { ezalAgent } from '../../src/server/agents/ezal';

describe('Trigger Ezal for Simply Pure Trenton', () => {
  it('runs Ezal lookout', async () => {
    const mem = await ezalAgent.orient({
        org_id: 'org_simplypuretrenton',
        session_id: Date.now().toString(),
        message_history: [],
        current_request: 'Find local competitors for Simply Pure Trenton (NJ) and analyze their market strategy and pricing.',
        competitor_watchlist: [],
        menu_snapshots: [],
        open_gaps: []
    } as any);

    const out = await ezalAgent.execute(mem, {} as any, {
      tool_calls_attempted: 0,
      tool_calls_successful: 0,
      tool_calls_failed: 0,
      start_time: Date.now()
    } as any);

    console.log("=== EZAL FINAL MESSAGE ===");
    console.log(out.message);
  }, 120000); // 2 min timeout
});
