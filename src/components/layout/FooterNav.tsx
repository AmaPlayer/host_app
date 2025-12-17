import { memo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Play, Calendar, MessageCircle, User, LucideIcon } from 'lucide-react';
import { useUnreadMessages } from '@hooks/useUnreadMessages';
import { useLanguage } from '../../contexts/LanguageContext';
import './FooterNav.css';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

const FooterNav = memo(function FooterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Preload critical routes on component mount
  useEffect(() => {
    const preloadRoutes = async (): Promise<void> => {
      try {
        // Preload the most commonly used routes
        const routesToPreload = [
          () => import('../../pages/moments/MomentsPage'),
          () => import('../../pages/events/Events'),
          () => import('../../pages/messages/Messages'),
          () => import('../../features/profile/pages/Profile')
        ];

        // Preload routes with a small delay to not block initial render
        setTimeout(() => {
          routesToPreload.forEach((importFn, index) => {
            setTimeout(() => {
              importFn().catch(() => {
                // Silent fail - preloading is optional
              });
            }, index * 100); // Stagger the preloads
          });
        }, 1000); // Wait 1 second after mount
      } catch (error) {
        // Silent fail - preloading is optional
      }
    };

    preloadRoutes();
  }, []);

  const navItems: NavItem[] = [
    {
      id: 'home',
      icon: Home,
      label: t('home'),
      path: '/home'
    },
    {
      id: 'moments',
      icon: Play,
      label: t('moments'),
      path: '/moments'
    },
    {
      id: 'events',
      icon: Calendar,
      label: t('events'),
      path: '/events'
    },
    {
      id: 'messages',
      icon: MessageCircle,
      label: t('messages'),
      path: '/messages'
    },
    {
      id: 'profile',
      icon: User,
      label: t('profile'),
      path: '/profile'
    }
  ];

  const handleNavClick = (path: string): void => {
    navigate(path);
  };

  // Preload route on hover for instant navigation
  const handleNavHover = (path: string): void => {
    const routeMap: Record<string, () => Promise<unknown>> = {
      '/moments': () => import('../../pages/moments/MomentsPage'),
      '/events': () => import('../../pages/events/Events'),
      '/messages': () => import('../../pages/messages/Messages'),
      '/profile': () => import('../../features/profile/pages/Profile')
    };

    const importFn = routeMap[path];
    if (importFn) {
      importFn().catch(() => {
        // Silent fail - preloading is optional
      });
    }
  };

  const { hasUnread } = useUnreadMessages();

  // Add the unread badge to the messages item
  const renderMessageIcon = (item: NavItem) => {
    if (item.id === 'messages' && hasUnread) {
      return (
        <span className="footer-nav-icon with-badge">
          <item.icon size={24} />
          <span className="unread-badge"></span>
        </span>
      );
    }
    return (
      <span className="footer-nav-icon">
        <item.icon size={24} />
      </span>
    );
  };

  return (
    <footer className="footer-nav">
      <div className="footer-nav-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`footer-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
            onMouseEnter={() => handleNavHover(item.path)}
            onTouchStart={() => handleNavHover(item.path)} // For mobile
          >
            {renderMessageIcon(item)}
            <span className="footer-nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
});

export default FooterNav;
