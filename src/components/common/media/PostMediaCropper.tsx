import React, { useState, useCallback, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { extractVideoFrame } from '../../../utils/media/videoFrameExtractor';
import './PostMediaCropper.css';

type Point = { x: number; y: number };
type Area = { x: number; y: number; width: number; height: number };

export interface VideoCropData {
  x: number;        // Normalized 0-1
  y: number;        // Normalized 0-1
  width: number;    // Normalized 0-1
  height: number;   // Normalized 0-1
  aspectRatio: number;
}

export interface CropResult {
  type: 'image' | 'video';
  blob?: Blob;              // For images: cropped JPEG
  cropData?: VideoCropData;  // For videos: crop coordinates
}

interface PostMediaCropperProps {
  file: File;
  onCrop: (result: CropResult) => void;
  onCancel: () => void;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = 1080,
  outputHeight: number = 1080
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to desired output size
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.92);
  });
}

const PostMediaCropper: React.FC<PostMediaCropperProps> = ({
  file,
  onCrop,
  onCancel,
  aspectRatio = 1,
  outputWidth = 1080,
  outputHeight = 1080
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaSrc, setMediaSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  // Load media source (image directly or extract video frame)
  useEffect(() => {
    let isMounted = true;

    const loadMedia = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (isImage) {
          // For images, create object URL directly
          const url = URL.createObjectURL(file);
          if (isMounted) {
            setMediaSrc(url);
            setIsLoading(false);
          }
        } else if (isVideo) {
          // For videos, extract first frame
          const frameDataUrl = await extractVideoFrame(file);
          if (isMounted) {
            setMediaSrc(frameDataUrl);
            setIsLoading(false);
          }
        } else {
          throw new Error('Unsupported file type');
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load media. Please try again.');
          setIsLoading(false);
          console.error('Error loading media:', err);
        }
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (mediaSrc && mediaSrc.startsWith('blob:')) {
        URL.revokeObjectURL(mediaSrc);
      }
    };
  }, [file, isImage, isVideo]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedArea);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels || !croppedArea) return;

    setIsProcessing(true);
    try {
      if (isImage) {
        // For images: physically crop the image to 1080x1080
        const croppedBlob = await getCroppedImg(
          mediaSrc,
          croppedAreaPixels,
          outputWidth,
          outputHeight
        );
        onCrop({
          type: 'image',
          blob: croppedBlob
        });
      } else if (isVideo) {
        // For videos: return normalized crop coordinates
        const videoCropData: VideoCropData = {
          x: croppedArea.x / 100,
          y: croppedArea.y / 100,
          width: croppedArea.width / 100,
          height: croppedArea.height / 100,
          aspectRatio: aspectRatio
        };
        onCrop({
          type: 'video',
          cropData: videoCropData
        });
      }
    } catch (error) {
      console.error('Error cropping media:', error);
      alert('Failed to crop media. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="post-media-cropper-modal">
      <div className="post-media-cropper-overlay" onClick={onCancel}></div>
      <div className="post-media-cropper-container">
        <div className="post-media-cropper-header">
          <h3>
            {isImage ? 'Crop Your Image' : 'Position Your Video'}
          </h3>
          <button
            className="post-media-cropper-close"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="post-media-cropper-content">
          {isLoading && (
            <div className="post-media-cropper-loading">
              <div className="loading-spinner"></div>
              <p>Loading {isImage ? 'image' : 'video'}...</p>
            </div>
          )}

          {error && (
            <div className="post-media-cropper-error">
              <p>{error}</p>
              <button onClick={onCancel} className="error-close-btn">
                Close
              </button>
            </div>
          )}

          {!isLoading && !error && mediaSrc && (
            <>
              <div className="post-media-cropper-area">
                <Cropper
                  image={mediaSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                  objectFit="contain"
                />
              </div>

              <div className="post-media-cropper-controls">
                <div className="zoom-control">
                  <label>Zoom</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="zoom-slider"
                    disabled={isProcessing}
                  />
                </div>
                <p className="crop-instruction">
                  {isImage
                    ? 'Drag to reposition • Pinch or use slider to zoom'
                    : `Position the frame area you want to show • Video will be cropped to ${aspectRatio === 1 ? '1:1 square' : 'selected aspect ratio'}`
                  }
                </p>
              </div>
            </>
          )}
        </div>

        <div className="post-media-cropper-footer">
          <button
            className="post-media-cropper-btn secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="post-media-cropper-btn primary"
            onClick={handleCrop}
            disabled={isProcessing || isLoading || !!error}
          >
            {isProcessing ? (
              <>
                <div className="btn-spinner"></div>
                Processing...
              </>
            ) : (
              <>
                <Check size={16} />
                Crop & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostMediaCropper;
