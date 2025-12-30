import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { UserRole, PersonalDetails, Achievement, Certificate, Post, roleConfigurations } from '../types/ProfileTypes';
import { TalentVideo } from '../types/TalentVideoTypes';
import '../styles/RealTimePreview.css';

interface RealTimePreviewProps {
  currentRole: UserRole;
  personalDetails: PersonalDetails;
  achievements: Achievement[];
  certificates: Certificate[];
  talentVideos: TalentVideo[];
  posts: Post[];
  isVisible: boolean;
  onToggleVisibility: (visible: boolean) => void;
  className?: string;
}

/**
 * RealTimePreview provides a live preview of profile changes
 * as users edit their information, showing exactly how their
 * profile will appear to others.
 */
const RealTimePreview: React.FC<RealTimePreviewProps> = ({
  currentRole,
  personalDetails,
  achievements,
  certificates,
  talentVideos,
  posts,
  isVisible,
  onToggleVisibility,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewMode, setPreviewMode] = useState<'compact' | 'full'>('compact');

  const roleConfig = roleConfigurations[currentRole];

  // Calculate profile completeness
  const completeness = useMemo(() => {
    let totalFields = 0;
    let filledFields = 0;
    
    // Count personal details
    roleConfig.editableFields.forEach(field => {
      totalFields++;
      const value = personalDetails[field as keyof PersonalDetails];
      if (value !== undefined && value !== null && value !== '') {
        filledFields++;
      }
    });
    
    // Count sections with content
    const sectionsWithContent = [
      achievements.length > 0,
      certificates.length > 0,
      talentVideos.length > 0,
      posts.length > 0
    ].filter(Boolean).length;
    
    const totalSections = roleConfig.sections.filter(s => 
      ['achievements', 'certificates', 'talentVideos', 'posts'].includes(s)
    ).length;
    
    totalFields += totalSections;
    filledFields += sectionsWithContent;
    
    return Math.round((filledFields / totalFields) * 100);
  }, [personalDetails, achievements, certificates, talentVideos, posts, roleConfig]);

  // Get preview stats
  const stats = useMemo(() => ({
    achievements: achievements.length,
    certificates: certificates.length,
    videos: talentVideos.length,
    posts: posts.length
  }), [achievements.length, certificates.length, talentVideos.length, posts.length]);

  // Format field values for display
  const formatFieldValue = (field: string, value: any): string => {
    if (value === undefined || value === null || value === '') {
      return 'Not specified';
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Not specified';
    }
    
    if (field === 'age' && typeof value === 'number') {
      return `${value} years old`;
    }
    
    if (field === 'yearsExperience' && typeof value === 'number') {
      return `${value} years`;
    }
    
    return String(value);
  };

  // Get recent activity
  const recentActivity = useMemo(() => {
    const activities = [
      ...achievements.map(a => ({ type: 'achievement', title: a.title, date: new Date(a.dateEarned) })),
      ...certificates.map(c => ({ type: 'certificate', title: c.name, date: new Date(c.dateIssued) })),
      ...talentVideos.map(v => ({ type: 'video', title: v.title, date: new Date(v.uploadDate) })),
      ...posts.map(p => ({ type: 'post', title: p.title || 'Untitled Post', date: new Date(p.createdDate) }))
    ];
    
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);
  }, [achievements, certificates, talentVideos, posts]);

  if (!isVisible) {
    return (
      <div className={`preview-toggle-button ${className}`}>
        <button
          onClick={() => onToggleVisibility(true)}
          className="toggle-preview-btn"
          aria-label="Show preview"
        >
          <Eye size={16} />
          Show Preview
        </button>
      </div>
    );
  }

  return (
    <div className={`real-time-preview ${isExpanded ? 'expanded' : ''} ${className}`}>
      <div className="preview-header">
        <div className="preview-header-left">
          <h4 className="preview-title">
            <Eye size={16} />
            Live Preview
          </h4>
          <div className="completeness-indicator">
            <div className="completeness-bar">
              <div 
                className="completeness-fill" 
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="completeness-text">{completeness}% complete</span>
          </div>
        </div>
        <div className="preview-controls">
          <button
            onClick={() => setPreviewMode(previewMode === 'compact' ? 'full' : 'compact')}
            className="preview-control-btn"
            aria-label={`Switch to ${previewMode === 'compact' ? 'full' : 'compact'} preview`}
          >
            {previewMode === 'compact' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="preview-control-btn"
            aria-label={isExpanded ? 'Collapse preview' : 'Expand preview'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => onToggleVisibility(false)}
            className="preview-control-btn"
            aria-label="Hide preview"
          >
            <EyeOff size={14} />
          </button>
        </div>
      </div>

      <div className="preview-content">
        {previewMode === 'compact' ? (
          <div className="preview-compact">
            <div className="preview-profile-header">
              <div className="preview-avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <div className="preview-info">
                <h3 className="preview-name">{personalDetails.name || 'Your Name'}</h3>
                <span className="preview-role">{roleConfig.displayName}</span>
              </div>
            </div>
            
            <div className="preview-stats-grid">
              {roleConfig.sections.includes('achievements') && (
                <div className="preview-stat">
                  <span className="stat-number">{stats.achievements}</span>
                  <span className="stat-label">Achievements</span>
                </div>
              )}
              {roleConfig.sections.includes('certificates') && (
                <div className="preview-stat">
                  <span className="stat-number">{stats.certificates}</span>
                  <span className="stat-label">Certificates</span>
                </div>
              )}
              {roleConfig.sections.includes('talentVideos') && (
                <div className="preview-stat">
                  <span className="stat-number">{stats.videos}</span>
                  <span className="stat-label">Videos</span>
                </div>
              )}
              {roleConfig.sections.includes('posts') && (
                <div className="preview-stat">
                  <span className="stat-number">{stats.posts}</span>
                  <span className="stat-label">Posts</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="preview-full">
            <div className="preview-profile-header">
              <div className="preview-avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <div className="preview-info">
                <h3 className="preview-name">{personalDetails.name || 'Your Name'}</h3>
                <span className="preview-role">{roleConfig.displayName}</span>
              </div>
            </div>

            <div className="preview-details-section">
              <h5 className="preview-section-title">Personal Details</h5>
              <div className="preview-details-grid">
                {roleConfig.editableFields.map(field => {
                  if (field === 'username') return null; // Skip username as it's in header
                  
                  const value = personalDetails[field as keyof PersonalDetails];
                  const displayValue = formatFieldValue(field, value);
                  
                  return (
                    <div key={field} className="preview-detail-item">
                      <span className="detail-label">{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                      <span className="detail-value">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {recentActivity.length > 0 && (
              <div className="preview-activity-section">
                <h5 className="preview-section-title">Recent Activity</h5>
                <div className="preview-activity-list">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="preview-activity-item">
                      <span className="activity-type">{activity.type}</span>
                      <span className="activity-title">{activity.title}</span>
                      <span className="activity-date">{activity.date.toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimePreview;