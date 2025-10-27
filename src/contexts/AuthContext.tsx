import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  product_id?: string;
  subscription_end?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionLoading: boolean;
  checkSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const checkSubscription = async (overrideToken?: string) => {
    const token = overrideToken ?? session?.access_token;

    if (!token) {
      console.log('[SUBSCRIPTION CHECK] No token/session, clearing subscription status');
      setSubscriptionStatus(null);
      setSubscriptionLoading(false);
      return;
    }

    console.log('[SUBSCRIPTION CHECK] Starting subscription check');
    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error('[SUBSCRIPTION CHECK] Error checking subscription:', error);
        setSubscriptionStatus({ subscribed: false });
      } else {
        console.log('[SUBSCRIPTION CHECK] Subscription status received:', data);
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('[SUBSCRIPTION CHECK] Exception during subscription check:', error);
      setSubscriptionStatus({ subscribed: false });
    } finally {
      setSubscriptionLoading(false);
    }
  };
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session) {
          checkSubscription(session.access_token);
        } else {
          setSubscriptionStatus(null);
          setSubscriptionLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        checkSubscription(session.access_token);
      } else {
        setSubscriptionLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Periodic subscription check every minute
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [session]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Let React Router handle navigation instead of hard reload
      setSession(null);
      setUser(null);
      setSubscriptionStatus(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear local state on error
      setSession(null);
      setUser(null);
      setSubscriptionStatus(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    subscriptionStatus,
    subscriptionLoading,
    checkSubscription,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
