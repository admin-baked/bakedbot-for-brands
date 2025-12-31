import { JuniorWork } from './definition';

const registry = new Map<string, JuniorWork>();

export function registerJuniorWork(work: JuniorWork) {
    if (registry.has(work.id)) {
        console.warn(`JuniorWork with ID ${work.id} is already registered. Overwriting.`);
    }
    registry.set(work.id, work);
}

export function getJuniorWork(id: string): JuniorWork | undefined {
    return registry.get(id);
}

export function listJuniorWorks(): JuniorWork[] {
    return Array.from(registry.values());
}
