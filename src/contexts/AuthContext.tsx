import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  checking: boolean;
  planId: string | null;
  expiresAt: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  subscriptionStatus: SubscriptionStatus;
  checkSubscription: () => Promise<void>;
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
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    checking: false,
    planId: null,
    expiresAt: null,
  });

  const checkSubscription = async () => {
    setSubscriptionStatus(prev => ({ ...prev, checking: true }));
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        // Fail closed - if check fails, assume NOT subscribed for security
        setSubscriptionStatus({
          subscribed: false,
          checking: false,
          planId: null,
          expiresAt: null,
        });
        return;
      }

      setSubscriptionStatus({
        subscribed: data.subscribed || false,
        checking: false,
        planId: data.plan_id || null,
        expiresAt: data.expires_at || null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Fail closed - if check fails, assume NOT subscribed for security
      setSubscriptionStatus({
        subscribed: false,
        checking: false,
        planId: null,
        expiresAt: null,
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription when user logs in
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription if user exists
      if (session?.user) {
        setTimeout(() => {
          checkSubscription();
        }, 0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Let React Router handle navigation instead of hard reload
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Clear local state on error
      setSession(null);
      setUser(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    subscriptionStatus,
    checkSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};