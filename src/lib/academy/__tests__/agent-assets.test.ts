/**
 * Agent Assets Tests
 *
 * Tests for the agent visual asset constants and helpers.
 */

import { AGENT_ASSETS, getAgentAsset, BAKEDBOT_BRAND } from '../agent-assets';
import type { AgentTrack } from '@/types/academy';

describe('AGENT_ASSETS', () => {
  const ALL_TRACKS: AgentTrack[] = [
    'smokey',
    'craig',
    'pops',
    'ezal',
    'money-mike',
    'mrs-parker',
    'deebo',
  ];

  it('should define assets for all 7 agent tracks', () => {
    expect(Object.keys(AGENT_ASSETS)).toHaveLength(7);
    for (const track of ALL_TRACKS) {
      expect(AGENT_ASSETS[track]).toBeDefined();
    }
  });

  it('should have required fields for every agent', () => {
    for (const track of ALL_TRACKS) {
      const asset = AGENT_ASSETS[track];
      expect(asset).toHaveProperty('emoji');
      expect(asset).toHaveProperty('gradient');
      expect(asset).toHaveProperty('bgGradient');
      expect(asset).toHaveProperty('color');
      expect(asset).toHaveProperty('darkColor');
      expect(asset).toHaveProperty('icon');
      expect(typeof asset.hasImage).toBe('boolean');
    }
  });

  it('should have hex colors for all agents', () => {
    for (const track of ALL_TRACKS) {
      const asset = AGENT_ASSETS[track];
      expect(asset.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(asset.darkColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  describe('agents with images', () => {
    const AGENTS_WITH_IMAGES: AgentTrack[] = ['smokey', 'pops', 'ezal'];

    it('should have imagePath set for smokey, pops, and ezal', () => {
      for (const track of AGENTS_WITH_IMAGES) {
        const asset = AGENT_ASSETS[track];
        expect(asset.hasImage).toBe(true);
        expect(asset.imagePath).toBeTruthy();
        expect(asset.imagePath).toContain('/assets/agents/');
        expect(asset.imagePath).toMatch(/\.png$/);
      }
    });
  });

  describe('agents without images', () => {
    const AGENTS_WITHOUT_IMAGES: AgentTrack[] = [
      'craig',
      'money-mike',
      'mrs-parker',
      'deebo',
    ];

    it('should have imagePath null and hasImage false', () => {
      for (const track of AGENTS_WITHOUT_IMAGES) {
        const asset = AGENT_ASSETS[track];
        expect(asset.hasImage).toBe(false);
        expect(asset.imagePath).toBeNull();
      }
    });

    it('should have non-empty emoji as fallback', () => {
      for (const track of AGENTS_WITHOUT_IMAGES) {
        const asset = AGENT_ASSETS[track];
        expect(asset.emoji.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('getAgentAsset', () => {
  it('should return the correct asset for a known track', () => {
    expect(getAgentAsset('smokey')).toBe(AGENT_ASSETS.smokey);
    expect(getAgentAsset('deebo')).toBe(AGENT_ASSETS.deebo);
    expect(getAgentAsset('mrs-parker')).toBe(AGENT_ASSETS['mrs-parker']);
  });

  it('should return smokey as fallback for "general" track', () => {
    const result = getAgentAsset('general');
    expect(result).toBe(AGENT_ASSETS.smokey);
  });

  it('should return smokey as fallback for unknown track', () => {
    const result = getAgentAsset('nonexistent' as AgentTrack);
    expect(result).toBe(AGENT_ASSETS.smokey);
  });
});

describe('BAKEDBOT_BRAND', () => {
  it('should have a logo path', () => {
    expect(BAKEDBOT_BRAND.logoPath).toBeTruthy();
    expect(BAKEDBOT_BRAND.logoPath).toContain('.png');
  });

  it('should have gradient and color defined', () => {
    expect(BAKEDBOT_BRAND.gradient).toBeTruthy();
    expect(BAKEDBOT_BRAND.bgGradient).toBeTruthy();
    expect(BAKEDBOT_BRAND.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
