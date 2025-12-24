/**
 * @jest-environment node
 */

import { getWelcomeEmailTemplate, SignupRole } from '@/lib/email/autoresponder-templates';

describe('Autoresponder Templates', () => {
    describe('getWelcomeEmailTemplate', () => {
        it('should generate brand welcome template', () => {
            const template = getWelcomeEmailTemplate({
                recipientEmail: 'brand@example.com',
                recipientName: 'John',
                role: 'brand',
                brandName: 'MFNY'
            });

            expect(template.subject).toContain('Welcome to BakedBot');
            expect(template.subject).toContain('AI Commerce Team');
            expect(template.htmlContent).toContain('John');
            expect(template.htmlContent).toContain('MFNY');
            expect(template.htmlContent).toContain('Smokey');
            expect(template.htmlContent).toContain('Craig');
        });

        it('should generate dispensary welcome template', () => {
            const template = getWelcomeEmailTemplate({
                recipientEmail: 'dispensary@example.com',
                recipientName: 'Jane',
                role: 'dispensary',
                dispensaryName: 'Green Leaf'
            });

            expect(template.subject).toContain('Power Your Menu');
            expect(template.htmlContent).toContain('Jane');
            expect(template.htmlContent).toContain('Green Leaf');
            expect(template.htmlContent).toContain('AI-Powered Menu');
        });

        it('should generate customer welcome template', () => {
            const template = getWelcomeEmailTemplate({
                recipientEmail: 'customer@example.com',
                recipientName: 'Alex',
                role: 'customer'
            });

            expect(template.subject).toContain('Cannabis Journey');
            expect(template.htmlContent).toContain('Alex');
            expect(template.htmlContent).toContain('Personalized Recommendations');
            expect(template.htmlContent).toContain('Smokey');
        });

        it('should use email prefix for name if not provided', () => {
            const template = getWelcomeEmailTemplate({
                recipientEmail: 'newuser@example.com',
                recipientName: '',
                role: 'customer'
            });

            // Should fall back to 'there' when name is empty
            expect(template.htmlContent).toContain('Hey there');
        });

        it('should have valid HTML structure', () => {
            const roles: SignupRole[] = ['brand', 'dispensary', 'customer'];

            roles.forEach(role => {
                const template = getWelcomeEmailTemplate({
                    recipientEmail: 'test@example.com',
                    recipientName: 'Test',
                    role
                });

                expect(template.htmlContent).toContain('<!DOCTYPE html>');
                expect(template.htmlContent).toContain('<html>');
                expect(template.htmlContent).toContain('</html>');
                expect(template.htmlContent).toContain('bakedbot.ai');
            });
        });

        it('should include dashboard link for brand and dispensary', () => {
            ['brand', 'dispensary'].forEach(role => {
                const template = getWelcomeEmailTemplate({
                    recipientEmail: 'test@example.com',
                    recipientName: 'Test',
                    role: role as SignupRole
                });

                expect(template.htmlContent).toContain('https://bakedbot.ai/dashboard');
            });
        });

        it('should have different color themes per role', () => {
            const brandTemplate = getWelcomeEmailTemplate({
                recipientEmail: 'test@example.com',
                recipientName: 'Test',
                role: 'brand'
            });

            const dispensaryTemplate = getWelcomeEmailTemplate({
                recipientEmail: 'test@example.com',
                recipientName: 'Test',
                role: 'dispensary'
            });

            const customerTemplate = getWelcomeEmailTemplate({
                recipientEmail: 'test@example.com',
                recipientName: 'Test',
                role: 'customer'
            });

            // Brand = green (#10b981)
            expect(brandTemplate.htmlContent).toContain('#10b981');

            // Dispensary = purple (#8b5cf6)
            expect(dispensaryTemplate.htmlContent).toContain('#8b5cf6');

            // Customer = orange (#f59e0b)
            expect(customerTemplate.htmlContent).toContain('#f59e0b');
        });
    });
});
