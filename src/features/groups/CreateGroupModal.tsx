
import React, { useState } from 'react';
import { X, Upload, Users, Lock, Globe } from 'lucide-react';
import groupsService from '../../services/supabase/groupsService';
import { useAuth } from '../../contexts/AuthContext';

import './CreateGroupModal.css';

interface CreateGroupModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSuccess }) => {
    const { currentUser: user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [photoURL, setPhotoURL] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            await groupsService.createGroup(user.uid, {
                name,
                description,
                privacy,
                photoURL: photoURL || null
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Create New Group</h2>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    {/* Group Icon / Photo */}
                    <div className="avatar-section">
                        <div className="avatar-wrapper group">
                            <div className="avatar-preview">
                                {photoURL ? (
                                    <img src={photoURL} alt="Group" />
                                ) : (
                                    <Users size={32} color="#6b7280" />
                                )}
                            </div>
                            <div className="avatar-overlay">
                                <Upload size={20} color="white" />
                            </div>
                            <input
                                type="text"
                                placeholder="Enter Photo URL (optional)"
                                className="avatar-url-input"
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Group Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="form-input-field"
                            placeholder="e.g. AmaPlayer Fans"
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="form-input-field form-textarea-field"
                            placeholder="What's this group about?"
                        />
                    </div>

                    <div className="form-group">
                        <label>Privacy Settings</label>
                        <div className="privacy-grid">
                            <button
                                type="button"
                                onClick={() => setPrivacy('public')}
                                className={`privacy-card ${privacy === 'public' ? 'active' : ''}`}
                            >
                                <Globe size={24} className="privacy-card-icon" />
                                <span className="privacy-title">Public</span>
                                <span className="privacy-description">Anyone can find and join</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPrivacy('private')}
                                className={`privacy-card ${privacy === 'private' ? 'active' : ''}`}
                            >
                                <Lock size={24} className="privacy-card-icon" />
                                <span className="privacy-title">Private</span>
                                <span className="privacy-description">Only members can see posts</span>
                            </button>
                        </div>
                    </div>

                    <div className="submit-btn-container">
                        <button
                            type="submit"
                            disabled={loading}
                            className="submit-btn"
                        >
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
