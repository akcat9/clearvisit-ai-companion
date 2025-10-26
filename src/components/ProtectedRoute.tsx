import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { SubscriptionPromptModal } from '@/components/SubscriptionPromptModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, subscriptionStatus } = useAuth();

  if (loading) {
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

  return (
    <>
      {children}
      {/* Ensure the activation modal shows on all protected routes for unsubscribed users */}
      {subscriptionStatus && !subscriptionStatus.checking && !subscriptionStatus.subscribed && (
        <SubscriptionPromptModal open={true} onOpenChange={() => {}} autoSendEmail={false} />
      )}
    </>
  );
};

export default ProtectedRoute;