import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Subscription = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, subscriptionStatus } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to subscribe",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    setLoading(priceId);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

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
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Monthly Plan",
      price: "$2",
      period: "/month",
      description: "Perfect for trying out tadoc",
      priceId: "price_1SMZCwKIRLDgKEuIe3DWMOHs",
      features: [
        "Full access to all features",
        "Record unlimited appointments",
        "AI-powered visit summaries",
        "Share visits with family",
        "Cancel anytime"
      ]
    },
    {
      name: "Annual Plan",
      price: "$15",
      period: "/year",
      description: "Best value for committed users",
      priceId: "price_1SMZCwKIRLDgKEuIri1OirUh",
      badge: "Best Value - Save 37%",
      subtitle: "That's only $1.25/month!",
      features: [
        "Full access to all features",
        "Record unlimited appointments",
        "AI-powered visit summaries",
        "Share visits with family",
        "Priority support",
        "Save $9 annually"
      ],
      highlighted: true
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Current Subscription Status */}
          {subscriptionStatus?.subscribed && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Your Current Subscription</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-semibold">
                      {subscriptionStatus.product_id?.includes('annual') ? 'Annual Plan' : 'Monthly Plan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-semibold">
                      {subscriptionStatus.product_id?.includes('annual') ? '$15/year' : '$2/month'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold text-green-600">Active</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                    <p className="font-semibold">
                      {subscriptionStatus.subscription_end ? 
                        new Date(subscriptionStatus.subscription_end).toLocaleDateString() : 
                        'N/A'}
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => navigate('/payment-portal')}>
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plans */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold">Choose Your Plan</h1>
            <p className="text-muted-foreground text-lg">
              Get full access to tadoc's powerful features
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.priceId} 
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 max-w-[90%]">
                    <span className="bg-primary text-primary-foreground px-2 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl sm:text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                    {plan.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSubscribe(plan.priceId, plan.name)}
                    disabled={loading === plan.priceId}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {loading === plan.priceId ? 'Loading...' : `Select ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Subscription;
