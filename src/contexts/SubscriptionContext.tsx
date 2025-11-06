import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const checkingRef = useRef(false);
  const cacheTimeMs = 30000; // 30 seconds cache

  const checkSubscription = useCallback(async () => {
    if (!user?.id) {
      setHasActiveSubscription(false);
      setLoading(false);
      return false;
    }

    // Check cache first
    const now = Date.now();
    if (lastChecked && now - lastChecked < cacheTimeMs) {
      return hasActiveSubscription;
    }

    // Prevent duplicate simultaneous calls
    if (checkingRef.current) {
      return hasActiveSubscription;
    }

    checkingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('has_active_subscription' as any, {
        user_id_input: user.id
      });

      if (error) {
        console.error('Subscription check error:', error);
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
      checkingRef.current = false;
    }
  }, [user?.id, hasActiveSubscription, lastChecked, cacheTimeMs]);

  // Initial check when user logs in
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setHasActiveSubscription(false);
      setLoading(false);
      setLastChecked(null);
    }
  }, [user?.id]); // Only depend on user.id, not the entire function

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Check when page becomes visible (with debounce)
  useEffect(() => {
    if (!user?.id) return;

    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(checkSubscription, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [user?.id]);

  // Check when coming back online (with debounce)
  useEffect(() => {
    if (!user?.id) return;

    let timeoutId: NodeJS.Timeout;
    const handleOnline = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkSubscription, 1000);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(timeoutId);
    };
  }, [user?.id]);

  const value = {
    hasActiveSubscription,
    loading,
    lastChecked,
    checkSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
