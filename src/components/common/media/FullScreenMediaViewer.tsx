import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import ReactDOM from 'react-dom';
import './FullScreenMediaViewer.css';

interface FullScreenMediaViewerProps {
    src: string;
    type: 'image' | 'video';
    alt?: string;
    poster?: string;
    onClose: () => void;
}

const FullScreenMediaViewer: React.FC<FullScreenMediaViewerProps> = ({
    src,
    type,
    alt = 'Media',
    poster,
    onClose
}) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return ReactDOM.createPortal(
        <div className="fullscreen-media-overlay" onClick={onClose}>
            <button className="media-close-btn" onClick={onClose}>
                <X size={32} color="white" />
            </button>

            <div className="fullscreen-media-content" onClick={(e) => e.stopPropagation()}>
                {type === 'video' ? (
                    <video
                        src={src}
                        poster={poster}
                        controls
                        autoPlay
                        playsInline
                        className="fullscreen-video"
                    />
                ) : (
                    <img
                        src={src}
                        alt={alt}
                        className="fullscreen-image"
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default FullScreenMediaViewer;
