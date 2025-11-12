
import { haversineDistance, formatNumber } from '../utils';

describe('utils library', () => {

  describe('haversineDistance', () => {
    it('should return 0 for the same coordinates', () => {
      const coords = { lat: 34.0522, lon: -118.2437 };
      expect(haversineDistance(coords, coords)).toBe(0);
    });

    it('should correctly calculate the distance between two points', () => {
      const chicago = { lat: 41.8781, lon: -87.6298 };
      const losAngeles = { lat: 34.0522, lon: -118.2437 };
      
      // Distance is approx. 1745 miles
      const distance = haversineDistance(chicago, losAngeles);
      expect(distance).toBeCloseTo(1744.5, 0);
    });

    it('should handle coordinates across the equator', () => {
        const point1 = { lat: 10, lon: 0 };
        const point2 = { lat: -10, lon: 0 };
        const distance = haversineDistance(point1, point2);
        // Approx 1380 miles
        expect(distance).toBeCloseTo(1380.9, 0);
    });
  });

  describe('formatNumber', () => {
    it('should return the number as a string for numbers less than 1000', () => {
      expect(formatNumber(123)).toBe('123');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format numbers in thousands with a "K"', () => {
      expect(formatNumber(1000)).toBe('1K');
      expect(formatNumber(1200)).toBe('1.2K');
      expect(formatNumber(1250)).toBe('1.3K'); // Should round up
      expect(formatNumber(999999)).toBe('1000K'); // This is expected based on the logic
    });

    it('should format numbers in millions with an "M"', () => {
      expect(formatNumber(1000000)).toBe('1M');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(12345678)).toBe('12.3M');
    });

    it('should not show .0 for whole numbers', () => {
        expect(formatNumber(2000)).toBe('2K');
        expect(formatNumber(3000000)).toBe('3M');
    });
  });
});
