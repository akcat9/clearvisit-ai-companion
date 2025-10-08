import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadSharedVisits = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    // Set up real-time subscription
    const channel = supabase
      .channel('shared-visits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_visits'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user?.email) return;

    try {
      // Optimized: Single query using user email directly from auth
      const { count } = await supabase
        .from('shared_visits')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', user.email)
        .neq('sender_id', user.id)
        .is('viewed_at', null);

      setUnreadCount(count || 0);
    } catch (error) {
      // Silently fail - non-critical feature
    }
  };

  return { unreadCount, refetch: fetchUnreadCount };
};