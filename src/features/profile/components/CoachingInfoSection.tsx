import React from 'react';
import { Edit3, Award, Clock, Target, Users } from 'lucide-react';
import { PersonalDetails } from '../types/ProfileTypes';
import '../styles/CoachingInfoSection.css';

interface CoachingInfoSectionProps {
  personalDetails: PersonalDetails;
  isOwner: boolean;
  onEdit: () => void;
}

const CoachingInfoSection: React.FC<CoachingInfoSectionProps> = ({
  personalDetails,
  isOwner,
  onEdit
}) => {
  const getFieldValue = (value: any): string => {
    if (value === undefined || value === null || value === '') {
      return 'Not specified';
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'Not specified';
    }
    return String(value);
  };

  const hasCoachingInfo = personalDetails.specializations?.length || 
                         personalDetails.yearsExperience || 
                         personalDetails.coachingLevel;

  const specializations = personalDetails.specializations || [];

  return (
    <section className="profile-section coaching-info-section" aria-labelledby="coaching-info-heading">
      <div className="section-header">
        <h2 id="coaching-info-heading" className="section-title">
          Coaching Information
        </h2>
        {isOwner && (
          <button
            className="section-action"
            onClick={onEdit}
            aria-label="Edit coaching information"
            type="button"
          >
            <Edit3 size={16} aria-hidden="true" />
            <span>Edit</span>
          </button>
        )}
      </div>

      <div className="section-content">
        {!hasCoachingInfo ? (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" aria-hidden="true" />
            <p className="empty-state-text">No coaching information added yet</p>
            <p className="empty-state-description">
              Add your coaching experience, specializations, and qualifications
            </p>
            {isOwner && (
              <button
                className="empty-state-button"
                onClick={onEdit}
                type="button"
              >
                Add Coaching Info
              </button>
            )}
          </div>
        ) : (
          <div className="coaching-info-grid">
            {personalDetails.yearsExperience && (
              <div className="info-item">
                <div className="info-icon">
                  <Clock size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Years of Experience</span>
                  <span className="info-value">
                    {personalDetails.yearsExperience} {personalDetails.yearsExperience === 1 ? 'year' : 'years'}
                  </span>
                </div>
              </div>
            )}

            {personalDetails.coachingLevel && (
              <div className="info-item">
                <div className="info-icon">
                  <Award size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Coaching Level</span>
                  <span className="info-value">{personalDetails.coachingLevel}</span>
                </div>
              </div>
            )}

            {specializations.length > 0 && (
              <div className="info-item specializations-item">
                <div className="info-icon">
                  <Target size={20} aria-hidden="true" />
                </div>
                <div className="info-content">
                  <span className="info-label">Specializations</span>
                  <div className="specializations-list">
                    {specializations.map((specialization, index) => (
                      <span key={index} className="specialization-tag">
                        {specialization}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoachingInfoSection;