import React, { useState, useRef, useEffect } from 'react';
import { Copy, Share2, MessageCircle, Mail, Link, Check } from 'lucide-react';
import { useTouchGestures } from '../../../hooks/useTouchGestures';
import './VideoShare.css';

interface VideoShareProps {
  momentId: string;
  videoUrl: string;
  caption: string;
  creatorName: string;
  isVisible: boolean;
  onClose: () => void;
  onShare?: (platform: string) => void;
}

/**
 * VideoShare Component
 * 
 * Provides sharing options for video moments including copy link,
 * social media sharing, and direct messaging.
 */
const VideoShare: React.FC<VideoShareProps> = ({
  momentId,
  videoUrl,
  caption,
  creatorName,
  isVisible,
  onClose,
  onShare
}) => {
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate share URL (in a real app, this would be your app's URL)
  const shareUrl = `${window.location.origin}/moments/${momentId}`;
  const shareText = `Check out this moment by ${creatorName}: ${caption}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShare?.('copy_link');

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      onShare?.('copy_link');

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleSocialShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    let shareLink = '';

    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${encodeURIComponent(`Moment by ${creatorName}`)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
      default:
        return;
    }

    window.open(shareLink, '_blank', 'noopener,noreferrer');
    onShare?.(platform);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Moment by ${creatorName}`,
          text: shareText,
          url: shareUrl
        });
        onShare?.('native_share');
      } catch (err) {
        console.error('Native share failed:', err);
      }
    }
  };

  // Touch gestures for swipe-to-close
  const { attachGestures } = useTouchGestures({
    onSwipeDown: onClose,
    minSwipeDistance: 50
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container && isVisible) {
      return attachGestures(container);
    }
  }, [isVisible, attachGestures]);

  // Auto-focus and focus trap when share modal opens
  useEffect(() => {
    if (isVisible) {
      // Focus the close button initially for better accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      // Add keyboard event listener for focus trap and escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Simple focus trap
        if (e.key === 'Tab') {
          const container = containerRef.current;
          if (!container) return;

          const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="video-share-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      aria-describedby="share-description"
    >
      <div className="video-share-container" ref={containerRef}>
        <div className="share-header">
          <h3 id="share-title">Share this moment</h3>
          <button
            ref={closeButtonRef}
            className="close-share-btn"
            onClick={onClose}
            aria-label="Close share dialog"
            tabIndex={0}
          >
            ×
          </button>
        </div>

        <div className="share-content" id="share-description">
          <div className="share-preview" role="region" aria-label="Video preview">
            <div className="share-preview-text">
              <p className="share-creator">By {creatorName}</p>
              {caption && (
                <p className="share-caption">{caption}</p>
              )}
            </div>
          </div>

          <div className="share-options" role="group" aria-label="Share options">
            {/* Copy Link */}
            <button
              className="share-option"
              onClick={handleCopyLink}
              aria-label={copied ? "Link copied to clipboard" : "Copy link to clipboard"}
              tabIndex={0}
            >
              <div className="share-option-icon" aria-hidden="true">
                {copied ? <Check size={24} /> : <Copy size={24} />}
              </div>
              <span className="share-option-label">
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>

            {/* Native Share (if supported) */}
            {navigator.share && (
              <button
                className="share-option"
                onClick={handleNativeShare}
                aria-label="Share via system share menu"
                tabIndex={0}
              >
                <div className="share-option-icon" aria-hidden="true">
                  <Share2 size={24} />
                </div>
                <span className="share-option-label">Share</span>
              </button>
            )}

            {/* WhatsApp */}
            <button
              className="share-option"
              onClick={() => handleSocialShare('whatsapp')}
              aria-label="Share on WhatsApp"
              tabIndex={0}
            >
              <div className="share-option-icon whatsapp">
                <MessageCircle size={24} />
              </div>
              <span className="share-option-label">WhatsApp</span>
            </button>

            {/* Twitter */}
            <button
              className="share-option"
              onClick={() => handleSocialShare('twitter')}
              aria-label="Share on Twitter"
              tabIndex={0}
            >
              <div className="share-option-icon twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </div>
              <span className="share-option-label">Twitter</span>
            </button>

            {/* Facebook */}
            <button
              className="share-option"
              onClick={() => handleSocialShare('facebook')}
              aria-label="Share on Facebook"
              tabIndex={0}
            >
              <div className="share-option-icon facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <span className="share-option-label">Facebook</span>
            </button>

            {/* Telegram */}
            <button
              className="share-option"
              onClick={() => handleSocialShare('telegram')}
              aria-label="Share on Telegram"
              tabIndex={0}
            >
              <div className="share-option-icon telegram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <span className="share-option-label">Telegram</span>
            </button>

            {/* Email */}
            <button
              className="share-option"
              onClick={() => handleSocialShare('email')}
              aria-label="Share via email"
              tabIndex={0}
            >
              <div className="share-option-icon">
                <Mail size={24} />
              </div>
              <span className="share-option-label">Email</span>
            </button>
          </div>

          <div className="share-url-container">
            <div className="share-url-input-container">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="share-url-input"
                aria-label="Share URL"
              />
              <button
                className="copy-url-btn"
                onClick={handleCopyLink}
                aria-label="Copy URL to clipboard"
                tabIndex={0}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoShare;