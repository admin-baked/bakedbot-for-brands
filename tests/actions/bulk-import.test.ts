/**
 * Unit tests for CSV parsing and validation functions
 * Tests the bulk import functionality for brand and dispensary pages
 * 
 * These tests duplicate the parsing logic to test it in isolation
 * without needing to mock complex server dependencies.
 */

describe('CSV Parsing Functions', () => {
    // Duplicate of parseCSVLine from actions.ts for isolated testing
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    };

    describe('parseCSVLine', () => {
        it('should parse simple CSV line', () => {
            const line = 'Jeeter,CA,Los Angeles,90001';
            const result = parseCSVLine(line);
            expect(result).toEqual(['Jeeter', 'CA', 'Los Angeles', '90001']);
        });

        it('should handle quoted values with commas', () => {
            const line = 'Jeeter,CA,Los Angeles,"90001,90002,90003"';
            const result = parseCSVLine(line);
            expect(result).toEqual(['Jeeter', 'CA', 'Los Angeles', '90001,90002,90003']);
        });

        it('should handle empty values', () => {
            const line = 'Jeeter,,Los Angeles,90001';
            const result = parseCSVLine(line);
            expect(result).toEqual(['Jeeter', '', 'Los Angeles', '90001']);
        });

        it('should trim whitespace', () => {
            const line = '  Jeeter  ,  CA  ,  Los Angeles  ,  90001  ';
            const result = parseCSVLine(line);
            expect(result).toEqual(['Jeeter', 'CA', 'Los Angeles', '90001']);
        });

        it('should handle quoted values with spaces', () => {
            const line = '"Company Name",CA,"Los Angeles Area",90001';
            const result = parseCSVLine(line);
            expect(result).toEqual(['Company Name', 'CA', 'Los Angeles Area', '90001']);
        });
    });

    describe('parseZipCodesFromString', () => {
        // Duplicate of parseZipCodesFromString from actions.ts
        const parseZipCodesFromString = (input: string): string[] => {
            const result: string[] = [];
            const parts = input.split(',').map(s => s.trim()).filter(Boolean);

            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(s => parseInt(s.trim()));
                    if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 100) {
                        for (let i = start; i <= end; i++) {
                            result.push(String(i).padStart(5, '0'));
                        }
                    }
                } else if (/^\d{5}$/.test(part)) {
                    result.push(part);
                }
            }

            return Array.from(new Set(result));
        };

        it('should parse single ZIP code', () => {
            const result = parseZipCodesFromString('90001');
            expect(result).toEqual(['90001']);
        });

        it('should parse comma-separated ZIP codes', () => {
            const result = parseZipCodesFromString('90001,90002,90003');
            expect(result).toEqual(['90001', '90002', '90003']);
        });

        it('should parse ZIP code range', () => {
            const result = parseZipCodesFromString('90001-90005');
            expect(result).toEqual(['90001', '90002', '90003', '90004', '90005']);
        });

        it('should handle mixed format', () => {
            const result = parseZipCodesFromString('90001,90010-90012,90020');
            expect(result).toEqual(['90001', '90010', '90011', '90012', '90020']);
        });

        it('should remove duplicates', () => {
            const result = parseZipCodesFromString('90001,90001,90002');
            expect(result).toEqual(['90001', '90002']);
        });

        it('should reject invalid ZIP codes (too short)', () => {
            const result = parseZipCodesFromString('123,90001');
            expect(result).toEqual(['90001']);
        });

        it('should reject non-numeric ZIP codes', () => {
            const result = parseZipCodesFromString('abcde,90001');
            expect(result).toEqual(['90001']);
        });

        it('should reject ranges over 100', () => {
            const result = parseZipCodesFromString('90001-90200');
            expect(result).toEqual([]);
        });

        it('should handle ranges with leading zeros', () => {
            const result = parseZipCodesFromString('00001-00003');
            expect(result).toEqual(['00001', '00002', '00003']);
        });
    });

    describe('parseCSV', () => {
        // Duplicate of parseCSV from actions.ts
        const parseCSV = (csvText: string): { headers: string[]; rows: Record<string, string>[] } => {
            const parseCSVLine = (line: string): string[] => {
                const result: string[] = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            const lines = csvText.trim().split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length < 2) {
                return { headers: [], rows: [] };
            }

            const headers = parseCSVLine(lines[0]);
            const rows: Record<string, string>[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                const row: Record<string, string> = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx] || '';
                });
                rows.push(row);
            }

            return { headers, rows };
        };

        it('should parse CSV with headers and rows', () => {
            const csv = `brand_name,state,city
Jeeter,CA,Los Angeles
Stiiizy,CA,San Francisco`;

            const result = parseCSV(csv);
            expect(result.headers).toEqual(['brand_name', 'state', 'city']);
            expect(result.rows).toHaveLength(2);
            expect(result.rows[0]).toEqual({ brand_name: 'Jeeter', state: 'CA', city: 'Los Angeles' });
            expect(result.rows[1]).toEqual({ brand_name: 'Stiiizy', state: 'CA', city: 'San Francisco' });
        });

        it('should handle empty CSV', () => {
            const result = parseCSV('');
            expect(result.headers).toEqual([]);
            expect(result.rows).toEqual([]);
        });

        it('should handle CSV with only headers', () => {
            const result = parseCSV('brand_name,state,city');
            expect(result.headers).toEqual([]);
            expect(result.rows).toEqual([]);
        });

        it('should handle quoted values', () => {
            const csv = `brand_name,zip_codes,city
Jeeter,"90001,90002",Los Angeles`;

            const result = parseCSV(csv);
            expect(result.rows[0].zip_codes).toBe('90001,90002');
        });

        it('should handle missing values', () => {
            const csv = `brand_name,zone_name,state
Jeeter,,CA`;

            const result = parseCSV(csv);
            expect(result.rows[0].zone_name).toBe('');
        });
    });
});

describe('Brand Page CSV Validation', () => {
    const VALID_STATES = ['CA', 'CO', 'IL', 'MI', 'NY', 'OH', 'NV', 'OR', 'WA'];
    const VALID_CTA_TYPES = ['Order Online', 'View Products', 'Pickup In-Store', 'Learn More'];

    interface CSVRowError {
        row: number;
        field: string;
        message: string;
    }

    // Duplicate of brand row validation logic
    const validateBrandRow = (row: Record<string, string>, index: number): CSVRowError[] => {
        const errors: CSVRowError[] = [];

        if (!row.brand_name?.trim()) {
            errors.push({ row: index, field: 'brand_name', message: 'Brand name is required' });
        }

        if (!row.state?.trim()) {
            errors.push({ row: index, field: 'state', message: 'State is required' });
        } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
            errors.push({ row: index, field: 'state', message: 'Invalid state' });
        }

        if (!row.city?.trim()) {
            errors.push({ row: index, field: 'city', message: 'City is required' });
        }

        if (!row.cta_type?.trim()) {
            errors.push({ row: index, field: 'cta_type', message: 'CTA type is required' });
        } else if (!VALID_CTA_TYPES.map(t => t.toLowerCase()).includes(row.cta_type.toLowerCase().trim())) {
            errors.push({ row: index, field: 'cta_type', message: 'Invalid CTA type' });
        }

        if (!row.cta_url?.trim()) {
            errors.push({ row: index, field: 'cta_url', message: 'CTA URL is required' });
        } else {
            try {
                new URL(row.cta_url);
            } catch {
                errors.push({ row: index, field: 'cta_url', message: 'Invalid URL format' });
            }
        }

        if (!row.status?.trim()) {
            errors.push({ row: index, field: 'status', message: 'Status is required' });
        } else if (!['draft', 'published'].includes(row.status.toLowerCase().trim())) {
            errors.push({ row: index, field: 'status', message: 'Invalid status' });
        }

        return errors;
    };

    it('should validate a correct brand row', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'https://jeeter.com',
            status: 'published'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors).toHaveLength(0);
    });

    it('should reject missing brand name', () => {
        const row = {
            brand_name: '',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'https://jeeter.com',
            status: 'published'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors.some(e => e.field === 'brand_name')).toBe(true);
    });

    it('should reject invalid state', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'XX',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'https://jeeter.com',
            status: 'published'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors.some(e => e.field === 'state')).toBe(true);
    });

    it('should reject invalid CTA type', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Invalid CTA',
            cta_url: 'https://jeeter.com',
            status: 'published'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors.some(e => e.field === 'cta_type')).toBe(true);
    });

    it('should reject invalid URL', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'not-a-url',
            status: 'published'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors.some(e => e.field === 'cta_url')).toBe(true);
    });

    it('should reject invalid status', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'https://jeeter.com',
            status: 'pending'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should accept all valid CTA types', () => {
        VALID_CTA_TYPES.forEach(ctaType => {
            const row = {
                brand_name: 'Jeeter',
                state: 'CA',
                city: 'Los Angeles',
                zip_codes: '90001',
                cta_type: ctaType,
                cta_url: 'https://jeeter.com',
                status: 'published'
            };

            const errors = validateBrandRow(row, 0);
            expect(errors.filter(e => e.field === 'cta_type')).toHaveLength(0);
        });
    });

    it('should accept draft status', () => {
        const row = {
            brand_name: 'Jeeter',
            state: 'CA',
            city: 'Los Angeles',
            zip_codes: '90001',
            cta_type: 'Order Online',
            cta_url: 'https://jeeter.com',
            status: 'draft'
        };

        const errors = validateBrandRow(row, 0);
        expect(errors).toHaveLength(0);
    });
});

describe('Dispensary Page CSV Validation', () => {
    const VALID_STATES = ['CA', 'CO', 'IL', 'MI', 'NY', 'OH', 'NV', 'OR', 'WA'];

    interface CSVRowError {
        row: number;
        field: string;
        message: string;
    }

    // Duplicate of dispensary row validation logic
    const validateDispensaryRow = (row: Record<string, string>, index: number): CSVRowError[] => {
        const errors: CSVRowError[] = [];

        if (!row.dispensary_name?.trim()) {
            errors.push({ row: index, field: 'dispensary_name', message: 'Dispensary name is required' });
        }

        if (!row.state?.trim()) {
            errors.push({ row: index, field: 'state', message: 'State is required' });
        } else if (!VALID_STATES.includes(row.state.toUpperCase())) {
            errors.push({ row: index, field: 'state', message: 'Invalid state' });
        }

        if (!row.city?.trim()) {
            errors.push({ row: index, field: 'city', message: 'City is required' });
        }

        if (!row.zip_code?.trim()) {
            errors.push({ row: index, field: 'zip_code', message: 'ZIP code is required' });
        } else if (!/^\d{5}$/.test(row.zip_code.trim())) {
            errors.push({ row: index, field: 'zip_code', message: 'ZIP code must be 5 digits' });
        }

        if (!row.status?.trim()) {
            errors.push({ row: index, field: 'status', message: 'Status is required' });
        } else if (!['draft', 'published'].includes(row.status.toLowerCase().trim())) {
            errors.push({ row: index, field: 'status', message: 'Invalid status' });
        }

        return errors;
    };

    it('should validate a correct dispensary row', () => {
        const row = {
            dispensary_name: 'Haven Cannabis',
            state: 'CA',
            city: 'Los Angeles',
            zip_code: '90001',
            featured: 'TRUE',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors).toHaveLength(0);
    });

    it('should reject missing dispensary name', () => {
        const row = {
            dispensary_name: '',
            state: 'CA',
            city: 'Los Angeles',
            zip_code: '90001',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors.some(e => e.field === 'dispensary_name')).toBe(true);
    });

    it('should reject invalid ZIP code format (too short)', () => {
        const row = {
            dispensary_name: 'Haven Cannabis',
            state: 'CA',
            city: 'Los Angeles',
            zip_code: '123',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors.some(e => e.field === 'zip_code')).toBe(true);
    });

    it('should reject non-numeric ZIP code', () => {
        const row = {
            dispensary_name: 'Haven Cannabis',
            state: 'CA',
            city: 'Los Angeles',
            zip_code: 'ABCDE',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors.some(e => e.field === 'zip_code')).toBe(true);
    });

    it('should accept all valid states', () => {
        VALID_STATES.forEach(state => {
            const row = {
                dispensary_name: 'Test Dispensary',
                state,
                city: 'Test City',
                zip_code: '90001',
                status: 'draft'
            };

            const errors = validateDispensaryRow(row, 0);
            expect(errors.filter(e => e.field === 'state')).toHaveLength(0);
        });
    });

    it('should accept state codes in lowercase', () => {
        const row = {
            dispensary_name: 'Haven Cannabis',
            state: 'ca',
            city: 'Los Angeles',
            zip_code: '90001',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors.filter(e => e.field === 'state')).toHaveLength(0);
    });

    it('should reject ZIP codes with 6 digits', () => {
        const row = {
            dispensary_name: 'Haven Cannabis',
            state: 'CA',
            city: 'Los Angeles',
            zip_code: '900011',
            status: 'published'
        };

        const errors = validateDispensaryRow(row, 0);
        expect(errors.some(e => e.field === 'zip_code')).toBe(true);
    });
});
