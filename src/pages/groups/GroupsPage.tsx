import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NavigationBar from '../../components/layout/NavigationBar';
import FooterNav from '../../components/layout/FooterNav';
import GroupList from '../../features/groups/GroupList';

const GroupsPage: React.FC = () => {
    const { currentUser, isGuest } = useAuth();
    const navigate = useNavigate();

    const handleTitleClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            <NavigationBar
                currentUser={currentUser}
                isGuest={isGuest()}
                onTitleClick={handleTitleClick}
                title="Groups"
            />

            <div className="max-w-4xl mx-auto pt-20 px-4">
                <GroupList />
            </div>

            <FooterNav />
        </div>
    );
};

export default GroupsPage;
