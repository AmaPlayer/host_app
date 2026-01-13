
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, LogOut, Lock, UserPlus } from 'lucide-react';
import { X } from 'lucide-react';
import groupsService from '../../services/supabase/groupsService';
import { useAuth } from '../../contexts/AuthContext';
import { GroupDetails as IGroupDetails } from '../../types/models/group';
import GroupChat from '../../features/messaging/components/GroupChat';
import InviteMembersModal from './components/InviteMembersModal';

import './GroupDetails.css';

const GroupDetails: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const { currentUser: user } = useAuth();
    const navigate = useNavigate();
    const [group, setGroup] = useState<IGroupDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [joining, setJoining] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    useEffect(() => {
        if (!groupId || !user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [details, memberCheck] = await Promise.all([
                    groupsService.getGroupDetails(groupId),
                    groupsService.isMember(user.uid, groupId)
                ]);
                setGroup(details);
                setIsMember(memberCheck);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [groupId, user]);

    const handleJoin = async () => {
        if (!user || !groupId) return;
        setJoining(true);
        try {
            await groupsService.joinGroup(user.uid, groupId);
            setIsMember(true);
            // Refresh details for member count
            const details = await groupsService.getGroupDetails(groupId);
            setGroup(details);
        } catch (e) {
            console.error(e);
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = async () => {
        if (!user || !groupId) return;
        if (!window.confirm('Are you sure you want to leave?')) return;
        try {
            await groupsService.leaveGroup(user.uid, groupId);
            setIsMember(false);
            navigate('/groups');
        } catch (e) {
            console.error(e);
        }
    };

    const handleInvite = async (userIds: string[]) => {
        if (!groupId) return;
        await groupsService.addMembers(groupId, userIds);
        // Refresh group details to update member count
        const details = await groupsService.getGroupDetails(groupId);
        if (details) setGroup(details);
    };

    if (loading) return <div className="loading-chat">Loading...</div>;
    if (!group) return <div className="loading-chat">Group not found</div>;

    return (
        <div className="group-details-container">
            {/* Sidebar / Info */}
            <div className={`details-sidebar ${showInfo ? 'visible' : ''}`}>
                <div className="sidebar-header-mobile">
                    <h3 className="text-white font-bold">Group Info</h3>
                    <button onClick={() => setShowInfo(false)} className="close-sidebar-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="info-card">
                    <div className="cover-gradient" />
                    <div className="info-content">
                        <div className="large-avatar-wrapper">
                            <div className="large-avatar">
                                {group.photoURL ? (
                                    <img src={group.photoURL} alt={group.name} />
                                ) : (
                                    <Users size={32} color="#9ca3af" />
                                )}
                            </div>
                        </div>

                        <h1 className="group-title-large">{group.name}</h1>
                        <div className="group-stats">
                            <div className="stat-item">
                                <Users size={14} />
                                {group.memberCount} members
                            </div>
                            <div className="privacy-tag">
                                {group.privacy}
                            </div>
                        </div>

                        <p className="group-description-text">
                            {group.description || 'No description provided.'}
                        </p>

                        {!isMember ? (
                            <button
                                onClick={handleJoin}
                                disabled={joining}
                                className="join-btn"
                            >
                                {joining ? 'Joining...' : 'Join Group'}
                            </button>
                        ) : (
                            <div className="member-actions">
                                <button className="settings-btn">
                                    <Settings size={18} />
                                    Settings
                                </button>
                                <button className="settings-btn" onClick={() => setShowInvite(true)}>
                                    <UserPlus size={18} />
                                    Invite
                                </button>
                                <button onClick={handleLeave} className="leave-btn">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rules / Extra Info */}
                <div className="metadata-card">
                    <h3 className="metadata-title">About</h3>
                    <div className="metadata-row">
                        <p>Created on {new Date(group.createdAt as string).toLocaleDateString()}</p>
                    </div>
                    {group.privacy === 'private' && (
                        <div className="private-warning">
                            <Lock size={14} />
                            Private Group
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content / Chat */}
            <div className="details-content">
                {/* Chat Header */}
                <div className="chat-header-bar">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/groups')} className="back-btn-mobile">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="chat-header-title">{group.name}</h2>
                            <p className="chat-header-subtitle">{group.memberCount} members</p>
                        </div>
                    </div>

                    <button
                        className={`info-toggle-btn ${showInfo ? 'active' : ''}`}
                        onClick={() => setShowInfo(!showInfo)}
                    >
                        <Users size={20} />
                    </button>
                </div>

                {!isMember && group.privacy === 'private' ? (
                    <div className="private-placeholder">
                        <Lock size={48} className="lock-icon-large" />
                        <h2 className="group-title-large">This group is private</h2>
                        <p className="placeholder-text">Join this group to see the discussion and participate.</p>
                        <button onClick={() => setShowInfo(true)} className="mobile-join-prompt">
                            View Details to Join
                        </button>
                    </div>
                ) : (
                    <div className="chat-wrapper">
                        <GroupChat groupId={groupId as string} />
                    </div>
                )}
            </div>

            {user && (
                <InviteMembersModal
                    isOpen={showInvite}
                    onClose={() => setShowInvite(false)}
                    onInvite={handleInvite}
                    currentUser={user}
                    groupId={groupId as string}
                />
            )}
        </div>
    );
};

export default GroupDetails;
