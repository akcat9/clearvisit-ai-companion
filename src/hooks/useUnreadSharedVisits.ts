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
    if (!user) return;

    try {
      // Get user's email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (!profile?.email) return;

      // Count unread shared visits (only received messages, not sent)
      const { count } = await supabase
        .from('shared_visits')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', profile.email)
        .neq('sender_id', user.id)
        .is('viewed_at', null);

      setUnreadCount(count || 0);
    } catch (error) {
      // Silently fail - non-critical feature
    }
  };

  return { unreadCount, refetch: fetchUnreadCount };
};