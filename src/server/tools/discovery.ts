import { discovery } from '@/server/services/firecrawl';

export const DiscoveryTools = {
    search: async (query: string) => {
        return await discovery.search(query);
    },
    discoverUrl: async (url: string) => {
        return await discovery.discoverUrl(url);
    },
    mapSite: async (url: string) => {
        return await discovery.mapSite(url);
    }
};
