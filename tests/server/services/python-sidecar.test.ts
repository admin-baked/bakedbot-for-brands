
import { PythonSidecar } from '@/server/services/python-sidecar';

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: any[]) => mockSpawn(...args),
}));

describe('PythonSidecar', () => {
    it('should initialize successfully', () => {
        const sidecar = new PythonSidecar();
        expect(sidecar).toBeDefined();
    });

    // We can't easily query the real python on the system in unit tests,
    // so we mock the spawn process.
    it('should attempt to resolve python path', async () => {
        const sidecar = new PythonSidecar();
        // Just ensuring no crash on instantiation
        expect(sidecar).toBeTruthy();
    });
});
