/**
 * Agent Chat Store Unit Tests
 * 
 * Tests for the Zustand store managing chat state and artifacts.
 */

import { useAgentChatStore, AgentChatState, ChatMessage } from '@/lib/store/agent-chat-store';
import { Artifact } from '@/types/artifact';
import { act } from '@testing-library/react';

// Reset store before each test
beforeEach(() => {
    const { getState } = useAgentChatStore;
    act(() => {
        getState().clearCurrentSession();
    });
});

describe('Agent Chat Store - Artifact Management', () => {
    const mockArtifact: Artifact = {
        id: 'test-artifact-1',
        type: 'code',
        title: 'Test Code',
        content: 'const x = 1;',
        language: 'typescript',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    describe('addArtifact', () => {
        it('should add artifact to currentArtifacts', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
            });
            
            expect(getState().currentArtifacts).toHaveLength(1);
            expect(getState().currentArtifacts[0].id).toBe('test-artifact-1');
        });

        it('should set activeArtifactId to new artifact', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
            });
            
            expect(getState().activeArtifactId).toBe('test-artifact-1');
        });

        it('should auto-open the artifact panel', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
            });
            
            expect(getState().isArtifactPanelOpen).toBe(true);
        });

        it('should add multiple artifacts', () => {
            const { getState } = useAgentChatStore;
            const artifact2: Artifact = { ...mockArtifact, id: 'test-artifact-2' };
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().addArtifact(artifact2);
            });
            
            expect(getState().currentArtifacts).toHaveLength(2);
            // Latest artifact should be active
            expect(getState().activeArtifactId).toBe('test-artifact-2');
        });
    });

    describe('updateArtifact', () => {
        it('should update existing artifact content', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().updateArtifact('test-artifact-1', { content: 'const y = 2;' });
            });
            
            expect(getState().currentArtifacts[0].content).toBe('const y = 2;');
        });

        it('should update artifact title', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().updateArtifact('test-artifact-1', { title: 'Renamed Artifact' });
            });
            
            expect(getState().currentArtifacts[0].title).toBe('Renamed Artifact');
        });

        it('should update the updatedAt timestamp', () => {
            const { getState } = useAgentChatStore;
            const originalTime = new Date('2024-01-01');
            const artifactWithTime = { ...mockArtifact, updatedAt: originalTime };
            
            act(() => {
                getState().addArtifact(artifactWithTime);
                getState().updateArtifact('test-artifact-1', { content: 'updated' });
            });
            
            expect(getState().currentArtifacts[0].updatedAt.getTime()).toBeGreaterThan(originalTime.getTime());
        });

        it('should not modify non-targeted artifacts', () => {
            const { getState } = useAgentChatStore;
            const artifact2: Artifact = { ...mockArtifact, id: 'test-artifact-2', title: 'Original Title 2' };
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().addArtifact(artifact2);
                getState().updateArtifact('test-artifact-1', { title: 'Updated Title 1' });
            });
            
            expect(getState().currentArtifacts[1].title).toBe('Original Title 2');
        });
    });

    describe('removeArtifact', () => {
        it('should remove artifact from array', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().removeArtifact('test-artifact-1');
            });
            
            expect(getState().currentArtifacts).toHaveLength(0);
        });

        it('should clear activeArtifactId if removed artifact was active', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().removeArtifact('test-artifact-1');
            });
            
            expect(getState().activeArtifactId).toBeNull();
        });

        it('should keep activeArtifactId if different artifact removed', () => {
            const { getState } = useAgentChatStore;
            const artifact2: Artifact = { ...mockArtifact, id: 'test-artifact-2' };
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().addArtifact(artifact2);
                getState().removeArtifact('test-artifact-1');
            });
            
            // Artifact 2 was the last added, so it should still be active
            expect(getState().activeArtifactId).toBe('test-artifact-2');
        });
    });

    describe('setActiveArtifact', () => {
        it('should set the active artifact ID', () => {
            const { getState } = useAgentChatStore;
            const artifact2: Artifact = { ...mockArtifact, id: 'test-artifact-2' };
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().addArtifact(artifact2);
                getState().setActiveArtifact('test-artifact-1');
            });
            
            expect(getState().activeArtifactId).toBe('test-artifact-1');
        });

        it('should open panel when setting active artifact', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().setArtifactPanelOpen(false);
                getState().setActiveArtifact('test-artifact-1');
            });
            
            expect(getState().isArtifactPanelOpen).toBe(true);
        });

        it('should close panel when setting null', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addArtifact(mockArtifact);
                getState().setActiveArtifact(null);
            });
            
            expect(getState().isArtifactPanelOpen).toBe(false);
        });
    });

    describe('setArtifactPanelOpen', () => {
        it('should open the panel', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().setArtifactPanelOpen(true);
            });
            
            expect(getState().isArtifactPanelOpen).toBe(true);
        });

        it('should close the panel', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().setArtifactPanelOpen(true);
                getState().setArtifactPanelOpen(false);
            });
            
            expect(getState().isArtifactPanelOpen).toBe(false);
        });
    });
});

describe('Agent Chat Store - Message Management', () => {
    const mockMessage: ChatMessage = {
        id: 'msg-1',
        type: 'user',
        content: 'Hello',
        timestamp: new Date(),
    };

    describe('addMessage', () => {
        it('should add message to currentMessages', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addMessage(mockMessage);
            });
            
            expect(getState().currentMessages).toHaveLength(1);
            expect(getState().currentMessages[0].content).toBe('Hello');
        });
    });

    describe('updateMessage', () => {
        it('should update message content', () => {
            const { getState } = useAgentChatStore;
            
            act(() => {
                getState().addMessage(mockMessage);
                getState().updateMessage('msg-1', { content: 'Goodbye' });
            });
            
            expect(getState().currentMessages[0].content).toBe('Goodbye');
        });
    });

    describe('clearCurrentSession', () => {
        it('should clear messages and artifacts', () => {
            const { getState } = useAgentChatStore;
            const mockArtifact: Artifact = {
                id: 'a1',
                type: 'code',
                title: 'Test',
                content: 'test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            act(() => {
                getState().addMessage(mockMessage);
                getState().addArtifact(mockArtifact);
                getState().clearCurrentSession();
            });
            
            expect(getState().currentMessages).toHaveLength(0);
            expect(getState().currentArtifacts).toHaveLength(0);
            expect(getState().activeArtifactId).toBeNull();
            expect(getState().isArtifactPanelOpen).toBe(false);
        });
    });
});
