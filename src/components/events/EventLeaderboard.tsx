/**
 * Event Leaderboard Component
 * Displays declared winners with medals and rankings
 * Uses universal Avatar component for robust, consistent image handling
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Event } from '../../types/models/event';
import { Avatar } from '../common/Avatar';
import { navigateToProfile } from '../../utils/navigation/profileNavigation';
import { useAuth } from '../../contexts/AuthContext';
import './EventLeaderboard.css';

interface EventLeaderboardProps {
  event: Event;
}

export function EventLeaderboard({ event }: EventLeaderboardProps) {
  // Move all hooks before any early returns
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const medals = useMemo(() => ['🥇', '🥈', '🥉', '⭐', '⭐'], []);
  const placeLabels = useMemo(() => ['1st', '2nd', '3rd', '4th', '5th'], []);

  const handleWinnerClick = useCallback((userId: string) => {
    navigateToProfile(navigate, userId, currentUser?.uid);
  }, [navigate, currentUser?.uid]);

  const formatAnnouncementDate = useMemo(() => {
    if (!event.winnersAnnouncedAt) return 'Recently';

    let date: Date;
    if (event.winnersAnnouncedAt instanceof Date) {
      date = event.winnersAnnouncedAt;
    } else if (typeof event.winnersAnnouncedAt === 'object' && 'toDate' in event.winnersAnnouncedAt) {
      // Handle Firestore Timestamp
      date = (event.winnersAnnouncedAt as any).toDate();
    } else {
      date = new Date();
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [event.winnersAnnouncedAt]);

  // Now check for early return after all hooks
  if (!event.leaderboard || event.leaderboard.length === 0) {
    return null;
  }

  // Helper function to get medal safely
  const getMedal = (index: number) => {
    return medals[index] || '⭐';
  };

  // Helper function to get place label safely
  const getPlaceLabel = (index: number) => {
    if (placeLabels[index]) return placeLabels[index];
    return `${index + 1}${['st', 'nd', 'rd'][index % 3] || 'th'}`;
  };

  return (
    <div className="event-leaderboard">
      <div className="leaderboard-header">
        <div className="header-title">
          <Trophy className="trophy-icon" />
          <h3>Competition Results</h3>
        </div>
        <p className="announcement-date">
          Winners announced on {formatAnnouncementDate}
        </p>
      </div>

      <div className="leaderboard-container">
        {/* Top 3 Visual Podium */}
        {event.leaderboard.length >= 1 && (
          <div className="podium-section">
            <div className="podium-grid">
              {/* 2nd Place */}
              {event.leaderboard.length >= 2 && (
                <div
                  className="podium-spot second-place"
                  onClick={() => handleWinnerClick(event.leaderboard[1].userId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="podium-rank">🥈</div>
                  <div className="podium-content">
                    <Avatar
                      userId={event.leaderboard[1].userId}
                      displayName={event.leaderboard[1].userName}
                      photoURL={event.leaderboard[1].userAvatar}
                      variant="large"
                      type="event-winner"
                      clickable={false} // Parent handles click
                      fallbackInitials
                    />
                    <div className="podium-info">
                      <p className="podium-name">{event.leaderboard[1].userName}</p>
                      <p className="podium-label">2nd Place</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Center) */}
              <div
                className="podium-spot first-place"
                onClick={() => handleWinnerClick(event.leaderboard[0].userId)}
                style={{ cursor: 'pointer' }}
              >
                <div className="podium-rank">🥇</div>
                <div className="podium-content">
                  <Avatar
                    userId={event.leaderboard[0].userId}
                    displayName={event.leaderboard[0].userName}
                    photoURL={event.leaderboard[0].userAvatar}
                    variant="xl"
                    type="event-winner"
                    clickable={false} // Parent handles click
                    fallbackInitials
                  />
                  <div className="podium-info">
                    <p className="podium-name">{event.leaderboard[0].userName}</p>
                    <p className="podium-label">1st Place</p>
                  </div>
                </div>
                <div className="winner-crown">👑</div>
              </div>

              {/* 3rd Place */}
              {event.leaderboard.length >= 3 && (
                <div
                  className="podium-spot third-place"
                  onClick={() => handleWinnerClick(event.leaderboard[2].userId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="podium-rank">🥉</div>
                  <div className="podium-content">
                    <Avatar
                      userId={event.leaderboard[2].userId}
                      displayName={event.leaderboard[2].userName}
                      photoURL={event.leaderboard[2].userAvatar}
                      variant="large"
                      type="event-winner"
                      clickable={false} // Parent handles click
                      fallbackInitials
                    />
                    <div className="podium-info">
                      <p className="podium-name">{event.leaderboard[2].userName}</p>
                      <p className="podium-label">3rd Place</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Winners (4th, 5th) */}
        {event.leaderboard.length > 3 && (
          <div className="additional-winners">
            {event.leaderboard.slice(3).map((winner, index) => {
              const rank = index + 4;
              const medal = getMedal(rank - 1);
              const placeLabel = getPlaceLabel(rank - 1);

              return (
                <div
                  key={winner.userId}
                  className="additional-winner"
                  onClick={() => handleWinnerClick(winner.userId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="winner-rank">
                    <span className="medal">{medal}</span>
                    <span className="place">{placeLabel}</span>
                  </div>
                  <Avatar
                    userId={winner.userId}
                    displayName={winner.userName}
                    photoURL={winner.userAvatar}
                    variant="medium"
                    type="event-winner"
                    clickable={false} // Parent handles click
                    fallbackInitials
                  />
                  <div className="winner-name">{winner.userName}</div>
                  {winner.prize && (
                    <div className="winner-prize">{winner.prize}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Rankings List */}
        <div className="rankings-list">
          <h4>Final Rankings</h4>
          <div className="rankings-table">
            {event.leaderboard.map((winner, index) => (
              <div
                key={winner.userId}
                className="ranking-row"
                onClick={() => handleWinnerClick(winner.userId)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ranking-position">
                  <span className="medal-large">{getMedal(index)}</span>
                </div>
                <div className="ranking-info">
                  <p className="ranking-name">{winner.userName}</p>
                  {winner.prize && (
                    <p className="ranking-prize">Prize: {winner.prize}</p>
                  )}
                </div>
                <div className="ranking-label">
                  {index === 0 && 'Champion'}
                  {index === 1 && 'Runner-up'}
                  {index === 2 && 'Third Place'}
                  {index > 2 && `${getPlaceLabel(index)} Place`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Celebration Banner */}
      <div className="leaderboard-banner">
        <p>Congratulations to all winners! 🎉</p>
      </div>
    </div>
  );
}

export default EventLeaderboard;
