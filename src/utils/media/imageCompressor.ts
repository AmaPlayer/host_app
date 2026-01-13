// Image Compression Utility
// Client-side image compression using browser-image-compression library

import imageCompression from 'browser-image-compression';
import {
    MEDIA_COMPRESSION_CONFIG,
    CompressionOptions,
    CompressionResult,
    CompressionProgress,
} from '../../config/mediaConfig';

/**
 * Compress an image file with configurable quality settings
 * @param file - Original image file
 * @param options - Compression options (optional)
 * @param onProgress - Progress callback (optional)
 * @returns Compressed image file with metadata
 */
export async function compressImage(
    file: File,
    options?: CompressionOptions,
    onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = file.size;

    try {
        // Report analyzing stage
        onProgress?.({
            stage: 'analyzing',
            progress: 10,
            message: 'Analyzing image...',
        });

        // Merge with default config
        const config = {
            maxWidthOrHeight: options?.maxWidth || MEDIA_COMPRESSION_CONFIG.images.maxWidth,
            initialQuality: options?.quality || MEDIA_COMPRESSION_CONFIG.images.quality,
            useWebWorker: true,
            fileType: `image/${options?.outputFormat || MEDIA_COMPRESSION_CONFIG.images.format}`,
            onProgress: (progress: number) => {
                onProgress?.({
                    stage: 'compressing',
                    progress: 10 + progress * 0.8, // Map 0-100 to 10-90
                    message: `Compressing image... ${Math.round(progress)}%`,
                });
            },
        };

        // Report compression stage
        onProgress?.({
            stage: 'compressing',
            progress: 20,
            message: 'Compressing image...',
        });

        // Compress the image
        const compressedBlob = await imageCompression(file, config);

        // Convert blob to file
        const compressedFile = new File(
            [compressedBlob],
            file.name.replace(/\.[^/.]+$/, `.${options?.outputFormat || 'jpg'}`),
            {
                type: compressedBlob.type,
                lastModified: Date.now(),
            }
        );

        const compressedSize = compressedFile.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        // Get image dimensions
        const dimensions = await getImageDimensions(compressedFile);

        // Report completion
        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: `Compressed ${compressionRatio.toFixed(1)}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)})`,
        });

        const compressionTime = Date.now() - startTime;
        console.log(`✅ Image compressed in ${compressionTime}ms: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio.toFixed(1)}% reduction)`);

        return {
            originalSize,
            compressedSize,
            compressionRatio,
            file: compressedFile,
            metadata: {
                width: dimensions.width,
                height: dimensions.height,
                format: compressedFile.type,
            },
        };
    } catch (error) {
        console.error('❌ Image compression failed:', error);
        throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate a thumbnail from an image
 * @param file - Original image file
 * @param size - Thumbnail size (default: 400px)
 * @returns Thumbnail file
 */
export async function generateThumbnail(
    file: File,
    size: number = MEDIA_COMPRESSION_CONFIG.images.thumbnailSize
): Promise<File> {
    try {
        const options = {
            maxWidthOrHeight: size,
            initialQuality: MEDIA_COMPRESSION_CONFIG.images.thumbnailQuality,
            useWebWorker: true,
        };

        const thumbnailBlob = await imageCompression(file, options);

        return new File(
            [thumbnailBlob],
            `thumb_${file.name}`,
            {
                type: thumbnailBlob.type,
                lastModified: Date.now(),
            }
        );
    } catch (error) {
        console.error('❌ Thumbnail generation failed:', error);
        throw error;
    }
}

/**
 * Get image dimensions
 * @param file - Image file
 * @returns Width and height
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.width,
                height: img.height,
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
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

/**
 * Validate image file before compression
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return { isValid: false, error: 'File is not an image' };
    }

    // Check file size
    if (file.size > MEDIA_COMPRESSION_CONFIG.limits.maxOriginalSize) {
        return {
            isValid: false,
            error: `File size exceeds ${formatFileSize(MEDIA_COMPRESSION_CONFIG.limits.maxOriginalSize)} limit`,
        };
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!supportedFormats.includes(file.type.toLowerCase())) {
        return {
            isValid: false,
            error: 'Unsupported image format. Please use JPEG, PNG, or WebP',
        };
    }

    return { isValid: true };
}
