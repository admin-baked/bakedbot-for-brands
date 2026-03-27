import { parseDeckScriptResponse } from '@/ai/generators/powerpoint';

describe('parseDeckScriptResponse', () => {
    it('parses fenced json output from GLM', () => {
        const parsed = parseDeckScriptResponse(`
\`\`\`json
{
  "deckTitle": "Weekend Spotlight",
  "slides": [
    {
      "title": "Slide 1",
      "bullets": ["Point A", "Point B"]
    }
  ]
}
\`\`\`
        `);

        expect(parsed.deckTitle).toBe('Weekend Spotlight');
        expect(parsed.slides).toHaveLength(1);
    });

    it('parses json wrapped in extra prose', () => {
        const parsed = parseDeckScriptResponse(`
Here is your presentation script:
{
  "deckTitle": "Store Training",
  "subtitle": "Spring refresh",
  "slides": [
    {
      "title": "Welcome",
      "bullets": ["Greeting standards", "Daily priorities"]
    }
  ]
}
Let me know if you want another version.
        `);

        expect(parsed.subtitle).toBe('Spring refresh');
        expect(parsed.slides[0]?.title).toBe('Welcome');
    });

    it('rejects payloads that are not valid deck scripts', () => {
        expect(() => parseDeckScriptResponse('{"slides":[]}')).toThrow(
            'Deck script is missing required fields'
        );
    });
});
