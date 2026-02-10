/**
 * BakedBot Drive Store
 *
 * Zustand store for managing Drive state including
 * folders, files, selection, and UI state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DriveFile,
  DriveFolder,
  DriveCategory,
  DriveItemType,
} from '@/types/drive';

// ============ View Mode Types ============

export type DriveViewMode = 'grid' | 'list';
export type DriveSortBy = 'name' | 'date' | 'size';
export type DriveSortOrder = 'asc' | 'desc';

// ============ Selection Types ============

export interface DriveSelection {
  type: DriveItemType;
  id: string;
}

// ============ Breadcrumb Type ============

export interface DriveBreadcrumb {
  id: string;
  name: string;
  path: string;
}

// ============ Store State Interface ============

interface DriveState {
  // Navigation
  currentFolderId: string | null;
  breadcrumbs: DriveBreadcrumb[];

  // Data
  folders: DriveFolder[];
  files: DriveFile[];
  folderTree: DriveFolder[];

  // Selection
  selectedItems: DriveSelection[];
  lastSelectedItem: DriveSelection | null;

  // UI State
  viewMode: DriveViewMode;
  sortBy: DriveSortBy;
  sortOrder: DriveSortOrder;
  categoryFilter: DriveCategory | null;
  searchQuery: string;
  isLoading: boolean;

  // Dialog State
  isUploadDialogOpen: boolean;
  isShareDialogOpen: boolean;
  isRenameDialogOpen: boolean;
  isMoveDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isTrashViewOpen: boolean;

  // Context Menu
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuItem: DriveSelection | null;

  // Error state
  error: string | null;

  // Actions
  // Navigation
  navigateToFolder: (folderId: string | null) => void;
  setBreadcrumbs: (breadcrumbs: DriveBreadcrumb[]) => void;
  navigateToBreadcrumb: (breadcrumb: DriveBreadcrumb) => void;

  // Data Management
  setFolders: (folders: DriveFolder[]) => void;
  setFiles: (files: DriveFile[]) => void;
  setFolderTree: (tree: DriveFolder[]) => void;
  addFolder: (folder: DriveFolder) => void;
  addFile: (file: DriveFile) => void;
  updateFolder: (folderId: string, updates: Partial<DriveFolder>) => void;
  updateFile: (fileId: string, updates: Partial<DriveFile>) => void;
  removeFolder: (folderId: string) => void;
  removeFile: (fileId: string) => void;

  // Selection
  selectItem: (item: DriveSelection, multiSelect?: boolean) => void;
  deselectItem: (item: DriveSelection) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (item: DriveSelection) => boolean;

  // UI Actions
  setViewMode: (mode: DriveViewMode) => void;
  setSortBy: (sortBy: DriveSortBy) => void;
  setSortOrder: (order: DriveSortOrder) => void;
  setCategoryFilter: (category: DriveCategory | null) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;

  // Dialog Actions
  openUploadDialog: () => void;
  closeUploadDialog: () => void;
  openShareDialog: (item?: DriveSelection) => void;
  closeShareDialog: () => void;
  openRenameDialog: (item?: DriveSelection) => void;
  closeRenameDialog: () => void;
  openMoveDialog: (item?: DriveSelection) => void;
  closeMoveDialog: () => void;
  openDeleteDialog: (item?: DriveSelection) => void;
  closeDeleteDialog: () => void;
  openTrashView: () => void;
  closeTrashView: () => void;

  // Context Menu
  openContextMenu: (position: { x: number; y: number }, item: DriveSelection) => void;
  closeContextMenu: () => void;

  // Error
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

// ============ Initial State ============

const initialState = {
  // Navigation
  currentFolderId: null,
  breadcrumbs: [],

  // Data
  folders: [],
  files: [],
  folderTree: [],

  // Selection
  selectedItems: [],
  lastSelectedItem: null,

  // UI State
  viewMode: 'grid' as DriveViewMode,
  sortBy: 'date' as DriveSortBy,
  sortOrder: 'desc' as DriveSortOrder,
  categoryFilter: null,
  searchQuery: '',
  isLoading: false,

  // Dialog State
  isUploadDialogOpen: false,
  isShareDialogOpen: false,
  isRenameDialogOpen: false,
  isMoveDialogOpen: false,
  isDeleteDialogOpen: false,
  isTrashViewOpen: false,

  // Context Menu
  contextMenuPosition: null,
  contextMenuItem: null,

  // Error
  error: null,
};

// ============ Store Implementation ============

export const useDriveStore = create<DriveState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      navigateToFolder: (folderId) => {
        set({
          currentFolderId: folderId,
          selectedItems: [],
          lastSelectedItem: null,
          isTrashViewOpen: false,
        });
      },

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      navigateToBreadcrumb: (breadcrumb) => {
        const { breadcrumbs } = get();
        const index = breadcrumbs.findIndex((b) => b.id === breadcrumb.id);
        if (index >= 0) {
          set({
            currentFolderId: breadcrumb.id,
            breadcrumbs: breadcrumbs.slice(0, index + 1),
            selectedItems: [],
            lastSelectedItem: null,
          });
        }
      },

      // Data Management
      setFolders: (folders) => set({ folders }),
      setFiles: (files) => set({ files }),
      setFolderTree: (tree) => set({ folderTree: tree }),

      addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
      addFile: (file) => set((state) => ({ files: [...state.files, file] })),

      updateFolder: (folderId, updates) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === folderId ? { ...f, ...updates } : f)),
          folderTree: state.folderTree.map((f) => (f.id === folderId ? { ...f, ...updates } : f)),
        })),

      updateFile: (fileId, updates) =>
        set((state) => ({
          files: state.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
        })),

      removeFolder: (folderId) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
          folderTree: state.folderTree.filter((f) => f.id !== folderId),
          selectedItems: state.selectedItems.filter(
            (s) => !(s.type === 'folder' && s.id === folderId)
          ),
        })),

      removeFile: (fileId) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== fileId),
          selectedItems: state.selectedItems.filter(
            (s) => !(s.type === 'file' && s.id === fileId)
          ),
        })),

      // Selection
      selectItem: (item, multiSelect = false) => {
        const { selectedItems } = get();
        const isCurrentlySelected = selectedItems.some(
          (s) => s.type === item.type && s.id === item.id
        );

        if (multiSelect) {
          if (isCurrentlySelected) {
            set({
              selectedItems: selectedItems.filter(
                (s) => !(s.type === item.type && s.id === item.id)
              ),
            });
          } else {
            set({
              selectedItems: [...selectedItems, item],
              lastSelectedItem: item,
            });
          }
        } else {
          set({
            selectedItems: [item],
            lastSelectedItem: item,
          });
        }
      },

      deselectItem: (item) =>
        set((state) => ({
          selectedItems: state.selectedItems.filter(
            (s) => !(s.type === item.type && s.id === item.id)
          ),
        })),

      selectAll: () => {
        const { folders, files } = get();
        const allItems: DriveSelection[] = [
          ...folders.map((f) => ({ type: 'folder' as const, id: f.id })),
          ...files.map((f) => ({ type: 'file' as const, id: f.id })),
        ];
        set({ selectedItems: allItems });
      },

      clearSelection: () => set({ selectedItems: [], lastSelectedItem: null }),

      isSelected: (item) => {
        const { selectedItems } = get();
        return selectedItems.some((s) => s.type === item.type && s.id === item.id);
      },

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      // Dialog Actions
      openUploadDialog: () => set({ isUploadDialogOpen: true }),
      closeUploadDialog: () => set({ isUploadDialogOpen: false }),

      openShareDialog: (item) => {
        if (item) {
          set({ selectedItems: [item], isShareDialogOpen: true });
        } else {
          set({ isShareDialogOpen: true });
        }
      },
      closeShareDialog: () => set({ isShareDialogOpen: false }),

      openRenameDialog: (item) => {
        if (item) {
          set({ selectedItems: [item], isRenameDialogOpen: true });
        } else {
          set({ isRenameDialogOpen: true });
        }
      },
      closeRenameDialog: () => set({ isRenameDialogOpen: false }),

      openMoveDialog: (item) => {
        if (item) {
          set({ selectedItems: [item], isMoveDialogOpen: true });
        } else {
          set({ isMoveDialogOpen: true });
        }
      },
      closeMoveDialog: () => set({ isMoveDialogOpen: false }),

      openDeleteDialog: (item) => {
        if (item) {
          set({ selectedItems: [item], isDeleteDialogOpen: true });
        } else {
          set({ isDeleteDialogOpen: true });
        }
      },
      closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),

      openTrashView: () => set({ isTrashViewOpen: true, selectedItems: [] }),
      closeTrashView: () => set({ isTrashViewOpen: false }),

      // Context Menu
      openContextMenu: (position, item) =>
        set({
          contextMenuPosition: position,
          contextMenuItem: item,
        }),

      closeContextMenu: () =>
        set({
          contextMenuPosition: null,
          contextMenuItem: null,
        }),

      // Error
      setError: (error) => set({ error }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'bakedbot-drive-storage',
      partialize: (state) => ({
        // Only persist UI preferences, not data
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// ============ Selectors ============

/**
 * Get sorted items based on current sort settings
 */
export function useSortedItems() {
  const { folders, files, sortBy, sortOrder } = useDriveStore();

  const sortedFolders = [...folders].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'date') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'size') {
      comparison = b.totalSize - a.totalSize;
    }
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'date') {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'size') {
      comparison = b.size - a.size;
    }
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return { folders: sortedFolders, files: sortedFiles };
}

/**
 * Get filtered items based on search query and category
 */
export function useFilteredItems() {
  const { folders: sortedFolders, files: sortedFiles } = useSortedItems();
  const { searchQuery, categoryFilter } = useDriveStore();

  const queryLower = searchQuery.toLowerCase();

  const filteredFolders = sortedFolders.filter((folder) => {
    if (searchQuery && !folder.name.toLowerCase().includes(queryLower)) {
      return false;
    }
    if (categoryFilter && folder.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const filteredFiles = sortedFiles.filter((file) => {
    if (searchQuery && !file.name.toLowerCase().includes(queryLower)) {
      return false;
    }
    if (categoryFilter && file.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  return { folders: filteredFolders, files: filteredFiles };
}
