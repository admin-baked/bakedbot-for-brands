/**
 * Invite User Tool
 *
 * Allows agents to create user accounts and send invitation emails via Mailjet.
 * Wraps the inviteUser server action to enable direct email sending without copy/paste.
 */

import { BaseTool } from './base-tool';
import type { ToolContext, ToolResult, ToolAuthType } from '@/types/tool';
import type { UserRole } from '@/types/roles';
import { ROLES } from '@/types/roles';
import { inviteUser } from '@/app/actions/admin/users';
import { logger } from '@/lib/logger';

// --- Types ---

export interface InviteUserInput {
    email: string;
    role: UserRole;
    businessName?: string;
    firstName?: string;
    lastName?: string;
    sendEmail?: boolean; // Default: true
}

export interface InviteUserOutput {
    success: boolean;
    inviteLink: string;
    emailSent: boolean;
    userId?: string;
    message: string;
}

// --- Invite User Tool Implementation ---

export class InviteUserTool extends BaseTool<InviteUserInput, InviteUserOutput> {
    readonly id = 'user.invite';
    readonly name = 'Invite User';
    readonly description = 'Create a user account and send an invitation email via Mailjet. Supports all roles including brand admins, dispensary staff, and customers.';
    readonly category = 'communication' as const;
    readonly version = '1.0.0';

    readonly authType: ToolAuthType = 'none';
    readonly requiresAuth = false; // Uses server-side Firebase admin auth
    isDefault = true;

    readonly capabilities = [
        {
            name: 'Create User Accounts',
            description: 'Create new user accounts with specific roles and permissions',
            examples: [
                'Invite a brand admin for Acme Cannabis Co.',
                'Create a dispensary staff account for Green Leaf Dispensary',
                'Invite a team member to join the platform'
            ]
        },
        {
            name: 'Send Email Invitations',
            description: 'Send branded invitation emails via Mailjet with onboarding links',
            examples: [
                'Email invitation to new brand owner',
                'Send welcome email with setup instructions',
                'Invite multiple team members via email'
            ]
        },
        {
            name: 'Role-Based Setup',
            description: 'Automatically configure user profiles based on role (brand, dispensary, customer)',
            examples: [
                'Set up brand admin with organization access',
                'Create dispensary staff with location permissions',
                'Configure customer account for loyalty tracking'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object' as const,
        properties: {
            email: {
                type: 'string',
                description: 'Email address of the user to invite',
                format: 'email'
            },
            role: {
                type: 'string',
                description: 'User role (brand_admin, brand_member, dispensary_admin, dispensary_staff, budtender, customer, super_user)',
                enum: [...ROLES] as string[]
            },
            businessName: {
                type: 'string',
                description: 'Name of the brand or dispensary (required for business roles)'
            },
            firstName: {
                type: 'string',
                description: 'User\'s first name (optional but recommended)'
            },
            lastName: {
                type: 'string',
                description: 'User\'s last name (optional but recommended)'
            },
            sendEmail: {
                type: 'boolean',
                description: 'Whether to send the invitation email via Mailjet (default: true)',
                default: true
            }
        },
        required: ['email', 'role']
    };

    readonly outputSchema = {
        type: 'object' as const,
        properties: {
            success: {
                type: 'boolean',
                description: 'Whether the invitation was created successfully'
            },
            inviteLink: {
                type: 'string',
                description: 'The invitation/onboarding link (password reset link)'
            },
            emailSent: {
                type: 'boolean',
                description: 'Whether the email was sent via Mailjet'
            },
            userId: {
                type: 'string',
                description: 'The created user\'s Firebase UID'
            },
            message: {
                type: 'string',
                description: 'Success or error message'
            }
        }
    };

    estimatedDuration = 5000; // 5 seconds
    icon = 'user-plus';
    color = '#16a34a';

    async execute(input: InviteUserInput, context: ToolContext): Promise<ToolResult<InviteUserOutput>> {
        const startTime = Date.now();

        try {
            // Validate input
            if (!input.email || !input.role) {
                throw this.createError(
                    'INVALID_INPUT',
                    'Email and role are required fields',
                    false
                );
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.email)) {
                throw this.createError(
                    'INVALID_EMAIL',
                    'Please provide a valid email address',
                    false
                );
            }

            // Validate role
            if (!ROLES.includes(input.role as any)) {
                throw this.createError(
                    'INVALID_ROLE',
                    `Invalid role: ${input.role}. Must be one of: ${ROLES.join(', ')}`,
                    false
                );
            }

            // Check if business name is required for this role
            const businessRoles = ['brand_admin', 'brand_member', 'brand', 'dispensary_admin', 'dispensary_staff', 'dispensary', 'budtender'];
            if (businessRoles.includes(input.role) && !input.businessName) {
                throw this.createError(
                    'BUSINESS_NAME_REQUIRED',
                    `Business name is required for role: ${input.role}`,
                    false
                );
            }

            logger.info('[InviteUserTool] Creating invitation', {
                email: input.email,
                role: input.role,
                businessName: input.businessName,
                sendEmail: input.sendEmail ?? true
            });

            // Call the inviteUser server action
            const result = await inviteUser({
                email: input.email,
                role: input.role,
                businessName: input.businessName,
                firstName: input.firstName,
                lastName: input.lastName,
                sendEmail: input.sendEmail ?? true
            });

            if (!result.success) {
                logger.error('[InviteUserTool] Invitation failed', {
                    error: result.error,
                    email: input.email
                });

                throw this.createError(
                    'INVITE_FAILED',
                    result.error || 'Failed to create invitation',
                    true
                );
            }

            logger.info('[InviteUserTool] Invitation created successfully', {
                email: input.email,
                link: result.link
            });

            const output: InviteUserOutput = {
                success: true,
                inviteLink: result.link || '',
                emailSent: input.sendEmail ?? true,
                message: input.sendEmail
                    ? `✅ Invitation sent to ${input.email} via Mailjet! User can complete setup at the link provided.`
                    : `✅ User account created for ${input.email}. Share the invite link to complete setup.`
            };

            return this.createResult(
                output,
                {
                    executionTime: Date.now() - startTime,
                    apiCalls: 1
                },
                {
                    type: 'email',
                    title: `User Invited: ${input.email}`,
                    content: {
                        email: input.email,
                        role: input.role,
                        businessName: input.businessName || 'N/A',
                        emailSent: input.sendEmail ?? true,
                        inviteLink: result.link
                    },
                    preview: input.sendEmail
                        ? `✉️ Email sent to ${input.email}`
                        : `🔗 Invite link generated for ${input.email}`,
                    icon: 'user-plus'
                },
                1.0 // High confidence for successful invite
            );

        } catch (error: any) {
            logger.error('[InviteUserTool] Error:', error);

            if (error.code) {
                return this.createFailedResult(error);
            }

            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error.message || 'Failed to send invitation',
                    true
                )
            );
        }
    }
}

// --- Singleton Export ---

let inviteUserTool: InviteUserTool | null = null;

export function getInviteUserTool(): InviteUserTool {
    if (!inviteUserTool) {
        inviteUserTool = new InviteUserTool();
    }
    return inviteUserTool;
}
