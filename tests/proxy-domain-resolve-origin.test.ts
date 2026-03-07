/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { getDomainResolveOrigin } from '@/proxy';

function createRequest(host: string, protocol: string = 'https') {
  return new NextRequest(`https://${host}/`, {
    headers: new Headers({
      host,
      'x-forwarded-proto': protocol,
    }),
  });
}

describe('getDomainResolveOrigin', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }

    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('uses NEXT_PUBLIC_APP_URL when configured', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/';

    const origin = getDomainResolveOrigin(
      createRequest('andrewsdevelopments.bakedbot.ai'),
      'andrewsdevelopments.bakedbot.ai'
    );

    expect(origin).toBe('https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app');
  });

  it('uses the local host during localhost development', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    const origin = getDomainResolveOrigin(
      createRequest('foo.localhost:3000', 'http'),
      'foo.localhost:3000'
    );

    expect(origin).toBe('http://foo.localhost:3000');
  });

  it('falls back to bakedbot.ai in production when no app url is configured', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    const origin = getDomainResolveOrigin(
      createRequest('andrewsdevelopments.bakedbot.ai'),
      'andrewsdevelopments.bakedbot.ai'
    );

    expect(origin).toBe('https://bakedbot.ai');
  });
});
