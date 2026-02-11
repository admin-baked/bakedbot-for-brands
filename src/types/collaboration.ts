/**
 * Real-Time Collaboration Types
 *
 * Types for multi-user collaborative code editing in Vibe IDE.
 */

export interface CollaborationSession {
  id: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  participants: CollaborationParticipant[];
  activeFile?: string;
  locked: boolean;
}

export interface CollaborationParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  color: string; // Unique color for cursor/highlights
  joinedAt: string;
  lastSeen: string;
  currentFile?: string;
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface CodeEdit {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  filePath: string;
  operation: EditOperation;
  version: number; // Document version for OT
}

export type EditOperation =
  | InsertOperation
  | DeleteOperation
  | ReplaceOperation;

export interface InsertOperation {
  type: 'insert';
  position: CursorPosition;
  text: string;
}

export interface DeleteOperation {
  type: 'delete';
  start: CursorPosition;
  end: CursorPosition;
}

export interface ReplaceOperation {
  type: 'replace';
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

export interface FileState {
  filePath: string;
  content: string;
  version: number;
  lastModified: number;
  lastModifiedBy: string;
  lockedBy?: string; // User ID if file is locked for editing
}

export interface CollaborationMessage {
  type: CollaborationMessageType;
  userId: string;
  userName: string;
  timestamp: number;
  data: any;
}

export type CollaborationMessageType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'selection_changed'
  | 'file_opened'
  | 'file_closed'
  | 'edit_made'
  | 'file_locked'
  | 'file_unlocked'
  | 'chat_message';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: number;
  replyTo?: string;
}

export interface CollaborationConfig {
  maxParticipants: number;
  allowAnonymous: boolean;
  autoSaveInterval: number; // ms
  cursorSyncInterval: number; // ms
  conflictResolution: 'last_write_wins' | 'operational_transform';
}

export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  maxParticipants: 10,
  allowAnonymous: false,
  autoSaveInterval: 5000,
  cursorSyncInterval: 100,
  conflictResolution: 'operational_transform',
};

export const USER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DFE6E9', // Gray
  '#A29BFE', // Purple
  '#FD79A8', // Pink
  '#FDCB6E', // Orange
  '#6C5CE7', // Indigo
];
