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
// Native Video Compression using MediaRecorder
export async function compressVideo(
    file: File,
    options?: VideoCompressionOptions,
    onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
    const originalSize = file.size;
    const startTime = Date.now();

    try {
        // 1. Validate
        onProgress?.({ stage: 'analyzing', progress: 5, message: 'Analyzing video...' });

        // Check if MediaRecorder is supported
        if (typeof MediaRecorder === 'undefined') {
            throw new Error('MediaRecorder not supported');
        }

        // 2. Prepare Video Element
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);

        // Wait for metadata
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
        });

        // 3. Configure Smart Bitrate Calculation
        // Calculate original bitrate: (Size in bits) / (Duration in seconds)
        const duration = video.duration || 1; // avoid div by zero
        const originalBitrate = (originalSize * 8) / duration;

        // Config defaults
        const config = MEDIA_COMPRESSION_CONFIG.videos;
        const minBitrate = (config as any).minBitrate || 2500000;
        const maxBitrate = (config as any).maxBitrate || 8000000;

        // Target Original Bitrate (1.0).
        // Since we are likely converting H.264 -> VP9 (more efficient), matching the bitrate often yields excellent quality 
        // while still saving space due to container overhead removal and encoder efficiency.
        let calcBitrate = Math.floor(originalBitrate * 1.0);

        // Clamp
        calcBitrate = Math.max(minBitrate, Math.min(calcBitrate, maxBitrate));

        const targetBitrate = options?.videoBitrate || calcBitrate;
        const targetFps = options?.fps || config.fps || 30;

        console.log(`📊 Smart Bitrate: Original ${(originalBitrate / 1000000).toFixed(2)} Mbps -> Target ${(targetBitrate / 1000000).toFixed(2)} Mbps`);

        // Setup Stream & Recorder
        const stream = (video as any).captureStream ? (video as any).captureStream(targetFps) : (video as any).mozCaptureStream(targetFps);

        if (!stream) throw new Error('captureStream not supported');

        const mimeType = 'video/webm;codecs=vp9'; // efficient web compression
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            // Fallback to default if vp9 not supported
            console.warn('VP9 not supported, falling back to default WebM');
        }

        const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
            bitsPerSecond: targetBitrate
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        // 4. Record
        onProgress?.({ stage: 'compressing', progress: 10, message: 'Starting compression...' });

        const recordingPromise = new Promise<void>((resolve, reject) => {
            recorder.onstop = () => resolve();
            recorder.onerror = (e) => reject(e);
        });

        recorder.start(100); // 100ms chunks

        // Play video to feed recorder
        // We can try to speed it up slightly (e.g. 1.5x) but too fast might drop frames
        video.playbackRate = 1.5;
        await video.play();

        // Monitor progress
        const durationMs = video.duration * 1000;
        const progressInterval = setInterval(() => {
            const percent = Math.min(95, 10 + (video.currentTime / video.duration) * 85);
            onProgress?.({
                stage: 'compressing',
                progress: percent,
                message: `Compressing... ${Math.round(percent)}%`
            });
            if (video.ended) clearInterval(progressInterval);
        }, 500);

        // Wait for end
        await new Promise((resolve) => {
            video.onended = resolve;
        });

        // Stop
        recorder.stop();
        clearInterval(progressInterval);
        await recordingPromise;

        // Cleanup
        URL.revokeObjectURL(video.src);
        video.src = '';

        // 5. Finalize
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
            type: 'video/webm',
            lastModified: Date.now()
        });

        // Stats
        const compressedSize = compressedFile.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        const timeTaken = Date.now() - startTime;

        console.log(`✅ Video compressed in ${(timeTaken / 1000).toFixed(1)}s: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio.toFixed(1)}% saved)`);

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Compression complete'
        });

        return {
            originalSize,
            compressedSize,
            compressionRatio,
            file: compressedFile,
            metadata: {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                format: 'video/webm'
            }
        };

    } catch (error) {
        console.error('❌ Video compression failed, using original:', error);
        // Fallback to original
        return {
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 0,
            file: file,
            metadata: await getVideoMetadata(file)
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
