import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminCounts {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingDhanaWithdrawals: number;
  pendingOrganizerApps: number;
  pendingSupport: number;
  pendingReports: number;
  unreadBroadcasts: number;
  total: number;
}

export const useAdminCounts = () => {
  const [counts, setCounts] = useState<AdminCounts>({
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingDhanaWithdrawals: 0,
    pendingOrganizerApps: 0,
    pendingSupport: 0,
    pendingReports: 0,
    unreadBroadcasts: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      // Fetch all counts in parallel
      const [
        depositsRes,
        withdrawalsRes,
        dhanaWithdrawalsRes,
        organizerAppsRes,
        supportRes,
        reportsRes,
      ] = await Promise.all([
        supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('type', 'deposit').eq('status', 'pending'),
        supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
        supabase.from('dhana_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('organizer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('tournament_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const newCounts = {
        pendingDeposits: depositsRes.count || 0,
        pendingWithdrawals: withdrawalsRes.count || 0,
        pendingDhanaWithdrawals: dhanaWithdrawalsRes.count || 0,
        pendingOrganizerApps: organizerAppsRes.count || 0,
        pendingSupport: supportRes.count || 0,
        pendingReports: reportsRes.count || 0,
        unreadBroadcasts: 0,
        total: 0,
      };

      newCounts.total = 
        newCounts.pendingDeposits + 
        newCounts.pendingWithdrawals + 
        newCounts.pendingDhanaWithdrawals + 
        newCounts.pendingOrganizerApps + 
        newCounts.pendingSupport +
        newCounts.pendingReports;

      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching admin counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Set up realtime subscriptions for updates
    const channel = supabase
      .channel('admin-counts-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dhana_withdrawals' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizer_applications' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_reports' }, fetchCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
