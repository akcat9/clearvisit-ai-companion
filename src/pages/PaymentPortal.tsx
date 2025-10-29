import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const PaymentPortal = () => {
  const { user, subscriptionStatus, subscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your subscription",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any)?.standalone;
        if (isStandalone) {
          const a = document.createElement('a');
          a.href = data.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.location.assign(data.url);
        }
      }
    } catch (error: any) {
      console.error('Error accessing customer portal:', error);
      
      const isNoCustomerError = error.message?.includes('No Stripe customer found');
      
      toast({
        title: isNoCustomerError ? "No Subscription Found" : "Error",
        description: isNoCustomerError 
          ? "You need to complete a subscription checkout first. Please select a plan to get started."
          : error.message || "Failed to access customer portal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Payment Portal</CardTitle>
              <CardDescription>
                Please sign in to access your subscription management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/")}
                className="w-full"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl">Subscription Status</CardTitle>
            <CardDescription>
              Manage your tadoc subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {subscriptionStatus?.subscribed ? (
              <>
                <div className="space-y-4 p-6 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                      Active Membership
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan:</span>
                      <span className="font-medium">
                        {subscriptionStatus.product_id?.includes('annual') ? 'Annual Plan ($15/year)' : 'Monthly Plan ($2/month)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Billing:</span>
                      <span className="font-medium">
                        {subscriptionStatus.subscription_end ? 
                          new Date(subscriptionStatus.subscription_end).toLocaleDateString() : 
                          'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleManageSubscription}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You can update payment methods, change plans, or cancel your subscription
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4 p-6 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                    <p className="text-lg font-semibold text-muted-foreground">
                      No Active Membership
                    </p>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Subscribe to unlock all features of tadoc
                  </p>
                </div>

                <Button 
                  onClick={() => navigate("/subscription")}
                  className="w-full"
                >
                  View Subscription Plans
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentPortal;
