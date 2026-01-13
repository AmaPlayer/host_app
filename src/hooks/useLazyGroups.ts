import { useState, useEffect, useCallback, useRef } from 'react';
import groupsService from '../services/supabase/groupsService';
import { UI_CONSTANTS } from '../constants/sharing';
import { UseLazyGroupsReturn } from '../types/hooks/custom';
import { Group } from '../types/models';

interface UseLazyGroupsOptions {
  pageSize?: number;
  searchDebounce?: number;
  autoLoad?: boolean;
  includePrivate?: boolean;
}

export const useLazyGroups = (userId: string, options: UseLazyGroupsOptions = {}): UseLazyGroupsReturn => {
  const {
    pageSize = UI_CONSTANTS.PAGINATION_SIZE,
    searchDebounce = UI_CONSTANTS.SEARCH_DEBOUNCE_DELAY,
    autoLoad = true,
    includePrivate = true
  } = options;

  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allGroupsRef = useRef<Group[]>([]);

  const loadGroups = useCallback(async (skipCache: boolean = false): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const groupsList = await groupsService.getGroupsList(userId, {
        skipCache,
        includePrivate
      });
      allGroupsRef.current = groupsList;
      setGroups(groupsList);

      const paginatedGroups = groupsList.slice(0, pageSize);
      setFilteredGroups(paginatedGroups);
      setHasMore(groupsList.length > pageSize);
      setPage(1);
    } catch (err: any) {
      console.error('❌ Error loading groups:', err);
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [userId, pageSize, includePrivate]);

  const loadMore = useCallback((): Promise<void> => {
    if (!hasMore || loading) return Promise.resolve();

    const nextPage = page + 1;
    const endIndex = nextPage * pageSize;

    const currentList = searchTerm ?
      allGroupsRef.current.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ) :
      allGroupsRef.current;

    const paginatedGroups = currentList.slice(0, endIndex);
    setFilteredGroups(paginatedGroups);
    setPage(nextPage);
    setHasMore(currentList.length > endIndex);

    return Promise.resolve();
  }, [page, pageSize, hasMore, loading, searchTerm]);

  const searchGroups = useCallback((query: string): Group[] => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return allGroupsRef.current;

    return allGroupsRef.current.filter(group =>
      group.name.toLowerCase().includes(trimmedQuery) ||
      (group.description && group.description.toLowerCase().includes(trimmedQuery))
    );
  }, []);

  const refresh = useCallback((): Promise<void> => {
    return loadGroups(true);
  }, [loadGroups]);

  useEffect(() => {
    if (autoLoad && userId) {
      loadGroups();
    }
  }, [userId, autoLoad, loadGroups]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    groups: filteredGroups,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    searchGroups
  };
};

export default useLazyGroups;
