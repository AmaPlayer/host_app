
import { r2Storage } from './r2Storage';
import { StorageService } from './types';

// Export defaults
export const storageService: StorageService = r2Storage;

export * from './types';
