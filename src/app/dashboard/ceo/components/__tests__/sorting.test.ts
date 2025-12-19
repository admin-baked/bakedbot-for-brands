
describe('Foot Traffic Sorting Logic', () => {
    const data = [
        { zipCode: '60601', city: 'Chicago', published: true },
        { zipCode: '60605', city: 'Chicago', published: false },
        { zipCode: '48201', city: 'Detroit', published: true },
    ];

    it('should sort by zipCode ascending', () => {
        const sorted = [...data].sort((a, b) => a.zipCode.localeCompare(b.zipCode));
        expect(sorted[0].zipCode).toBe('48201');
        expect(sorted[2].zipCode).toBe('60605');
    });

    it('should sort by city descending', () => {
        const sorted = [...data].sort((a, b) => b.city.localeCompare(a.city));
        expect(sorted[0].city).toBe('Detroit');
        expect(sorted[2].city).toBe('Chicago');
    });

    it('should sort by published status', () => {
        const sorted = [...data].sort((a, b) => Number(a.published) - Number(b.published));
        expect(sorted[0].published).toBe(false);
        expect(sorted[2].published).toBe(true);
    });
});
