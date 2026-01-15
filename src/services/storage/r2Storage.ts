
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { Upload } from '@aws-sdk/lib-storage'; // For larger files/progress if needed later
import { StorageService, UploadResult, UploadOptions } from './types';
import { compressImage } from '../../utils/media/imageCompressor';
import { compressVideo } from '../../utils/media/videoCompressor';
import { MEDIA_COMPRESSION_CONFIG } from '../../config/mediaConfig';

class R2StorageService implements StorageService {
    private client: S3Client;
    private bucket: string;
    private publicUrl: string;

    constructor() {
        const accountId = process.env.REACT_APP_R2_ACCOUNT_ID || '';
        const accessKeyId = process.env.REACT_APP_R2_ACCESS_KEY_ID || '';
        const secretAccessKey = process.env.REACT_APP_R2_SECRET_ACCESS_KEY || '';
        this.bucket = process.env.REACT_APP_R2_BUCKET_NAME || '';
        this.publicUrl = process.env.REACT_APP_R2_PUBLIC_URL || '';

        if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
            console.warn('⚠️ Cloudflare R2 credentials missing. Storage operations will fail.');
        }

        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true,
        });

        console.log('[R2 Debug] Initialized with:', {
            bucket: this.bucket,
            accountId: accountId ? '***' + accountId.slice(-4) : 'MISSING',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`
        });
    }

    async uploadFile(
        path: string,
        file: File | Blob,
        metadata?: Record<string, string>,
        options?: UploadOptions
    ): Promise<UploadResult> {
        try {
            const originalSize = file.size;
            let fileToUpload: File | Blob = file;
            let compressionMetadata: any = {};

            // Determine if compression should be applied
            const shouldCompress = options?.compress !== false && MEDIA_COMPRESSION_CONFIG.features.enableImageCompression;

            // Apply compression for images
            if (shouldCompress && file instanceof File && file.type.startsWith('image/')) {
                console.log('🗜️ Compressing image before upload...');

                try {
                    const compressionResult = await compressImage(
                        file,
                        options?.compressionOptions,
                        (progress) => {
                            if (options?.onProgress) {
                                // Map compression progress to 0-50% of total upload
                                options.onProgress(progress.progress * 0.5);
                            }
                        }
                    );

                    fileToUpload = compressionResult.file;
                    compressionMetadata = {
                        originalSize: compressionResult.originalSize,
                        compressionRatio: compressionResult.compressionRatio,
                        compressed: true,
                    };

                    console.log(`✅ Image compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio.toFixed(1)}% reduction)`);
                } catch (compressionError) {
                    console.warn('⚠️ Image compression failed, uploading original:', compressionError);
                    // Continue with original file if compression fails
                }
            }

            // Apply compression for videos (if supported)
            if (shouldCompress && file instanceof File && file.type.startsWith('video/') && MEDIA_COMPRESSION_CONFIG.features.enableVideoCompression) {
                console.log('🗜️ Processing video before upload...');

                try {
                    const compressionResult = await compressVideo(
                        file,
                        undefined,
                        (progress) => {
                            if (options?.onProgress) {
                                options.onProgress(progress.progress * 0.5);
                            }
                        }
                    );

                    if (compressionResult.compressionRatio > 0) {
                        fileToUpload = compressionResult.file;
                        compressionMetadata = {
                            originalSize: compressionResult.originalSize,
                            compressionRatio: compressionResult.compressionRatio,
                            compressed: true,
                        };
                        console.log(`✅ Video compressed: ${compressionResult.compressionRatio.toFixed(1)}% reduction`);
                    } else {
                        console.log('ℹ️ Video compression not available, uploading original');
                    }
                } catch (compressionError) {
                    console.warn('⚠️ Video compression failed, uploading original:', compressionError);
                }
            }

            // Convert Blob/File to Uint8Array for AWS SDK
            const arrayBuffer = await fileToUpload.arrayBuffer();
            const fileBody = new Uint8Array(arrayBuffer);

            const fileType = fileToUpload.type || (file instanceof File ? file.type : 'application/octet-stream');
            const fileSize = fileToUpload.size;

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: path,
                Body: fileBody,
                ContentType: fileType,
                Metadata: metadata,
            });

            await this.client.send(command);

            // Report upload complete
            if (options?.onProgress) {
                options.onProgress(100);
            }

            return {
                url: this.getPublicUrl(path),
                path: path,
                metadata: {
                    size: fileSize,
                    type: fileType,
                    lastModified: Date.now(),
                    ...compressionMetadata
                }
            };
        } catch (error) {
            console.error('R2 Upload Error:', error);
            throw error;
        }
    }

    async deleteFile(path: string): Promise<void> {
        try {
            // If path is a full URL, extract the key
            let key = path;
            if (path.startsWith('http')) {
                // Attempt to extract key from URL if possible, strict path is better
                // For now assume path is key
            }

            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.client.send(command);
        } catch (error) {
            console.error('R2 Delete Error:', error);
            throw error;
        }
    }

    getPublicUrl(path: string): string {
        // If publicUrl is set (e.g. assets.myapp.com), use it
        if (this.publicUrl) {
            // Remove trailing slash if present
            const baseUrl = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl;
            // Ensure path doesn't start with slash
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            return `${baseUrl}/${cleanPath}`;
        }
        // Fallback? R2 specific URL if strictly public bucket?
        // User must provide VITE_R2_PUBLIC_URL for this to work well.
        return path;
    }
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

export const r2Storage = new R2StorageService();
