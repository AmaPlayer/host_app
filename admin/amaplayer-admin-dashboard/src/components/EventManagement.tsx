import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Upload,
  Trophy
} from 'lucide-react';
import { eventsService, EventSubmission } from '../services/eventsService';
import { Event, EventCategory } from '../types/models/event';
import { r2Storage } from '../services/storage/r2Storage';
import AdminWinnerSelector from './AdminWinnerSelector';
import { useAuth } from '../contexts/AuthContext';

const EventManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showWinnerSelector, setShowWinnerSelector] = useState(false);
  const [eventForWinnerSelection, setEventForWinnerSelection] = useState<Event | null>(null);
  const [winnerSelectorSubmissions, setWinnerSelectorSubmissions] = useState<EventSubmission[]>([]);
  const [showWinnerConfirmation, setShowWinnerConfirmation] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('🎬 ADMIN: Loading events from Supabase...');
      const allEvents = await eventsService.getAllEvents();
      console.log('📊 ADMIN: Events loaded:', allEvents);
      console.log('📈 ADMIN: Total events:', allEvents.length);
      setEvents(allEvents);
    } catch (error) {
      console.error('❌ ADMIN: Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterStatus === 'active' && !event.isActive) return false;
    if (filterStatus === 'inactive' && event.isActive) return false;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower) ||
        event.category.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const handleToggleEventStatus = async (event: Event) => {
    try {
      await eventsService.toggleEventStatus(event.id!, !event.isActive);
      await loadEvents();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error toggling event status:', error);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`)) {
      try {
        await eventsService.deleteEvent(event.id!);
        await loadEvents();
        setActionMenuOpen(null);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleOpenWinnerSelector = async (event: Event) => {
    try {
      setLoadingSubmissions(true);
      setEventForWinnerSelection(event);
      const submissions = await eventsService.getEventSubmissions(event.id!);
      setWinnerSelectorSubmissions(submissions);
      setShowWinnerConfirmation(true);
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error loading submissions:', error);
      alert('Failed to load submissions. Please try again.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleWinnerSelectionSuccess = async (updatedEvent: Event) => {
    await loadEvents();
    setShowWinnerSelector(false);
    setEventForWinnerSelection(null);
    setWinnerSelectorSubmissions([]);
    setShowWinnerConfirmation(false);
    alert('✅ Winners declared successfully!');
  };

  const CreateEventModal: React.FC<{ onClose: () => void; event?: Event }> = ({ onClose, event }) => {
    const [formData, setFormData] = useState({
      title: event?.title || '',
      description: event?.description || '',
      date: event?.date ? (typeof event.date === 'string' ? event.date : new Date(event.date).toISOString().split('T')[0]) : '',
      time: event?.time || '',
      location: event?.location || '',
      category: (event?.category || 'other') as string,
      maxParticipants: event?.maxParticipants || 0,
      isActive: event?.isActive ?? true,
      imageUrl: event?.imageUrl || '',
      submissionDeadline: event?.submissionDeadline ? (() => {
        const d = event.submissionDeadline;
        const date = d instanceof Date ? d : (typeof d === 'string' ? new Date(d) : (d && 'toDate' in d ? d.toDate() : new Date()));
        return date.toISOString().slice(0, 16);
      })() : '',
      winnerCount: event?.winnerCount || 3,
      eventRequirements: event?.eventRequirements ? {
        description: event.eventRequirements.description || '',
        criteria: event.eventRequirements.criteria?.join('\n') || ''
      } : { description: '', criteria: '' },
      status: 'upcoming' as const,
      priority: 'medium' as const
    });
    const [submitting, setSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Handle image file selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImageFile(file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    // Upload image to R2 Storage

    const uploadImage = async (file: File): Promise<string> => {
      setUploadingImage(true);
      try {
        console.log('Uploading file:', file.name, 'Size:', file.size);

        // Validate file
        if (!file || file.size === 0) {
          throw new Error('Invalid file selected');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File size must be less than 10MB');
        }

        const timestamp = Date.now();
        const fileName = `events/${timestamp}-${file.name}`;

        console.log('Uploading to path:', fileName);
        const result = await r2Storage.uploadFile(fileName, file);
        console.log('Upload result:', result);

        return result.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        setUploadingImage(false); // Reset state on error
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Image upload failed: ${errorMessage}`);
      } finally {
        setUploadingImage(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        let finalImageUrl = formData.imageUrl;

        // Upload new image if selected
        if (imageFile) {
          console.log('Starting image upload...');
          finalImageUrl = await uploadImage(imageFile);
          console.log('Image upload completed:', finalImageUrl);
        }

        const eventData = {
          ...formData,
          imageUrl: finalImageUrl,
          category: formData.category as EventCategory,
          submissionDeadline: formData.submissionDeadline ? new Date(formData.submissionDeadline) : undefined,
          winnerCount: formData.winnerCount || 3,
          eventRequirements: formData.eventRequirements?.description ? {
            description: formData.eventRequirements.description,
            criteria: formData.eventRequirements.criteria
              .split('\n')
              .map(c => c.trim())
              .filter(c => c.length > 0)
          } : undefined,
          organizer: 'Admin',
          contactEmail: 'admin@amaplayer.com'
        };

        console.log('Creating/updating event with data:', eventData);

        if (event) {
          await eventsService.updateEvent(event.id!, eventData);
          console.log('Event updated successfully');
        } else {
          const eventId = await eventsService.createEvent(eventData);
          console.log('Event created successfully with ID:', eventId);
        }

        await loadEvents();
        // Reset form state
        setImageFile(null);
        setImagePreview('');
        onClose();
      } catch (error) {
        console.error('Error saving event:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        let errorMessage = 'Unknown error occurred';

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null) {
          errorMessage = (error as any).code || (error as any).message || JSON.stringify(error);
        } else {
          errorMessage = String(error);
        }

        alert(`Error saving event: ${errorMessage}`);
      } finally {
        setSubmitting(false);
        // Ensure uploadingImage is reset
        setUploadingImage(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {event ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">When users must submit their talent videos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏆 Number of Winner Positions (Optional)
                </label>
                <select
                  value={formData.winnerCount || 3}
                  onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 Winner (1st Place Only)</option>
                  <option value="2">2 Winners (1st & 2nd Place)</option>
                  <option value="3">3 Winners (Podium - 1st, 2nd, 3rd)</option>
                  <option value="4">4 Winners (+ 4th Place)</option>
                  <option value="5">5 Winners (+ 5th Place)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How many top submissions to rank as winners. Default is 3 (1st, 2nd, 3rd place).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Requirements - Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.eventRequirements?.description || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    eventRequirements: {
                      ...formData.eventRequirements,
                      description: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Show us your best sprint! Athletes must complete a 100m sprint and submit a video."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Requirements - Criteria (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.eventRequirements?.criteria || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    eventRequirements: {
                      ...formData.eventRequirements,
                      criteria: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter criteria (one per line):&#10;Must be 100m sprint&#10;Video should be clear and well-lit&#10;Maximum duration 30 seconds"
                />
                <p className="text-xs text-gray-500 mt-1">One criterion per line - these will be displayed to participants</p>
              </div>

              {/* Event Image Upload */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📸 Event Image (Optional)
                </label>

                {/* Current Image Preview */}
                {(formData.imageUrl || imagePreview) && (
                  <div className="mb-3">
                    <img
                      src={imagePreview || formData.imageUrl}
                      alt="Event preview"
                      className="w-full h-32 object-cover rounded border border-gray-300"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      {imagePreview ? '✨ New image ready to upload' : '✅ Current event image'}
                    </p>
                  </div>
                )}

                {/* File Input */}
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded cursor-pointer transition-colors ${uploadingImage
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}>
                    <div className="flex flex-col items-center justify-center py-2">
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-1"></div>
                          <p className="text-xs text-blue-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mb-1 text-gray-400" />
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold">Click</span> to upload image
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF (up to 10MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Event['category'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="tournament">Tournament</option>
                    <option value="training">Training</option>
                    <option value="workshop">Workshop</option>
                    <option value="competition">Competition</option>
                    <option value="meetup">Meetup</option>
                    <option value="seminar">Seminar</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 for unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Event is active and visible to users
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  disabled={submitting || uploadingImage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200 flex items-center space-x-2"
                >
                  {submitting || uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{uploadingImage ? 'Uploading Image...' : 'Saving Event...'}</span>
                    </>
                  ) : (
                    <span>{event ? '✏️ Update Event' : '➕ Create Event'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const EventDetailsModal: React.FC<{ event: Event; onClose: () => void }> = ({ event, onClose }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">Event Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
              <div className="flex items-center space-x-2 mb-4">
                {event.status === 'completed' || (event.leaderboard && event.leaderboard.length > 0) ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🏆 Completed
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${event.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {event.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900">{event.description}</p>
            </div>

            {event.leaderboard && event.leaderboard.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="text-md font-bold text-yellow-800 mb-3 flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  Winners
                </h4>
                <div className="space-y-3">
                  {event.leaderboard.sort((a, b) => a.rank - b.rank).map((winner) => (
                    <div key={winner.rank} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                      <div className="flex items-center">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 text-xs font-bold ${winner.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                            winner.rank === 2 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                          }`}>
                          #{winner.rank}
                        </span>
                        <span className="font-medium text-gray-900">
                          {winner.userId}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{winner.prize || 'No Prize'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {new Date(event.date).toLocaleDateString()}
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {event.time}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {event.location}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{event.participants?.length || 0}</p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {event.maxParticipants || '∞'}
                </p>
                <p className="text-sm text-gray-600">Max Capacity</p>
              </div>
            </div>

            {event.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(typeof event.createdAt === 'string' ? event.createdAt : event.createdAt instanceof Date ? event.createdAt : (event.createdAt && 'toDate' in event.createdAt) ? event.createdAt.toDate() : new Date()).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600 mt-1">Create and manage events for the mobile app</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by title, description, or location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              <option value="active">Active Events</option>
              <option value="inactive">Inactive Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                  <div className="flex items-center space-x-2 flex-wrap">
                    {event.status === 'completed' || (event.leaderboard && event.leaderboard.length > 0) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        🏆 Completed
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${event.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {event.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                    </span>
                    {event.leaderboard && event.leaderboard.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Winners Declared
                      </span>
                    )}
                    {(!event.leaderboard || event.leaderboard.length === 0) && event.submissionDeadline && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Pending Winners
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === event.id ? null : event.id!)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {actionMenuOpen === event.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventDetails(true);
                            setActionMenuOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 inline mr-2" />
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowCreateModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 inline mr-2" />
                          Edit Event
                        </button>
                        <button
                          onClick={() => handleToggleEventStatus(event)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {event.isActive ? (
                            <>
                              <XCircle className="w-4 h-4 inline mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 inline mr-2" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenWinnerSelector(event)}
                          disabled={loadingSubmissions || event.leaderboard?.length > 0}
                          className={`block w-full text-left px-4 py-2 text-sm ${event.leaderboard?.length > 0
                            ? 'text-green-700'
                            : 'text-orange-700 hover:bg-gray-100'
                            } ${event.leaderboard?.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Trophy className="w-4 h-4 inline mr-2" />
                          {event.leaderboard?.length > 0 ? '✓ Winners Declared' : 'Declare Winners'}
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(event.date).toLocaleDateString()} at {event.time}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {event.location}
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  {event.participants?.length || 0} participants
                  {Number(event.maxParticipants) > 0 && ` / ${event.maxParticipants} max`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating your first event.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create Event
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          event={selectedEvent || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Winner Confirmation Dialog */}
      {showWinnerConfirmation && eventForWinnerSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Declare Winners?</h3>
            <p className="text-gray-600 mb-4">
              Declare winners for <strong>{eventForWinnerSelection.title}</strong>?
            </p>
            {winnerSelectorSubmissions.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ This event has no submissions yet. Winners cannot be declared.
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Found {winnerSelectorSubmissions.length} submission{winnerSelectorSubmissions.length !== 1 ? 's' : ''}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWinnerConfirmation(false);
                  setEventForWinnerSelection(null);
                  setWinnerSelectorSubmissions([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                disabled={loadingSubmissions}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowWinnerSelector(true);
                  setShowWinnerConfirmation(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={loadingSubmissions || winnerSelectorSubmissions.length === 0}
              >
                {loadingSubmissions ? 'Loading...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Winner Selector Modal */}
      {showWinnerSelector && eventForWinnerSelection && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8">
            <AdminWinnerSelector
              event={eventForWinnerSelection}
              submissions={winnerSelectorSubmissions}
              onSuccess={handleWinnerSelectionSuccess}
              onCancel={() => {
                setShowWinnerSelector(false);
                setEventForWinnerSelection(null);
                setWinnerSelectorSubmissions([]);
              }}
              adminId={currentUser.uid}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;