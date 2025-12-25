
import { jest } from '@jest/globals';

export const ai = {
  generate: jest.fn().mockResolvedValue({ text: 'Mock AI Response' }),
};

export const defineTool = jest.fn();
export const secureDefineTool = jest.fn();
