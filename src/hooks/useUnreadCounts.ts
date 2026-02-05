import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  teamChat: number;
  broadcasts: number;
}

export const useUnreadCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ teamChat: 0, broadcasts: 0 });
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's team
  useEffect(() => {
    const fetchTeam = async () => {
      if (!user) {
        setTeamId(null);
        return;
      }

      // Check if user is leader
      const { data: leaderTeam } = await supabase
        .from('player_teams')
        .select('id')
        .eq('leader_id', user.id)
        .maybeSingle();

      if (leaderTeam) {
        setTeamId(leaderTeam.id);
        return;
      }

      // Check if user is member
      const { data: membership } = await supabase
        .from('player_team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setTeamId(membership?.team_id || null);
    };

    fetchTeam();
  }, [user]);

  // Fetch unread counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) {
        setCounts({ teamChat: 0, broadcasts: 0 });
        setLoading(false);
        return;
      }

      try {
        let teamChatCount = 0;
        let broadcastCount = 0;

        // Team chat unread count - messages not seen by current user
        if (teamId) {
          const { count } = await supabase
            .from('team_messages')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .neq('sender_id', user.id)
            .not('seen_by', 'cs', `{${user.id}}`);

          teamChatCount = count || 0;
        }

        // Broadcasts unread count - check notifications for unread admin broadcasts
        const { count: broadcastNotifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'admin_broadcast')
          .eq('is_read', false);

        broadcastCount = broadcastNotifCount || 0;

        setCounts({ teamChat: teamChatCount, broadcasts: broadcastCount });
      } catch (error) {
        console.error('Error fetching unread counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Subscribe to realtime changes for team messages
    if (teamId && user) {
      const messageChannel = supabase
        .channel(`unread_team_${teamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_messages',
            filter: `team_id=eq.${teamId}`,
          },
          () => {
            fetchCounts();
          }
        )
        .subscribe();

      // Subscribe to notifications for broadcasts
      const notifChannel = supabase
        .channel(`unread_notifs_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchCounts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user, teamId]);

  const refreshCounts = async () => {
    if (!user) return;
    
    let teamChatCount = 0;
    let broadcastCount = 0;

    if (teamId) {
      const { count } = await supabase
        .from('team_messages')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .neq('sender_id', user.id)
        .not('seen_by', 'cs', `{${user.id}}`);

      teamChatCount = count || 0;
    }

    const { count: broadcastNotifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'admin_broadcast')
      .eq('is_read', false);

    broadcastCount = broadcastNotifCount || 0;

    setCounts({ teamChat: teamChatCount, broadcasts: broadcastCount });
  };

  return {
    ...counts,
    totalUnread: counts.teamChat + counts.broadcasts,
    hasTeam: !!teamId,
    loading,
    refreshCounts,
  };
};
