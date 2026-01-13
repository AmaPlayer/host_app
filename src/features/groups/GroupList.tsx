
import React, { useEffect, useState } from 'react';
import { Plus, Search, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import groupsService from '../../services/supabase/groupsService';
import { useAuth } from '../../contexts/AuthContext';
import { Group } from '../../types/models/group';
import CreateGroupModal from './CreateGroupModal';

import './GroupList.css';

const GroupList: React.FC = () => {
    const { currentUser: user } = useAuth();
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchGroups = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const list = await groupsService.searchGroups(user.uid, searchTerm);
            setGroups(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [user, searchTerm]);

    return (
        <div className="groups-container">
            <div className="groups-header">
                <div className="groups-title">
                    <h2>Your Communities</h2>
                    <p>Join the conversation</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="create-group-btn"
                >
                    <Plus size={16} />
                    <span>New Group</span>
                </button>
            </div>

            {/* Search */}
            <div className="groups-search-container">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="groups-search-input"
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner-custom"></div>
                    <p className="loading-text">Loading communities...</p>
                </div>
            ) : groups.length > 0 ? (
                <div className="groups-grid">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            onClick={() => navigate(`/groups/${group.id}`)}
                            className="group-card"
                        >
                            <div className="group-avatar">
                                {group.photoURL ? (
                                    <img src={group.photoURL} alt={group.name} />
                                ) : (
                                    <Users size={20} color="#9ca3af" />
                                )}
                            </div>

                            <div className="group-info">
                                <div className="group-header-row">
                                    <h3 className="group-name">{group.name}</h3>
                                    {group.privacy === 'private' && (
                                        <span className="private-badge">Private</span>
                                    )}
                                </div>
                                <p className="group-description">
                                    {group.description || 'No description'}
                                </p>
                                <div className="group-meta">
                                    <span className="member-count">
                                        <Users size={12} />
                                        {group.memberCount} members
                                    </span>
                                </div>
                            </div>

                            <ArrowRight size={16} className="arrow-icon" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state-container">
                    <Users size={32} className="empty-icon" />
                    <h3 className="empty-title">No groups found</h3>
                    <p className="empty-subtitle">Start a new community today.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="create-link"
                    >
                        Create Group
                    </button>
                </div>
            )}

            {showCreateModal && (
                <CreateGroupModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchGroups}
                />
            )}
        </div>
    );
};

export default GroupList;
