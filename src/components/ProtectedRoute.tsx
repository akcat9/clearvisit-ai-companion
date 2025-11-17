import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Navigate } from 'react-router-dom';
import SubscriptionGate from '@/components/SubscriptionGate';
import Onboarding from '@/components/Onboarding';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      setShowOnboarding(!hasSeenOnboarding);
      setCheckingOnboarding(false);
    }
  }, [authLoading, user]);

  if (authLoading || subLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  if (!hasActiveSubscription) {
    return <SubscriptionGate />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;