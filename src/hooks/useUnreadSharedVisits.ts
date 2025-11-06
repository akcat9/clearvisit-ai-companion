import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnreadSharedVisits = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const fetchingRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.email || fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      const { count } = await supabase
        .from('shared_visits')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', user.email)
        .neq('sender_id', user.id)
        .is('viewed_at', null);

      setUnreadCount(count || 0);
    } catch (error) {
      // Silently fail - non-critical feature
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    fetchUnreadCount();

    // More targeted real-time subscription - only for recipient's emails
    const channel = supabase
      .channel(`shared-visits-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_visits',
          filter: `recipient_email=eq.${user.email}`
        },
        () => {
          // Debounce refetch
          setTimeout(fetchUnreadCount, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id, fetchUnreadCount]);

  return { unreadCount, refetch: fetchUnreadCount };
};