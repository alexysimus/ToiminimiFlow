/**
 * receiptFileService.ts
 * 
 * Zero-Storage Local & Cloud Receipt Reference Manager for Finnish Sole Traders.
 * 
 * Philosophy:
 * 1. Privacy-First & 0MB Storage: Never upload or store base64 binary images in localStorage.
 * 2. File System Access API: Connect to local receipt folders (e.g. E:\Toiminimi\Kuitit)
 *    and open files in 1-click via ephemeral Blob URLs without transmitting files anywhere.
 * 3. Safe Universal Opener: Safely validates cloud links (Google Drive, iCloud, OneDrive)
 *    and provides quick-copy fallbacks for traditional file paths on unsupported browsers.
 */

import { storageService } from './storageService';

const DB_NAME = 'toiminimi_fs_db';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const DIR_HANDLE_KEY = 'receipts_dir_handle';
const DIR_NAME_KEY = 'receipts_dir_name';

// Helper: Open IndexedDB for storing DirectoryHandle
const openFSDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper: IDB Get
const idbGet = async <T>(key: string): Promise<T | undefined> => {
  try {
    const db = await openFSDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
};

// Helper: IDB Set
const idbSet = async (key: string, value: any): Promise<void> => {
  const db = await openFSDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Helper: IDB Delete
const idbDelete = async (key: string): Promise<void> => {
  const db = await openFSDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export interface ReceiptOpenResult {
  success: boolean;
  type: 'url' | 'file' | 'path';
  message?: string;
  error?: string;
}

export const receiptFileService = {
  /**
   * Check if the File System Access API is supported (Chromium: Chrome, Edge, Opera)
   */
  isFileSystemAccessSupported: (): boolean => {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  },

  /**
   * Connect a local receipts directory on the user's hard drive.
   * Stores the FileSystemDirectoryHandle inside IndexedDB (0 bytes in localStorage).
   */
  linkReceiptDirectory: async (): Promise<{ success: boolean; dirName?: string; error?: string }> => {
    if (!receiptFileService.isFileSystemAccessSupported()) {
      return { 
        success: false, 
        error: 'NOT_SUPPORTED',
        dirName: undefined
      };
    }

    try {
      const pickerFn = (window as any).showDirectoryPicker;
      const dirHandle = await pickerFn({
        mode: 'read',
        startIn: 'documents'
      });

      if (!dirHandle) return { success: false };

      await idbSet(DIR_HANDLE_KEY, dirHandle);
      await idbSet(DIR_NAME_KEY, dirHandle.name);

      storageService.updateSyncMetadata({
        receiptDirectoryName: dirHandle.name
      });

      return { success: true, dirName: dirHandle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'USER_CANCELLED' };
      }
      console.warn('Failed to link directory handle:', err);
      return { success: false, error: err.message || 'PERMISSION_DENIED' };
    }
  },

  /**
   * Retrieve the linked FileSystemDirectoryHandle with permission check
   */
  getReceiptDirectoryHandle: async (mode: 'read' | 'readwrite' = 'read'): Promise<any | null> => {
    try {
      const handle = await idbGet<any>(DIR_HANDLE_KEY);
      if (!handle) return null;

      // Query permission or request permission if needed
      if (typeof handle.queryPermission === 'function') {
        let perm = await handle.queryPermission({ mode });
        if (perm === 'prompt') {
          perm = await handle.requestPermission({ mode });
        }
        if (perm !== 'granted') return null;
      }
      return handle;
    } catch {
      return null;
    }
  },

  /**
   * Get the saved name of the linked directory (from memory/IndexedDB/localStorage)
   */
  getReceiptDirectoryName: async (): Promise<string | null> => {
    try {
      const name = await idbGet<string>(DIR_NAME_KEY);
      if (name) return name;
      const syncMeta = storageService.getSyncMetadata();
      return syncMeta.receiptDirectoryName || null;
    } catch {
      return null;
    }
  },

  /**
   * Disconnect the linked local directory
   */
  unlinkReceiptDirectory: async (): Promise<void> => {
    try {
      await idbDelete(DIR_HANDLE_KEY);
      await idbDelete(DIR_NAME_KEY);
      storageService.updateSyncMetadata({ receiptDirectoryName: undefined });
    } catch (e) {
      console.warn('Error unlinking directory:', e);
    }
  },

  /**
   * Write backup JSON directly to the linked local directory (e.g. Google Drive/OneDrive folder)
   */
  writeBackupToDirectory: async (fileName: string, content: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const dirHandle = await receiptFileService.getReceiptDirectoryHandle('readwrite');
      if (!dirHandle) {
        return { success: false, error: 'NO_DIRECTORY_OR_PERMISSION' };
      }
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true };
    } catch (err: any) {
      console.warn('Failed to write backup to directory:', err);
      return { success: false, error: err.message || 'WRITE_FAILED' };
    }
  },

  /**
   * Read backup JSON directly from the linked local directory
   */
  readBackupFromDirectory: async (fileName: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    try {
      const dirHandle = await receiptFileService.getReceiptDirectoryHandle('read');
      if (!dirHandle) {
        return { success: false, error: 'NO_DIRECTORY_OR_PERMISSION' };
      }
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return { success: true, content };
    } catch (err: any) {
      console.warn('Failed to read backup from directory:', err);
      return { success: false, error: err.message || 'READ_FAILED' };
    }
  },

  /**
   * Extract bare filename from any path (Windows or Unix)
   */
  extractFileName: (pathOrName: string): string => {
    if (!pathOrName) return '';
    // Strip trailing slashes
    const cleaned = pathOrName.trim().replace(/[\\/]+$/, '');
    // Split on either / or \
    const segments = cleaned.split(/[\\/]/);
    return segments[segments.length - 1] || cleaned;
  },

  /**
   * Sanitize receipt references before saving:
   * Strips Base64 payloads (to prevent 5MB localStorage overflow) and unsafe URI schemes.
   */
  sanitizeReceiptReference: (input?: string): string => {
    if (!input) return '';
    const trimmed = input.trim();

    // Block raw Base64 data URLs - never let large binaries into localStorage
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:application/')) {
      return 'receipt_voucher.pdf';
    }

    // Block dangerous script execution protocols
    if (/^(javascript:|vbscript:|data:text\/html)/i.test(trimmed)) {
      return '';
    }

    return trimmed;
  },

  /**
   * Open a receipt file directly from the linked local directory
   */
  openLocalFile: async (fileNameOrPath: string): Promise<ReceiptOpenResult> => {
    const fileName = receiptFileService.extractFileName(fileNameOrPath);
    if (!fileName) {
      return { success: false, type: 'file', error: 'EMPTY_NAME', message: 'No file specified' };
    }

    const dirHandle = await receiptFileService.getReceiptDirectoryHandle();
    if (!dirHandle) {
      return { 
        success: false, 
        type: 'file', 
        error: 'NO_DIRECTORY',
        message: 'No local receipt folder linked. Link a folder in Settings/Backup.' 
      };
    }

    try {
      const fileHandle = await dirHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const blobUrl = URL.createObjectURL(file);

      const win = window.open(blobUrl, '_blank');
      // Revoke ephemeral object URL after 60 seconds
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

      if (!win) {
        return { 
          success: false, 
          type: 'file', 
          error: 'POPUP_BLOCKED', 
          message: 'Pop-up blocked by browser. Please allow pop-ups for Toiminimi Flow.' 
        };
      }

      return { success: true, type: 'file' };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { 
          success: false, 
          type: 'file', 
          error: 'FILE_NOT_FOUND', 
          message: `File "${fileName}" not found inside linked folder "${dirHandle.name}".` 
        };
      }
      return { success: false, type: 'file', error: err.name, message: err.message };
    }
  },

  /**
   * Safe Universal Opener:
   * - If http(s) URL: Opens in new tab with rel="noopener noreferrer".
   * - If local file: Tries to read from connected folder.
   * - Fallback: Informs caller to offer "Copy Path".
   */
  openReceiptReference: async (refString?: string): Promise<ReceiptOpenResult> => {
    if (!refString) {
      return { success: false, type: 'path', error: 'EMPTY', message: 'No receipt reference attached.' };
    }

    const trimmed = refString.trim();

    // 1. Cloud / Web URL
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          window.open(url.href, '_blank', 'noopener,noreferrer');
          return { success: true, type: 'url' };
        }
      } catch {
        return { success: false, type: 'url', error: 'INVALID_URL', message: 'Invalid URL format' };
      }
    }

    // 2. Local File System Access API
    if (receiptFileService.isFileSystemAccessSupported()) {
      const localResult = await receiptFileService.openLocalFile(trimmed);
      if (localResult.success) return localResult;
      // If failed due to no directory or not found, return the specific result
      return localResult;
    }

    // 3. Fallback to path copy
    return { 
      success: false, 
      type: 'path', 
      error: 'NOT_SUPPORTED',
      message: 'Browser does not support direct local file opening. Use "Copy Path" instead.' 
    };
  },

  /**
   * 1-Click Copy Receipt Path to clipboard
   */
  copyReceiptPath: async (pathOrUrl: string): Promise<boolean> => {
    if (!pathOrUrl) return false;
    try {
      await navigator.clipboard.writeText(pathOrUrl.trim());
      return true;
    } catch {
      return false;
    }
  }
};
