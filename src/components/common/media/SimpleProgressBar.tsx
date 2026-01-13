import React, { useRef } from 'react';
import './SimpleProgressBar.css';

interface SimpleProgressBarProps {
  currentTime?: number;
  duration?: number;
  percentage?: number;
  onSeek?: (time: number) => void;
  showTime?: boolean;
  showPercentage?: boolean;
  className?: string;
  interactive?: boolean;
}

const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({
  currentTime,
  duration,
  percentage,
  onSeek,
  showTime = true,
  showPercentage = false,
  className = '',
  interactive = true
}) => {
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return;
    if (!progressTrackRef.current) return;

    // For time-based progress
    if (duration !== undefined && isFinite(duration) && duration > 0) {
      const rect = progressTrackRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const position = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = position * duration;
      onSeek(newTime);
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    percentage !== undefined
      ? percentage
      : (duration !== undefined && duration > 0 && currentTime !== undefined)
        ? (currentTime / duration) * 100
        : 0;

  return (
    <div className={`simple-progress-bar ${className}`}>
      <div
        className={`simple-progress-track ${!interactive ? 'non-interactive' : ''}`}
        ref={progressTrackRef}
        onClick={handleProgressClick}
        role="slider"
        aria-label={percentage !== undefined ? "Progress" : "Video progress"}
        aria-valuemin={0}
        aria-valuemax={percentage !== undefined ? 100 : duration}
        aria-valuenow={percentage !== undefined ? percentage : currentTime}
      >
        <div
          className="simple-progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
        />
      </div>
      {showTime && currentTime !== undefined && duration !== undefined && (
        <div className="simple-progress-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}
      {showPercentage && (
        <div className="simple-progress-percentage">
          {Math.round(progressPercentage)}%
        </div>
      )}
    </div>
  );
};

export default SimpleProgressBar;
