import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Video, FileVideo, Trash2 } from 'lucide-react';
import { TalentVideo, VideoFormData } from '../types/TalentVideoTypes';
import { SPORTS_CONFIG } from '../../athlete-onboarding/data/sportsConfig';
import {
  getVideoSkillsForSport,
  hasSportSpecificSkills,
  genericSkillCategories
} from '../data/videoSkillsConfig';
import SearchableDropdown from '../../../components/common/ui/SearchableDropdown';
import '../styles/VideoManagementModal.css';

interface VideoManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: VideoFormData) => void;
  editingVideo?: TalentVideo | null;
  isLoading?: boolean;
  athleteSports?: Array<{ id: string; name: string }>; // Athlete's selected sports from profile
}

const VideoManagementModal: React.FC<VideoManagementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVideo,
  isLoading = false,
  athleteSports = []
}) => {
  const [formData, setFormData] = useState<VideoFormData>({
    title: editingVideo?.title || '',
    description: editingVideo?.description || '',
    sport: editingVideo?.sport || '',
    sportName: editingVideo?.sportName || '',
    mainCategory: editingVideo?.mainCategory || '',
    mainCategoryName: editingVideo?.mainCategoryName || '',
    specificSkill: editingVideo?.specificSkill || '',
    skillCategory: editingVideo?.skillCategory || '',
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(
    editingVideo?.videoUrl || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragActive, setIsDragActive] = useState(false);

  // Dynamic options based on selections
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [useSportSpecific, setUseSportSpecific] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get available sports (athlete's sports + all sports from config)
  const availableSports = React.useMemo(() => {
    let sports = [];
    if (athleteSports.length > 0) {
      sports = athleteSports;
    } else {
      // Fallback to all sports if athlete hasn't selected any
      sports = Object.values(SPORTS_CONFIG).map((sport: any) => ({
        id: sport.id,
        name: sport.name
      }));
    }
    // Format for SearchableDropdown
    return sports.map(s => ({ id: s.id, name: s.name }));
  }, [athleteSports]);

  // Update available categories when sport changes
  useEffect(() => {
    if (formData.sport) {
      const sportHasSpecificSkills = hasSportSpecificSkills(formData.sport);
      setUseSportSpecific(sportHasSpecificSkills);

      if (sportHasSpecificSkills) {
        const categories = getVideoSkillsForSport(formData.sport);
        setAvailableCategories(categories);
      } else {
        // Use generic categories
        setAvailableCategories(genericSkillCategories);
      }

      // Reset dependent fields when sport changes
      if (formData.sport !== editingVideo?.sport) {
        setFormData(prev => ({
          ...prev,
          mainCategory: '',
          mainCategoryName: '',
          specificSkill: '',
        }));
        setAvailableSkills([]);
      }
    } else {
      setAvailableCategories([]);
      setAvailableSkills([]);
      setUseSportSpecific(false);
    }
  }, [formData.sport, editingVideo?.sport]);

  // Update available skills when category changes
  useEffect(() => {
    if (formData.mainCategory && useSportSpecific) {
      const category = availableCategories.find(cat => cat.id === formData.mainCategory);
      if (category) {
        setAvailableSkills(category.skills);
      }

      // Reset specific skill when category changes
      if (formData.mainCategory !== editingVideo?.mainCategory) {
        setFormData(prev => ({
          ...prev,
          specificSkill: '',
        }));
      }
    } else {
      setAvailableSkills([]);
    }
  }, [formData.mainCategory, useSportSpecific, availableCategories, editingVideo?.mainCategory]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'sport') {
      const selectedSport = availableSports.find(sport => sport.id === value);
      setFormData(prev => ({
        ...prev,
        sport: value,
        sportName: selectedSport?.name || value,
      }));
    } else if (field === 'mainCategory') {
      const selectedCategory = availableCategories.find(cat => cat.id === value);
      setFormData(prev => ({
        ...prev,
        mainCategory: value,
        mainCategoryName: selectedCategory?.name || value,
      }));
    } else if (field === 'skillCategory') {
      // Allow direct string value or find from generic categories
      setFormData(prev => ({ ...prev, skillCategory: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrors(prev => ({ ...prev, video: 'Please select a valid video file' }));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: 'Video file must be less than 50MB' }));
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, video: '' }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const removeVideo = () => {
    if (videoPreview && !editingVideo) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.sport) {
      newErrors.sport = 'Sport is required';
    }

    // Validate based on whether sport has specific skills or not
    if (useSportSpecific) {
      if (!formData.mainCategory) {
        newErrors.mainCategory = 'Category is required';
      }
      if (!formData.specificSkill) {
        newErrors.specificSkill = 'Specific skill is required';
      }
    } else {
      // Generic categories for sports without specific skills
      if (!formData.skillCategory) {
        newErrors.skillCategory = 'Skill category is required';
      }
    }

    if (!editingVideo && !videoFile) {
      newErrors.video = 'Video file is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: VideoFormData = {
      ...formData,
      videoFile: videoFile || undefined
    };

    onSave(submitData);
  };

  const handleClose = () => {
    if (videoPreview && !editingVideo) {
      URL.revokeObjectURL(videoPreview);
    }
    setFormData({
      title: '',
      description: '',
      sport: '',
      sportName: '',
      mainCategory: '',
      mainCategoryName: '',
      specificSkill: '',
      skillCategory: '',
    });
    setVideoFile(null);
    setVideoPreview(null);
    setErrors({});
    setAvailableCategories([]);
    setAvailableSkills([]);
    setUseSportSpecific(false);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="video-management-overlay"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="video-management-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {editingVideo ? 'Edit Video' : 'Add New Video'}
          </h2>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="video-form">
          <div className="form-layout">
            {/* Left Column - Details */}
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="title" className="form-label">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`form-input modern-input ${errors.title ? 'error' : ''}`}
                  placeholder="Give your video a catchy title"
                  disabled={isLoading}
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Sport & Category</label>
                <SearchableDropdown
                  options={availableSports}
                  value={formData.sport}
                  onChange={(val) => handleDropdownChange('sport', val)}
                  placeholder="Select Sport"
                  disabled={isLoading}
                  error={errors.sport}
                  className="mb-3"
                />

                {/* Conditional Cascading Dropdowns */}
                {formData.sport && useSportSpecific ? (
                  <div className="nested-dropdowns">
                    <SearchableDropdown
                      options={availableCategories.map(c => ({ id: c.id, name: c.name }))}
                      value={formData.mainCategory}
                      onChange={(val) => handleDropdownChange('mainCategory', val)}
                      placeholder="Select Category"
                      disabled={isLoading}
                      error={errors.mainCategory}
                      className="mb-3"
                    />

                    <SearchableDropdown
                      options={availableSkills.map(s => ({ id: s, name: s }))}
                      value={formData.specificSkill}
                      onChange={(val) => handleDropdownChange('specificSkill', val)}
                      placeholder="Select Specific Skill"
                      disabled={isLoading || !formData.mainCategory}
                      error={errors.specificSkill}
                    />
                  </div>
                ) : formData.sport ? (
                  <SearchableDropdown
                    options={availableCategories.map(c => ({ id: c.name, name: c.name }))} // generic categories
                    value={formData.skillCategory}
                    onChange={(val) => handleDropdownChange('skillCategory', val)}
                    placeholder="Select Skill Category"
                    disabled={isLoading}
                    error={errors.skillCategory}
                  />
                ) : null}
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`form-textarea modern-textarea ${errors.description ? 'error' : ''}`}
                  placeholder="Tell us about this clip..."
                  rows={4}
                  disabled={isLoading}
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </div>
            </div>

            {/* Right Column - Upload */}
            <div className="form-column upload-column">
              <label className="form-label">Video File</label>

              <div
                className={`drag-drop-zone ${isDragActive ? 'active' : ''} ${errors.video ? 'error' : ''} ${videoPreview ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !videoPreview && fileInputRef.current?.click()}
              >
                {videoPreview ? (
                  <div className="video-preview-container">
                    <video
                      src={videoPreview}
                      className="preview-video-element"
                      controls
                      preload="metadata"
                    />
                    <button
                      type="button"
                      className="remove-video-btn"
                      onClick={(e) => { e.stopPropagation(); removeVideo(); }}
                      title="Remove video"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder-content">
                    <div className="upload-icon-circle">
                      <Upload size={24} color="#20B2AA" />
                    </div>
                    <p className="upload-title">Drag & Drop Video</p>
                    <p className="upload-subtitle">or click to browse</p>
                    <span className="upload-limits">MP4, MOV up to 50MB</span>
                  </div>
                )}

                {isLoading && (
                  <div className="upload-loading-overlay">
                    <div className="spinner"></div>
                    <span>Processing...</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden-file-input"
                disabled={isLoading}
              />
              {errors.video && <span className="error-message centered">{errors.video}</span>}
            </div>
          </div>

          <div className="modal-actions modern-actions">
            <button
              type="button"
              className="btn-text"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              disabled={isLoading}
            >
              {isLoading ? 'Uploading...' : (editingVideo ? 'Save Changes' : 'Upload Video')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoManagementModal;