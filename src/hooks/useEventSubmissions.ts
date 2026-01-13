/**
 * Hook for event submissions (Supabase)
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EventSubmission } from '../types/models/submission';

interface UseEventSubmissionsOptions {
  debounceMs?: number;
  onlySubmitted?: boolean;
}

/**
 * Real-time submissions hook
 * Lists event submissions
 */
export function useEventSubmissions(
  eventId: string,
  options: UseEventSubmissionsOptions = {}
) {
  const { debounceMs = 300, onlySubmitted = false } = options;
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setSubmissions([]);
      return;
    }

    setLoading(true);

    const fetchSubmissions = async () => {
      try {
        let query = supabase
          .from('event_submissions')
          .select('*')
          .eq('event_id', eventId);

        if (onlySubmitted) {
          query = query.eq('status', 'submitted');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: EventSubmission[] = (data || []).map(sub => ({
          id: sub.id,
          eventId: sub.event_id,
          userId: sub.user_id,
          videoUrl: sub.video_url,
          thumbnailUrl: sub.thumbnail_url,
          status: sub.status,
          score: sub.score,
          title: sub.title,
          description: sub.description,
          uploadedAt: new Date(sub.created_at),
          updatedAt: new Date(sub.updated_at),
          // Additional checks
          userName: sub.user_name || 'User', // If these exist on view?
          userAvatar: sub.user_avatar
        }));

        setSubmissions(mapped);
      } catch (err) {
        console.error('❌ Error fetching submissions:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();

    // Set up Realtime subscription
    const subscription = supabase
      .channel(`submissions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_submissions',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          // Simple re-fetch on change
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [eventId, onlySubmitted]);

  return {
    submissions,
    loading,
    error,
  };
}
