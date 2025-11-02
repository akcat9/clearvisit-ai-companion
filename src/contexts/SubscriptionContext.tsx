import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  loading: boolean;
  lastChecked: number | null;
  checkSubscription: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user?.id) {
      setHasActiveSubscription(false);
      setLoading(false);
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('has_active_subscription' as any, {
        user_id_input: user.id
      });

      if (error) {
        console.error('Subscription check error:', error);
        // On error, keep previous state (fail open for better UX)
        return hasActiveSubscription;
      }

      const isActive = Boolean(data);
      setHasActiveSubscription(isActive);
      setLastChecked(Date.now());
      return isActive;
    } catch (error) {
      console.error('Subscription check failed:', error);
      return hasActiveSubscription;
    } finally {
      setLoading(false);
    }
  }, [user?.id, hasActiveSubscription]);

  // Check subscription when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setHasActiveSubscription(false);
      setLoading(false);
      setLastChecked(null);
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  // Check when page becomes visible
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkSubscription]);

  // Check when coming back online
  useEffect(() => {
    if (!user) return;

    const handleOnline = () => {
      checkSubscription();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, checkSubscription]);

  const value = {
    hasActiveSubscription,
    loading,
    lastChecked,
    checkSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
