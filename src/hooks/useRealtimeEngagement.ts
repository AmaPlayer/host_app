import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface EngagementData {
  likes?: number;
  likesCount?: number;
  comments?: number;
  commentsCount?: number;
  shares?: number;
  sharesCount?: number;
  views?: number;
  viewsCount?: number;
}

interface UseRealtimeEngagementOptions {
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Custom hook for real-time engagement data updates (Supabase version)
 */
export const useRealtimeEngagement = (
  tableName: string | null,
  recordId: string | null,
  options: UseRealtimeEngagementOptions = {}
) => {
  const { enabled = true, debounceMs = 300 } = options;

  const [engagement, setEngagement] = useState<EngagementData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Helper to extract engagement data from a record
  const extractEngagement = (data: any): EngagementData => ({
    likes: data.likes_count || 0,
    likesCount: data.likes_count || 0,
    comments: data.comments_count || 0,
    commentsCount: data.comments_count || 0,
    shares: data.shares_count || 0,
    sharesCount: data.shares_count || 0,
    views: data.views_count || 0,
    viewsCount: data.views_count || 0
  });

  // Initial fetch
  const fetchInitialData = useCallback(async () => {
    if (!tableName || !recordId || !enabled) return;

    try {
      setLoading(true);
      // Only query columns that exist in posts table (Fix: removed shares_count, views_count)
      const { data, error } = await supabase
        .from(tableName)
        .select('likes_count, comments_count')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      if (data) setEngagement(extractEngagement(data));
    } catch (err) {
      console.error('Error fetching initial engagement:', err);
      setError('Failed to fetch initial data');
    } finally {
      setLoading(false);
    }
  }, [tableName, recordId, enabled]);

  const setupListener = useCallback(() => {
    if (!tableName || !recordId || !enabled) return;

    // Clean up old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    try {
      const channel = supabase
        .channel(`engagement:${tableName}:${recordId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter: `id=eq.${recordId}`
          },
          (payload) => {
            const newData = payload.new;
            const engagementData = extractEngagement(newData);

            // Debounce
            const now = Date.now();
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

            if (now - lastUpdateRef.current > debounceMs) {
              setEngagement(engagementData);
              lastUpdateRef.current = now;
            } else {
              debounceTimerRef.current = setTimeout(() => {
                setEngagement(engagementData);
                lastUpdateRef.current = Date.now();
              }, debounceMs - (now - lastUpdateRef.current));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to connect to realtime channel');
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('Error setting up engagement listener:', err);
      setError('Failed to set up listener');
    }
  }, [tableName, recordId, enabled, debounceMs]);

  useEffect(() => {
    fetchInitialData();
    setupListener();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchInitialData, setupListener]);

  return { engagement, loading, error, refresh: fetchInitialData };
};

/**
 * Batch hook for multiple records
 * Note: Supabase limits number of channels. For large lists, 
 * listening to the whole table and filtering locally is more efficient.
 */
export const useRealtimeEngagementBatch = (
  tableName: string,
  recordIds: string[],
  options: UseRealtimeEngagementOptions = {}
) => {
  const { enabled = true } = options;
  const [engagementMap, setEngagementMap] = useState<Record<string, EngagementData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const extractEngagement = (data: any): EngagementData => ({
    likes: data.likes_count || 0,
    likesCount: data.likes_count || 0,
    comments: data.comments_count || 0,
    commentsCount: data.comments_count || 0,
    shares: data.shares_count || 0,
    sharesCount: data.shares_count || 0,
    views: data.views_count || 0,
    viewsCount: data.views_count || 0
  });

  const fetchInitialData = useCallback(async () => {
    if (!tableName || recordIds.length === 0 || !enabled) return;

    try {
      setLoading(true);
      // Only query columns that exist in posts table (Fix: removed shares_count, views_count)
      const { data, error } = await supabase
        .from(tableName)
        .select('id, likes_count, comments_count')
        .in('id', recordIds);

      if (error) throw error;

      const newMap: Record<string, EngagementData> = {};
      data?.forEach((row: any) => {
        newMap[row.id] = extractEngagement(row);
      });
      setEngagementMap(newMap);
    } catch (err) {
      console.error('Error fetching batch engagement:', err);
      setError('Failed to fetch batch data');
    } finally {
      setLoading(false);
    }
  }, [tableName, recordIds, enabled]);

  const setupListener = useCallback(() => {
    if (!tableName || recordIds.length === 0 || !enabled) return;

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    // Listen to all updates on the table and filter client-side
    // Filtering 100+ IDs in filter string is hard.
    const channel = supabase
      .channel(`engagement_batch:${tableName}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: tableName },
        (payload) => {
          const newData = payload.new;
          if (recordIds.includes(newData.id)) {
            setEngagementMap(prev => ({
              ...prev,
              [newData.id]: extractEngagement(newData)
            }));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [tableName, recordIds, enabled]);

  useEffect(() => {
    fetchInitialData();
    setupListener();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [JSON.stringify(recordIds), tableName, enabled]); // Deep compare IDs if possible, or use stringify

  const getEngagement = useCallback((id: string) => engagementMap[id] || {}, [engagementMap]);

  return { engagementMap, engagement: engagementMap, loading, error, refresh: fetchInitialData, getEngagement };
};