import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isRecovering } = useAppRefresh();

  if (loading || isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            {isRecovering ? 'Reconnecting...' : 'Loading...'}
          </p>
          {isRecovering && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Taking longer than expected?</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;