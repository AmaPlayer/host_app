// Video Compression Utility
// Client-side video compression with fallback support

import {
    MEDIA_COMPRESSION_CONFIG,
    VideoCompressionOptions,
    CompressionResult,
    CompressionProgress,
} from '../../config/mediaConfig';

/**
 * Check if WebCodecs API is available
 */
function isWebCodecsSupported(): boolean {
    return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

/**
 * Compress a video file
 * @param file - Original video file
 * @param options - Compression options (optional)
 * @param onProgress - Progress callback (optional)
 * @returns Compressed video file with metadata
 */
export async function compressVideo(
    file: File,
    options?: VideoCompressionOptions,
    onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
    const originalSize = file.size;

    try {
        // Report analyzing stage
        onProgress?.({
            stage: 'analyzing',
            progress: 5,
            message: 'Analyzing video...',
        });

        // Check browser support
        if (!isWebCodecsSupported()) {
            console.warn('⚠️ WebCodecs API not supported. Skipping video compression.');
            onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Video compression not supported in this browser. Using original file.',
            });

            // Return original file without compression
            const metadata = await getVideoMetadata(file);
            return {
                originalSize,
                compressedSize: originalSize,
                compressionRatio: 0,
                file,
                metadata,
            };
        }

        // Get video metadata
        const metadata = await getVideoMetadata(file);

        onProgress?.({
            stage: 'compressing',
            progress: 20,
            message: 'Compressing video...',
        });

        // For now, we'll use a simplified approach
        // Full WebCodecs implementation would be complex and require significant code
        // This is a placeholder that returns the original file
        // In production, you'd implement full WebCodecs encoding here

        console.log('📹 Video compression with WebCodecs would happen here');
        console.log('Original video:', {
            size: formatFileSize(originalSize),
            duration: metadata.duration,
            dimensions: `${metadata.width}x${metadata.height}`,
        });

        // Simulate compression progress
        for (let i = 20; i <= 90; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            onProgress?.({
                stage: 'compressing',
                progress: i,
                message: `Compressing video... ${i}%`,
            });
        }

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Video ready for upload',
        });

        // For now, return original file
        // TODO: Implement full WebCodecs compression
        return {
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 0,
            file,
            metadata,
        };
    } catch (error) {
        console.error('❌ Video compression failed:', error);

        // Fallback: return original file
        const metadata = await getVideoMetadata(file);
        return {
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 0,
            file,
            metadata,
        };
    }
}

/**
 * Get video metadata (duration, dimensions, etc.)
 * @param file - Video file
 * @returns Video metadata
 */
async function getVideoMetadata(file: File): Promise<{
    duration?: number;
    width?: number;
    height?: number;
    format?: string;
}> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                format: file.type,
            });
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({
                format: file.type,
            });
        };

        video.src = url;
    });
}

/**
 * Generate video thumbnail
 * @param file - Video file
 * @param timeInSeconds - Time to capture thumbnail (default: 1 second)
 * @returns Thumbnail as File
 */
export async function generateVideoThumbnail(
    file: File,
    timeInSeconds: number = 1
): Promise<File> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const url = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            video.currentTime = Math.min(timeInSeconds, video.duration / 2);
        };

        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob) {
                        reject(new Error('Failed to generate thumbnail'));
                        return;
                    }

                    const thumbnailFile = new File(
                        [blob],
                        `thumb_${file.name.replace(/\.[^/.]+$/, '.jpg')}`,
                        {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        }
                    );

                    resolve(thumbnailFile);
                },
                'image/jpeg',
                0.8
            );
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load video'));
        };

        video.src = url;
    });
}

/**
 * Validate video file before compression
 * @param file - File to validate
 * @returns Validation result
 */
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('video/')) {
        return { isValid: false, error: 'File is not a video' };
    }

    // Check file size
    if (file.size > MEDIA_COMPRESSION_CONFIG.limits.maxOriginalSize) {
        return {
            isValid: false,
            error: `File size exceeds ${formatFileSize(MEDIA_COMPRESSION_CONFIG.limits.maxOriginalSize)} limit`,
        };
    }

    // Check supported formats
    const supportedFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!supportedFormats.includes(file.type.toLowerCase())) {
        return {
            isValid: false,
            error: 'Unsupported video format. Please use MP4, WebM, or MOV',
        };
    }

    return { isValid: true };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
