// Media Compression Configuration
// Centralized configuration for image and video compression settings

export const MEDIA_COMPRESSION_CONFIG = {
    images: {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.88,
        format: 'jpeg' as const,
        thumbnailSize: 400,
        thumbnailQuality: 0.75,
    },
    videos: {
        maxWidth: 1920,
        maxHeight: 1080,
        videoBitrate: 3000000, // 3 Mbps
        audioBitrate: 160000, // 160 kbps
        fps: 30,
    },
    limits: {
        maxOriginalSize: 50 * 1024 * 1024, // 50MB
        maxCompressedSize: 20 * 1024 * 1024, // 20MB
    },
    features: {
        enableImageCompression: true,
        enableVideoCompression: true,
        enableCompressionStats: true,
        showCompressionProgress: true,
    },
};

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    outputFormat?: ImageFormat;
    maintainAspectRatio?: boolean;
}

export interface VideoCompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    videoBitrate?: number;
    audioBitrate?: number;
    fps?: number;
}

export interface CompressionResult {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    file: File;
    metadata: {
        width?: number;
        height?: number;
        format?: string;
        duration?: number;
    };
}

export interface CompressionProgress {
    stage: 'analyzing' | 'compressing' | 'finalizing' | 'complete';
    progress: number; // 0-100
    message: string;
}
