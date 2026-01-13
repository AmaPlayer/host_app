

export interface UploadResult {
    url: string;
    path: string;
    metadata?: {
        size: number;
        type: string;
        lastModified?: number;
        eTag?: string;
        // Compression metadata
        originalSize?: number;
        compressionRatio?: number;
        compressed?: boolean;
    };
}

export interface UploadOptions {
    compress?: boolean;
    compressionOptions?: {
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
    };
    onProgress?: (progress: number) => void;
}

export interface StorageService {
    /**
     * Upload a file to storage
     * @param path Target path in storage (e.g., 'users/123/profile.jpg')
     * @param file File, Blob, or Buffer to upload
     * @param metadata Optional metadata to attach
     * @param options Optional upload options including compression
     */
    uploadFile(
        path: string,
        file: File | Blob | Buffer,
        metadata?: Record<string, string>,
        options?: UploadOptions
    ): Promise<UploadResult>;

    /**
     * Get signature/URL for client-side upload (if supported)
     * Useful for large videos to avoid server bottleneck, but for R2 we might use presigned URLs
     */
    getUploadUrl?(path: string, contentType: string): Promise<string>;

    /**
     * Delete a file from storage
     * @param path Path to delete
     */
    deleteFile(path: string): Promise<void>;

    /**
     * Get a public URL for a file
     * @param path Path to file
     */
    getPublicUrl(path: string): string;
}
