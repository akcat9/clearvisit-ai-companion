import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, ExternalLink, RefreshCw, LogOut } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SubscriptionGate = () => {
  const { checkSubscription, loading } = useSubscription();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = async () => {
    setChecking(true);
    await checkSubscription();
    setChecking(false);
  };

  const handleGetAccess = () => {
    window.open('https://tadoc.store', '_blank');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Active Subscription Required</h1>
          <p className="text-muted-foreground">
            To access tadoc, you need an active subscription. Click below to get started.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleGetAccess}
            className="w-full"
            size="lg"
          >
            Get Access at tadoc.store
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>

          <Button
            onClick={handleCheckAgain}
            variant="outline"
            className="w-full"
            disabled={checking || loading}
          >
            {checking || loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check Again
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Already subscribed? Click "Check Again" after completing your purchase.
        </p>

        <div className="pt-4 border-t">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionGate;
