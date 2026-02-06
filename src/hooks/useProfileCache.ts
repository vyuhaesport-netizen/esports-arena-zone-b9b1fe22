import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerProfile {
  user_id: string;
  username?: string;
  full_name?: string;
  in_game_name?: string;
  game_uid?: string;
}

// Global cache for profiles
const globalProfileCache: Record<string, PlayerProfile> = {};
const pendingRequests: Record<string, Promise<PlayerProfile | null>> = {};

export const useProfileCache = () => {
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const batchQueue = useRef<Set<string>>(new Set());
  const batchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processBatch = useCallback(async () => {
    const ids = Array.from(batchQueue.current);
    batchQueue.current.clear();
    
    if (ids.length === 0) return;

    // Filter out already cached
    const uncachedIds = ids.filter(id => !globalProfileCache[id]);
    
    if (uncachedIds.length === 0) {
      // All cached, update state
      setProfiles(prev => {
        const updated = { ...prev };
        ids.forEach(id => {
          if (globalProfileCache[id]) updated[id] = globalProfileCache[id];
        });
        return updated;
      });
      return;
    }

    try {
      // Fetch in smaller batches (max 50 for URL length)
      const BATCH_SIZE = 50;
      for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
        const batch = uncachedIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, in_game_name, game_uid')
          .in('user_id', batch);

        if (data) {
          data.forEach(p => {
            globalProfileCache[p.user_id] = p;
          });
        }
      }

      // Update state with all requested profiles
      setProfiles(prev => {
        const updated = { ...prev };
        ids.forEach(id => {
          if (globalProfileCache[id]) updated[id] = globalProfileCache[id];
        });
        return updated;
      });
    } catch (error) {
      console.error('Error fetching profiles batch:', error);
    }
  }, []);

  const getProfile = useCallback((userId: string): PlayerProfile | undefined => {
    // Return from cache if available
    if (globalProfileCache[userId]) {
      return globalProfileCache[userId];
    }

    // Add to batch queue
    batchQueue.current.add(userId);
    
    // Debounce batch processing
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
    }
    batchTimeout.current = setTimeout(processBatch, 100);

    return profiles[userId];
  }, [profiles, processBatch]);

  const prefetchProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !globalProfileCache[id]);
    if (uncachedIds.length === 0) return;

    // Add all to batch queue and process
    uncachedIds.forEach(id => batchQueue.current.add(id));
    await processBatch();
  }, [processBatch]);

  return { getProfile, prefetchProfiles, profiles };
};

// Utility to clear cache if needed
export const clearProfileCache = () => {
  Object.keys(globalProfileCache).forEach(key => delete globalProfileCache[key]);
};
