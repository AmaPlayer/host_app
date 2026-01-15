// Media Compression Configuration
// Centralized configuration for image and video compression settings

export const MEDIA_COMPRESSION_CONFIG = {
    images: {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.70, // Reduced from 0.88 to achieve ~50% reduction
        maxSizeMB: 0.5, // Aggressive target: 500KB
        format: 'jpeg' as const,
        thumbnailSize: 400,
        thumbnailQuality: 0.75,
    },
    videos: {
        maxWidth: 1920,
        maxHeight: 1080,
        videoBitrate: 8000000, // 8 Mbps (Base target)
        minBitrate: 2500000,   // 2.5 Mbps (Minimum)
        maxBitrate: 25000000,   // 25 Mbps (Maximum - Increased for 4K/60fps support)
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
