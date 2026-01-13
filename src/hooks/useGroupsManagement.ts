// React Query hooks for groups management with caching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { Group } from '../types/models';
import groupsService from '../services/supabase/groupsService';

// Mock services replaced by real implementation

const getUserCacheManager = (userId: string) => null;

// Hook for getting user's groups
export const useUserGroups = (userId: string, options: any & { limit?: number } = {}) => {
  return useQuery<Group[]>({
    queryKey: queryKeys.userGroups(userId),
    queryFn: async () => {
      return await groupsService.getGroupsList(userId, { ...options });
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for getting group details
export const useGroupDetail = (groupId: string, options: any = {}) => {
  return useQuery<Group>({
    queryKey: queryKeys.groupDetail(groupId),
    queryFn: () => groupsService.getGroupDetails(groupId) as any,
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    ...options,
  });
};

// Hook for getting group members
export const useGroupMembers = (groupId: string, options: any & { limit?: number } = {}) => {
  return useQuery<any[]>({
    queryKey: queryKeys.groupMembers(groupId),
    queryFn: () => groupsService.getGroupMembers(groupId),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};

// Hook for searching public groups
export const useSearchGroups = (searchTerm: string, options: any & { limit?: number } = {}) => {
  return useQuery<Group[]>({
    queryKey: ['groups', 'search', searchTerm],
    queryFn: () => groupsService.searchGroups('current-user-placeholder', searchTerm),
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    ...options,
  });
};

// Mutation for creating a group
export const useCreateGroup = (creatorId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(creatorId);

  return useMutation({
    mutationFn: (groupData: Partial<Group>) => groupsService.createGroup(creatorId, groupData),
    onSuccess: async (result) => {
      // Result is just the ID from the service, so we invalidate to refetch the full list
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(creatorId) });

      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }
    },
  });
};

// Mutation for joining a group
export const useJoinGroup = (userId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => groupsService.joinGroup(groupId, userId),
    onSettled: async (data, error, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });

      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }
    },
  });
};

// Mutation for leaving a group
export const useLeaveGroup = (userId: string) => {
  const queryClient = useQueryClient();
  const cacheManager = getUserCacheManager(userId);

  return useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => groupsService.leaveGroup(groupId, userId),
    onSettled: async (data, error, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });

      if (cacheManager) {
        await cacheManager.clearUserCache('GROUPS_LIST');
      }
    },
  });
};
