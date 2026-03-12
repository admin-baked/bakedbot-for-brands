'use client';

import type { AttachmentItem } from '@/components/ui/attachment-preview';
import type { ChatMessageAttachment } from '@/lib/store/agent-chat-store';

export interface AgentAttachmentPayload {
    name: string;
    type: string;
    base64: string;
}

interface AttachmentValidationError {
    title: string;
    description: string;
}

const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    js: 'application/javascript',
    jsx: 'application/javascript',
    ts: 'text/plain',
    tsx: 'text/plain',
    py: 'text/x-python',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
};

const ALLOWED_FILE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'application/javascript',
    'text/javascript',
    'text/x-python',
    'text/x-shellscript',
    'application/x-yaml',
    'text/yaml',
]);

const ALLOWED_FILE_EXTENSIONS = new Set(Object.keys(MIME_TYPES_BY_EXTENSION));

function createAttachmentId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `att-${crypto.randomUUID()}`;
    }

    return `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFileExtension(name?: string): string {
    return name?.split('.').pop()?.toLowerCase() || '';
}

function inferMimeTypeFromName(name?: string): string | null {
    const extension = getFileExtension(name);
    return MIME_TYPES_BY_EXTENSION[extension] || null;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                reject(new Error('Attachment reader returned an invalid result'));
                return;
            }

            resolve(result);
        };

        reader.onerror = () => {
            reject(new Error('Failed to read attachment'));
        };

        reader.readAsDataURL(blob);
    });
}

function normalizeBlobType(blob: Blob, type: string): Blob {
    if (blob.type === type) {
        return blob;
    }

    return new Blob([blob], { type });
}

export function validateComposerAttachmentFile(file: File): AttachmentValidationError | null {
    if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
        return {
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
        };
    }

    const extension = getFileExtension(file.name);
    const isAllowedType = file.type ? ALLOWED_FILE_TYPES.has(file.type) : false;
    const isAllowedExtension = ALLOWED_FILE_EXTENSIONS.has(extension);

    if (!isAllowedType && !isAllowedExtension) {
        return {
            title: 'Unsupported file type',
            description: `${file.name} is not supported. Use images, PDFs, text, CSV, JSON, Markdown, or code files.`,
        };
    }

    return null;
}

export function getAttachmentMimeType(attachment: AttachmentItem): string {
    if (attachment.file?.type) {
        return attachment.file.type;
    }

    const inferredType = inferMimeTypeFromName(attachment.file?.name || attachment.name);
    if (inferredType) {
        return inferredType;
    }

    if (attachment.type === 'image') {
        return 'image/jpeg';
    }

    if (attachment.type === 'pasted') {
        return 'text/plain';
    }

    return 'application/octet-stream';
}

export async function createAttachmentItemFromFile(file: File): Promise<AttachmentItem> {
    const mimeType = getAttachmentMimeType({
        id: 'attachment-type-detect',
        file,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
    });
    const dataUrl = await readBlobAsDataUrl(normalizeBlobType(file, mimeType));
    const isImage = mimeType.startsWith('image/');

    return {
        id: createAttachmentId(),
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? dataUrl : undefined,
        content: isImage ? undefined : dataUrl,
        name: file.name,
    };
}

export function shouldConvertPastedTextToAttachment(text: string): boolean {
    return text.trim().length > 200;
}

export function detectPastedContentName(text: string): string {
    const trimmed = text.trim();

    if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
        const lines = trimmed.split('\n');
        const avgCommas = lines.slice(0, 5).map((line) => (line.match(/,/g) || []).length);
        if (avgCommas.length > 0 && avgCommas.every((count) => count > 0 && count === avgCommas[0])) {
            return 'Pasted CSV Data';
        }
    }

    if (
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
        || (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
        try {
            JSON.parse(trimmed);
            return 'Pasted JSON Data';
        } catch {
            // Fall through to the content heuristics below.
        }
    }

    if (
        trimmed.includes('function ')
        || trimmed.includes('const ')
        || trimmed.includes('import ')
        || trimmed.includes('class ')
    ) {
        return 'Pasted Code';
    }

    if (trimmed.includes('# ') || trimmed.includes('## ') || trimmed.includes('```')) {
        return 'Pasted Markdown';
    }

    return 'Pasted Content';
}

export function createPastedTextAttachment(text: string): AttachmentItem {
    return {
        id: createAttachmentId(),
        type: 'pasted',
        content: text,
        name: detectPastedContentName(text),
    };
}

export function toChatMessageAttachment(attachment: AttachmentItem): ChatMessageAttachment {
    return {
        id: attachment.id,
        name: attachment.file?.name || attachment.name || 'file',
        type: getAttachmentMimeType(attachment),
        url: attachment.preview || attachment.content || '',
        preview: attachment.preview,
    };
}

export async function toAgentAttachmentPayload(attachment: AttachmentItem): Promise<AgentAttachmentPayload> {
    const name = attachment.file?.name || attachment.name || 'file';
    const type = getAttachmentMimeType(attachment);

    if (attachment.file) {
        const existingDataUrl = attachment.preview || attachment.content;
        if (existingDataUrl?.startsWith('data:')) {
            return {
                name,
                type,
                base64: existingDataUrl,
            };
        }

        return {
            name,
            type,
            base64: await readBlobAsDataUrl(normalizeBlobType(attachment.file, type)),
        };
    }

    if (attachment.content) {
        if (attachment.content.startsWith('data:')) {
            return {
                name,
                type,
                base64: attachment.content,
            };
        }

        return {
            name,
            type,
            base64: await readBlobAsDataUrl(new Blob([attachment.content], { type })),
        };
    }

    throw new Error(`Attachment ${name} is missing readable content`);
}

export async function toAgentAttachmentPayloads(attachments: AttachmentItem[]): Promise<AgentAttachmentPayload[]> {
    return Promise.all(attachments.map((attachment) => toAgentAttachmentPayload(attachment)));
}
