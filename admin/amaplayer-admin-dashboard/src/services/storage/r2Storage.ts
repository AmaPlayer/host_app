
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { Upload } from '@aws-sdk/lib-storage'; // For larger files/progress if needed later
import { StorageService, UploadResult } from './types';

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
            forcePathStyle: true, // Needed for R2? Usually no, but harmless often.
        });
    }

    async uploadFile(path: string, file: File | Blob, metadata?: Record<string, string>): Promise<UploadResult> {
        try {
            // Convert Blob/File to Uint8Array or Buffer for AWS SDK if needed, 
            // but v3 supports Blob/File in browser environments usually.
            // However, explicit conversion ensures safety.


            // Fix for AWS SDK v3 in browser: "readableStream.getReader is not a function"
            // Convert Blob/File to Uint8Array to avoid stream issues.
            const arrayBuffer = await file.arrayBuffer();
            const fileBody = new Uint8Array(arrayBuffer);

            const fileType = file.type;
            const fileSize = file.size;

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: path,
                Body: fileBody,
                ContentType: fileType,
                Metadata: metadata,
            });

            await this.client.send(command);

            return {
                url: this.getPublicUrl(path),
                path: path,
                metadata: {
                    size: fileSize,
                    type: fileType,
                    lastModified: Date.now()
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

export const r2Storage = new R2StorageService();
