import { storageService } from '../storage/index';
// Mock UploadTask for compatibility if needed, or remove
type UploadTask = any;

// Supported video file types
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/wmv',
  'video/flv',
  'video/webm',
  'video/mkv',
  'video/m4v'
];

// Maximum file size (100MB)
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

// Video upload paths
export const VIDEO_PATHS = {
  POSTS: 'post-videos',
  HIGHLIGHTS: 'athlete-highlights',
  TRAINING: 'training-sessions',
  COMPETITIONS: 'competitions'
} as const;

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface VideoMetadata {
  url: string;
  type: 'video';
  mimeType: string;
  size: number;
  fileName: string;
  uploadedAt: string;
  duration?: number;
  durationFormatted?: string;
  thumbnail?: string;
}

/**
 * Validates video file before upload
 */
export const validateVideoFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_VIDEO_TYPES.map(type => type.split('/')[1]).join(', ')}`
    };
  }

  if (file.size > MAX_VIDEO_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum size: ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`
    };
  }

  return { isValid: true };
};

/**
 * Uploads video file to Firebase Storage with progress tracking
 */
export const uploadVideoFile = async (
  file: File,
  userId: string,
  category: string = VIDEO_PATHS.POSTS,
  onProgress: ((progress: number) => void) | null = null,
  onTaskCreated: ((task: UploadTask) => void) | null = null
): Promise<string> => {
  // Validate file first
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    console.error('Video validation failed:', validation.error);
    throw new Error(validation.error);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${category}/${userId}/${fileName}`;

  try {
    if (onProgress) onProgress(10);

    // Upload using R2 service
    // Note: Simple upload via SDK v3 doesn't give granular XHR-style progress easily without lib-storage.
    // We simulate some progress or just jump to completion.
    if (onProgress) onProgress(30);

    const result = await storageService.uploadFile(filePath, file);

    if (onProgress) onProgress(100);

    return result.url;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw new Error(`Failed to upload video: ${(error as Error).message}`);
  }
};

/**
 * Creates video thumbnail from video file
 */
export const createVideoThumbnail = (videoFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      // Set canvas size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to 1 second or 10% of video duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener('seeked', () => {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail'));
        }
      }, 'image/jpeg', 0.8);
    });

    video.addEventListener('error', () => {
      reject(new Error('Failed to load video for thumbnail'));
    });

    // Load video file
    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};

/**
 * Gets video duration from file
 */
export const getVideoDuration = (videoFile: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');

    video.addEventListener('loadedmetadata', () => {
      resolve(video.duration);
    });

    video.addEventListener('error', () => {
      reject(new Error('Failed to load video metadata'));
    });

    video.src = URL.createObjectURL(videoFile);
    video.load();
  });
};

/**
 * Formats duration in seconds to MM:SS format
 */
export const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Uploads video thumbnail to Firebase Storage
 */
export const uploadThumbnail = async (
  thumbnailBlob: Blob,
  userId: string,
  originalFileName: string
): Promise<string> => {
  try {
    // Generate unique filename for thumbnail
    const timestamp = Date.now();
    const thumbnailName = `thumb_${timestamp}_${originalFileName.replace(/\.[^/.]+$/, '')}.jpg`;
    const thumbnailPath = `thumbnails/${userId}/${thumbnailName}`;

    // Upload thumbnail
    const result = await storageService.uploadFile(thumbnailPath, thumbnailBlob);
    return result.url;
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    throw error;
  }
};

/**
 * Generates video metadata object
 */
export const generateVideoMetadata = async (
  videoFile: File,
  downloadURL: string,
  userId: string | null = null
): Promise<VideoMetadata> => {
  try {
    // Try to get duration, but don't fail if it doesn't work
    let duration: number | null = null;
    let durationFormatted: string | null = null;

    try {
      duration = await getVideoDuration(videoFile);
      durationFormatted = formatDuration(duration);
    } catch (durationError) {
      console.warn('Could not get video duration:', (durationError as Error).message);
    }

    // Try to create and upload thumbnail, but don't fail if it doesn't work
    let thumbnailURL: string | null = null;
    try {
      const thumbnailBlob = await createVideoThumbnail(videoFile);
      // Upload thumbnail to Firebase Storage if userId is provided
      if (thumbnailBlob && userId) {
        thumbnailURL = await uploadThumbnail(thumbnailBlob, userId, videoFile.name);
      }
    } catch (thumbnailError) {
      console.warn('Could not create/upload video thumbnail:', (thumbnailError as Error).message);
    }

    const metadata: VideoMetadata = {
      url: downloadURL,
      type: 'video',
      mimeType: videoFile.type,
      size: videoFile.size,
      fileName: videoFile.name,
      uploadedAt: new Date().toISOString()
    };

    // Add optional fields if available
    if (duration !== null) {
      metadata.duration = duration;
      metadata.durationFormatted = durationFormatted!;
    }

    if (thumbnailURL) {
      metadata.thumbnail = thumbnailURL;
    }
    return metadata;

  } catch (error) {
    console.error('Error generating video metadata:', error);

    // Return basic metadata even if enhanced features fail
    const basicMetadata: VideoMetadata = {
      url: downloadURL,
      type: 'video',
      mimeType: videoFile.type,
      size: videoFile.size,
      fileName: videoFile.name,
      uploadedAt: new Date().toISOString()
    };
    return basicMetadata;
  }
};
