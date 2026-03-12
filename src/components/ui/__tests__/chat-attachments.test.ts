import {
    createPastedTextAttachment,
    getAttachmentMimeType,
    toAgentAttachmentPayload,
    toChatMessageAttachment,
    validateComposerAttachmentFile,
} from '@/components/ui/chat-attachments';

function decodeDataUrl(dataUrl: string): string {
    const [, encoded = ''] = dataUrl.split(',', 2);
    return Buffer.from(encoded, 'base64').toString('utf8');
}

describe('chat-attachments', () => {
    it('accepts extension-based text attachments even when the browser omits mime type', () => {
        const file = new File(['# Title'], 'notes.md', { type: '' });

        expect(validateComposerAttachmentFile(file)).toBeNull();
    });

    it('labels structured pasted content by heuristic', () => {
        const attachment = createPastedTextAttachment('{"strain":"Blue Dream","thc":24}');

        expect(attachment.name).toBe('Pasted JSON Data');
    });

    it('serializes pasted unicode text into a data url payload', async () => {
        const attachment = createPastedTextAttachment('Line one\nHello 🌿');
        const payload = await toAgentAttachmentPayload(attachment);

        expect(payload.type).toBe('text/plain');
        expect(payload.base64.startsWith('data:text/plain;base64,')).toBe(true);
        expect(decodeDataUrl(payload.base64)).toBe('Line one\nHello 🌿');
    });

    it('falls back to extension-based mime types for file payloads', async () => {
        const file = new File(['name: bakedbot'], 'config.yaml', { type: '' });
        const payload = await toAgentAttachmentPayload({
            id: 'att-test',
            file,
            type: 'file',
            name: file.name,
        });

        expect(payload.type).toBe('text/yaml');
        expect(decodeDataUrl(payload.base64)).toBe('name: bakedbot');
    });

    it('builds chat message attachments from preview data', () => {
        const attachment = {
            id: 'att-image',
            type: 'image' as const,
            name: 'flower.png',
            preview: 'data:image/png;base64,ZmFrZQ==',
        };

        expect(getAttachmentMimeType(attachment)).toBe('image/png');
        expect(toChatMessageAttachment(attachment)).toEqual({
            id: 'att-image',
            name: 'flower.png',
            type: 'image/png',
            url: 'data:image/png;base64,ZmFrZQ==',
            preview: 'data:image/png;base64,ZmFrZQ==',
        });
    });
});
