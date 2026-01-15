import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '@hooks/useLanguage';
import NavigationBar from '../../components/layout/NavigationBar';
import FooterNav from '../../components/layout/FooterNav';
import eventsService from '../../services/api/eventsService';
import participationService from '../../services/api/participationService';
import submissionService from '../../services/api/submissionService';
import { Event, WinnerEntry } from '../../types/models/event';
import { EventSubmission } from '../../types/models/submission';
import { useEventSubmissions } from '../../hooks/useEventSubmissions';
import EventSubmissionForm from '../../components/events/EventSubmissionForm';
import EventSubmissionGallery from '../../components/events/EventSubmissionGallery';
import WinnerSelector from '../../components/events/WinnerSelector';
import { EventLeaderboard } from '../../components/events/EventLeaderboard';
import './Events.css';

type TabType = 'upcoming' | 'live' | 'past';

interface EventWithStatus extends Event {
  calculatedStatus: 'upcoming' | 'live' | 'completed';
}

export default function Events() {
  const { currentUser, isGuest } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Submission modal state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [userParticipation, setUserParticipation] = useState<string | null>(null);
  const [userSubmission, setUserSubmission] = useState<EventSubmission | null>(null);
  const [submissionTab, setSubmissionTab] = useState<'submit' | 'gallery'>('submit');

  // Delete submission state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    submissionId: string | null;
    submissionTitle: string | null;
  }>({
    show: false,
    submissionId: null,
    submissionTitle: null
  });
  const [deletingSubmission, setDeletingSubmission] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Winner declaration state
  const [showWinnerSelector, setShowWinnerSelector] = useState(false);
  const [declaringWinners, setDeclaringWinners] = useState(false);
  const [winnerDeclareError, setWinnerDeclareError] = useState<string>('');

  // Real-time submissions for selected event (fetch all submissions regardless of status)
  const { submissions: eventSubmissions, loading: submissionsLoading } = useEventSubmissions(
    selectedEvent?.id || '',
    { onlySubmitted: false }
  );

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const startTime = performance.now();

      const allEvents = await eventsService.getAllEvents();
      const endTime = performance.now();
      // Calculate status ONCE when loading
      const eventsWithStatus: EventWithStatus[] = allEvents.map(event => ({
        ...event,
        calculatedStatus: (event.status as any) || eventsService.getEventStatus(event)
      }));
      setEvents(eventsWithStatus);
    } catch (error) {
      console.error('Error loading events:', error);
      setError(`${t('failedLoadingEvents')}. ${t('tryAgain')}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleClick = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadEvents();
  };

  // Handle winner declaration
  const handleDeclareWinners = async (winners: WinnerEntry[]): Promise<void> => {
    if (!selectedEvent || !currentUser) {
      setWinnerDeclareError('Missing event or user information');
      return;
    }

    try {
      setDeclaringWinners(true);
      setWinnerDeclareError('');

      // Validate before calling service
      if (!Array.isArray(winners) || winners.length === 0) {
        throw new Error('No winners selected');
      }

      if (winners.length > 5) {
        throw new Error('Maximum 5 winners allowed');
      }

      // Call service - now throws errors instead of returning null
      const updatedEvent = await eventsService.declareWinners(
        selectedEvent.id!,
        winners,
        currentUser.uid
      );

      // Update the selected event and events list
      setSelectedEvent(updatedEvent);
      setEvents(
        events.map((e) =>
          e.id === updatedEvent.id
            ? { ...updatedEvent, calculatedStatus: e.calculatedStatus }
            : e
        )
      );
      setShowWinnerSelector(false);
    } catch (err) {
      // Extract and format error message
      let errorMessage = 'Failed to declare winners';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Enhance error message with user-friendly text
      if (errorMessage.includes('timed out')) {
        errorMessage +=
          '. The operation took too long. Please check your connection and try again.';
      } else if (errorMessage.includes('permission')) {
        errorMessage =
          t('permissionDenied') || 'You do not have permission to declare winners. Please contact an administrator.';
      } else if (errorMessage.includes('not found')) {
        errorMessage +=
          '. One or more submissions may have been deleted. Please refresh and try again.';
      } else if (errorMessage.includes('Duplicate')) {
        errorMessage =
          'Invalid winner selection: ' +
          errorMessage +
          '. Each submission can only win once.';
      }

      setWinnerDeclareError(errorMessage);
      console.error('❌ Error declaring winners:', {
        error: err,
        eventId: selectedEvent?.id,
        winnerCount: winners.length,
        errorMessage
      });
    } finally {
      setDeclaringWinners(false);
    }
  };

  // Handle event button click (Interested/Join)
  const handleEventButtonClick = async (event: Event) => {
    if (isGuest()) {
      alert(t('pleaseLogInParticipate'));
      return;
    }

    if (!currentUser) {
      alert(t('pleaseLogIn'));
      return;
    }

    setSelectedEvent(event);
    setShowSubmissionModal(true);

    // Check user's participation
    try {
      const participation = await participationService.getParticipation(event.id!, currentUser.uid);
      setUserParticipation(participation?.type || null);

      // Get user's existing submission
      const submission = await submissionService.getUserSubmissionForEvent(event.id!, currentUser.uid);
      setUserSubmission(submission);
      console.log('✅ User submission:', submission?.id);
    } catch (err) {
      console.error('❌ Error loading participation:', err);
    }
  };

  // Handle submission modal close
  const handleCloseSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedEvent(null);
    setUserParticipation(null);
    setUserSubmission(null);
    setSubmissionTab('submit');
  };

  // Handle submission success
  const handleSubmissionSuccess = async (submission: EventSubmission) => {
    setUserSubmission(submission);
  };

  // Handle delete button click - show confirmation
  const handleDeleteClick = (submissionId: string, submissionTitle: string) => {
    setDeleteConfirmation({
      show: true,
      submissionId,
      submissionTitle
    });
  };

  // Confirm and execute deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.submissionId) return;

    try {
      setDeletingSubmission(true);
      setDeleteError(null);

      await submissionService.deleteSubmission(deleteConfirmation.submissionId);

      // Reset state to allow new submission
      setUserSubmission(null);
      setSubmissionTab('submit');
      setDeleteConfirmation({ show: false, submissionId: null, submissionTitle: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete submission';
      setDeleteError(message);
      console.error('❌ Delete error:', err);
    } finally {
      setDeletingSubmission(false);
    }
  };

  // Handle re-upload click
  const handleReUploadClick = () => {
    setSubmissionTab('submit');
  };

  // Memoize filtered events and counts
  const { eventsByTab, tabCounts } = useMemo(() => {
    const upcomingEvents = events.filter(e => e.calculatedStatus === 'upcoming');
    const liveEvents = events.filter(e => e.calculatedStatus === 'live');
    const pastEvents = events.filter(e => e.calculatedStatus === 'completed');

    const filtered = activeTab === 'upcoming' ? upcomingEvents :
      activeTab === 'live' ? liveEvents : pastEvents;

    return {
      eventsByTab: filtered,
      tabCounts: {
        upcoming: upcomingEvents.length,
        live: liveEvents.length,
        past: pastEvents.length
      }
    };
  }, [events, activeTab]);

  // Computed flag: user has submitted to this event
  const hasUserSubmittedToEvent = userSubmission !== null && userSubmission.status === 'submitted';

  return (
    <div className="events">
      <NavigationBar
        currentUser={currentUser}
        isGuest={isGuest()}
        onTitleClick={handleTitleClick}
        title={t('eventsTitle')}
      />

      <div className="main-content events-content">
        {loading ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div className="loading-spinner"></div>
            <p>{t('loadingEvents')}</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#ff4757'
          }}>
            <p>{error}</p>
            <button
              onClick={loadEvents}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t('tryAgain')}
            </button>
          </div>
        ) : (
          <>
            {/* Events Header */}
            <div className="events-header">
              <h1 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {t('upcomingEvents')}
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
                {t('discoverEventsSubtitle')}
              </p>
            </div>

            {/* Event Tabs */}
            <div className="events-tabs">
              <button
                className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                {t('upcomingEvents')} ({tabCounts.upcoming})
              </button>
              <button
                className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
                onClick={() => setActiveTab('live')}
              >
                {t('liveEvents')} ({tabCounts.live})
              </button>
              <button
                className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                {t('pastEvents')} ({tabCounts.past})
              </button>
            </div>

            {/* Events Grid */}
            <div className="events-grid">
              {eventsByTab.length === 0 ? (
                <div className="empty-events-state">
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>
                    {activeTab === 'upcoming' && t('noUpcomingEvents')}
                    {activeTab === 'live' && t('noLiveEvents')}
                    {activeTab === 'past' && t('noPastEvents')}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {t('noEventsMessage')}
                  </p>
                </div>
              ) : (
                eventsByTab.map((event) => {
                  const statusColor = event.calculatedStatus === 'live' ? '#ff4757' :
                    event.calculatedStatus === 'upcoming' ? 'var(--accent-primary)' : '#2ed573';
                  const isResultsDeclared = event.eventState === 'results_declared';
                  const buttonText = isResultsDeclared ? t('viewResults') :
                    event.calculatedStatus === 'live' ? t('watchLive') :
                      event.calculatedStatus === 'upcoming' ? t('interested') : t('viewResults');

                  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
                    const img = e.target as HTMLImageElement;
                    // Only set fallback if not already a fallback image
                    if (!img.src.includes('images.unsplash.com')) {
                      img.src = 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop';
                    } else {
                      // If fallback also fails, show a placeholder color
                      img.style.backgroundColor = '#e0e0e0';
                      img.style.display = 'none';
                    }
                  };

                  return (
                    <div key={event.id} className="event-card">
                      <div className="event-image" style={{ position: 'relative', backgroundColor: '#f5f5f5' }}>
                        <img
                          src={event.imageUrl || event.image || 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop'}
                          alt={event.title}
                          loading="lazy"
                          onError={handleImageError}
                        />
                        <div className="status-badge" style={{
                          background: statusColor,
                          color: 'white'
                        }}>
                          {event.calculatedStatus.toUpperCase()}
                        </div>
                      </div>

                      <div className="event-content">
                        <h3 className="event-title">{event.title}</h3>

                        {event.category && (
                          <div className="event-category">
                            {event.category}
                          </div>
                        )}

                        <div className="event-details">
                          <div className="event-detail">
                            <span>📅 {new Date(event.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                          {event.startTime && (
                            <div className="event-detail">
                              <span>⏰ {event.startTime}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="event-detail">
                              <span>📍 {event.location}</span>
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}

                        {event.maxParticipants && (
                          <div className="event-meta">
                            👥 {t('maxParticipants').replace('{count}', event.maxParticipants.toString())}
                          </div>
                        )}

                        <button
                          className="event-btn"
                          onClick={() => handleEventButtonClick(event)}
                        >
                          {buttonText}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <FooterNav />

      {/* Submission Modal */}
      {showSubmissionModal && selectedEvent && currentUser && (
        <div className="submission-modal-overlay" onClick={handleCloseSubmissionModal}>
          <div
            className="submission-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="submission-modal-header">
              <div className="modal-title-section">
                <h2>{selectedEvent.title}</h2>
                <p className="event-subtitle">{selectedEvent.category}</p>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseSubmissionModal}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="submission-modal-body">
              {/* Event Requirements */}
              {selectedEvent.eventRequirements && (
                <div className="event-requirements">
                  <h4>📋 {t('requirements')}</h4>
                  <p>{selectedEvent.eventRequirements.description}</p>
                  {selectedEvent.eventRequirements.criteria && (
                    <ul className="criteria-list">
                      {selectedEvent.eventRequirements.criteria.map((criterion, i) => (
                        <li key={i}>{criterion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Winner Declaration Section for Admins */}
              {selectedEvent.eventState === 'submissions_closed' && selectedEvent.submissionDeadline && eventSubmissions.length > 0 && (
                <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '2px solid #e0e0e0' }}>
                  <button
                    onClick={() => setShowWinnerSelector(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      backgroundColor: '#fbbf24',
                      color: '#78350f',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem'
                    }}
                  >
                    🏆 {t('declareWinners')}
                  </button>
                  {winnerDeclareError && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}>
                      {winnerDeclareError}
                    </div>
                  )}
                </div>
              )}

              {/* Show gallery directly with DELETE/RE-UPLOAD if user submitted (results not declared) */}
              {hasUserSubmittedToEvent && selectedEvent?.eventState !== 'results_declared' ? (
                <div className="submission-tab-content submission-with-actions">
                  <EventSubmissionGallery
                    submissions={eventSubmissions}
                    loading={submissionsLoading}
                    currentUserId={currentUser.uid}
                    showRanks={false}
                  />
                  <div className="submission-actions">
                    <button
                      className="action-btn action-btn-reupload"
                      onClick={handleReUploadClick}
                    >
                      🔄 {t('reuploadSubmission')}
                    </button>
                    <button
                      className="action-btn action-btn-delete"
                      onClick={() => handleDeleteClick(userSubmission!.id, userSubmission!.title)}
                      disabled={deletingSubmission}
                    >
                      {deletingSubmission ? `🗑️ ${t('deleting')}` : `🗑️ ${t('deleteSubmission')}`}
                    </button>
                  </div>
                </div>
              ) : hasUserSubmittedToEvent && selectedEvent?.eventState === 'results_declared' ? (
                /* User submitted and results are declared (read-only) */
                <div className="submission-tab-content">
                  <EventSubmissionGallery
                    submissions={eventSubmissions}
                    loading={submissionsLoading}
                    currentUserId={currentUser.uid}
                    showRanks={true}
                  />
                </div>
              ) : !hasUserSubmittedToEvent ? (
                /* User hasn't submitted yet (original behavior) */
                <>
                  <div className="submission-tabs">
                    <button
                      className={`tab-btn ${submissionTab === 'submit' ? 'active' : ''}`}
                      onClick={() => setSubmissionTab('submit')}
                    >
                      📤 {t('submitVideo')}
                    </button>
                    <button
                      className={`tab-btn ${submissionTab === 'gallery' ? 'active' : ''}`}
                      onClick={() => setSubmissionTab('gallery')}
                    >
                      👥 {t('gallery')} ({eventSubmissions.length})
                    </button>
                  </div>

                  {submissionTab === 'submit' ? (
                    <div className="submission-tab-content">
                      {selectedEvent.eventState === 'results_declared' ? (
                        <div style={{
                          padding: '24px',
                          textAlign: 'center',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '8px',
                          border: '2px solid #d1d5db'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏁</div>
                          <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>{t('resultsDeclared')}</h3>
                          <p style={{ color: '#6b7280', marginBottom: '0' }}>
                            {t('competitionEnded')}
                          </p>
                        </div>
                      ) : (
                        <EventSubmissionForm
                          eventId={selectedEvent.id!}
                          userId={currentUser.uid}
                          userName={currentUser.displayName || 'Anonymous'}
                          userAvatar={currentUser.photoURL || undefined}
                          submissionDeadline={selectedEvent.submissionDeadline}
                          onSubmissionSuccess={handleSubmissionSuccess}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="submission-tab-content">
                      <EventSubmissionGallery
                        submissions={eventSubmissions}
                        loading={submissionsLoading}
                        currentUserId={currentUser.uid}
                        showRanks={selectedEvent.eventState === 'results_declared'}
                      />
                    </div>
                  )}
                </>
              ) : null}

              {/* Leaderboard Display (when winners are declared) */}
              {selectedEvent.eventState === 'results_declared' && (
                <EventLeaderboard event={selectedEvent} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="confirmation-modal-overlay" onClick={() => setDeleteConfirmation({ ...deleteConfirmation, show: false })}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('deleteSubmissionTitle')}</h3>
            <p className="submission-details">
              Title: <strong>{deleteConfirmation.submissionTitle}</strong>
            </p>
            <p className="warning-text">
              {t('deleteWarning')}
            </p>
            {deleteError && (
              <div className="error-message">
                {deleteError}
              </div>
            )}
            <div className="confirmation-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteConfirmation({ show: false, submissionId: null, submissionTitle: null })}
                disabled={deletingSubmission}
              >
                {t('cancel')}
              </button>
              <button
                className="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={deletingSubmission}
              >
                {deletingSubmission ? t('deleting') : t('confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Selector Modal */}
      {showWinnerSelector && selectedEvent && eventSubmissions.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                  🏆 {t('declareWinners')} - {selectedEvent.title}
                </h3>
                <button
                  onClick={() => setShowWinnerSelector(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                >
                  ✕
                </button>
              </div>

              <WinnerSelector
                submissions={eventSubmissions}
                winnerCount={selectedEvent.winnerCount || 3}
                onDeclareWinners={handleDeclareWinners}
                onCancel={() => setShowWinnerSelector(false)}
                loading={declaringWinners}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
