import { useState, useCallback } from 'react';
import { storageService } from '../services/storage';
import { MEDIA_COMPRESSION_CONFIG } from '../config/mediaConfig';

interface MediaPreview {
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

interface UseMediaUploadReturn {
  selectedMedia: File | null;
  mediaPreview: MediaPreview | null;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  // Compression states
  compressing: boolean;
  compressionProgress: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionEnabled: boolean;
  // Methods
  selectMedia: (file: File) => void;
  removeMedia: () => void;
  uploadMedia: (file: File, userId: string) => Promise<string>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  validateFile: (file: File) => { isValid: boolean; error?: string };
  clearError: () => void;
  reset: () => void;
  toggleCompression: () => void;
}

/**
 * Custom hook for handling media upload functionality with compression
 * Extracts media upload logic from Home component
 */
export const useMediaUpload = (): UseMediaUploadReturn => {
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Compression states
  const [compressing, setCompressing] = useState<boolean>(false);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);
  const [compressionEnabled, setCompressionEnabled] = useState<boolean>(
    MEDIA_COMPRESSION_CONFIG.features.enableImageCompression
  );

  /**
   * Validate file type and size
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 50MB' };
    }

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ];

    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV) file.'
      };
    }

    return { isValid: true };
  }, []);

  /**
   * Select and preview media file
   * @param {File} file - File to select
   */
  const selectMedia = useCallback((file: File): void => {
    setError(null);

    const validation = validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedMedia(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview({
        url: e.target?.result as string,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: file.size
      });
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  /**
   * Remove selected media and preview
   */
  const removeMedia = useCallback((): void => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setError(null);
    setUploadProgress(0);

    // Reset file input if it exists
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  /**
   * Upload media file to R2 Storage with compression
   * @param {File} file - File to upload
   * @param {string} userId - User ID for file path
   * @returns {Promise<string>} Download URL
   */
  const uploadMedia = useCallback(async (file: File, userId: string): Promise<string> => {
    if (!file) {
      throw new Error('No file to upload');
    }

    if (!userId) {
      throw new Error('User ID is required for upload');
    }

    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setOriginalSize(file.size);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `posts/${userId}/${timestamp}_${file.name}`;

      // Upload file to R2 with compression
      const result = await storageService.uploadFile(
        filename,
        file,
        undefined,
        {
          compress: compressionEnabled,
          onProgress: (progress) => {
            setUploadProgress(progress);
            if (progress < 50) {
              setCompressing(true);
              setCompressionProgress(progress * 2); // Map 0-50 to 0-100 for compression
            } else {
              setCompressing(false);
              setCompressionProgress(100);
            }
          }
        }
      );

      // Update compression stats if available
      if (result.metadata?.compressed) {
        setCompressedSize(result.metadata.size);
        setCompressionRatio(result.metadata.compressionRatio || 0);
        console.log(`✅ Upload complete with ${result.metadata.compressionRatio?.toFixed(1)}% compression`);
      } else {
        setCompressedSize(file.size);
        setCompressionRatio(0);
      }

      setUploadProgress(100);

      return result.url;

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
      setCompressing(false);
      // Keep progress at 100% briefly if successful, then reset
      setTimeout(() => {
        setUploadProgress(0);
        setCompressionProgress(0);
      }, 1000);
    }
  }, [validateFile, compressionEnabled]);

  /**
   * Handle file input change event
   * @param {Event} event - File input change event
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      selectMedia(file);
    }
  }, [selectMedia]);

  /**
   * Clear any existing errors
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * Reset all media upload state
   */
  const reset = useCallback((): void => {
    setSelectedMedia(null);
    setMediaPreview(null);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    setCompressing(false);
    setCompressionProgress(0);
    setOriginalSize(0);
    setCompressedSize(0);
    setCompressionRatio(0);

    // Reset file input if it exists
    const fileInput = document.getElementById('media-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  /**
   * Toggle compression on/off
   */
  const toggleCompression = useCallback((): void => {
    setCompressionEnabled(prev => !prev);
  }, []);

  return {
    selectedMedia,
    mediaPreview,
    uploading,
    uploadProgress,
    error,
    compressing,
    compressionProgress,
    originalSize,
    compressedSize,
    compressionRatio,
    compressionEnabled,
    selectMedia,
    removeMedia,
    uploadMedia,
    handleFileSelect,
    validateFile,
    clearError,
    reset,
    toggleCompression
  };
};
