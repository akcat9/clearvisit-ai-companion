import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoSendEmail?: boolean;
}

export const SubscriptionPromptModal = ({ 
  open, 
  onOpenChange,
  autoSendEmail = false 
}: SubscriptionPromptModalProps) => {
  const { user, checkSubscription, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Auto-send email on first open
  useEffect(() => {
    if (open && autoSendEmail && !emailSent && user) {
      const lastSent = localStorage.getItem(`last-subscription-email-${user.id}`);
      const now = Date.now();
      
      // Rate limit: only send if more than 5 minutes since last email
      if (!lastSent || now - parseInt(lastSent) > 5 * 60 * 1000) {
        sendEmail();
      } else {
        setEmailSent(true);
      }
    }
  }, [open, autoSendEmail, user, emailSent]);

  const sendEmail = async () => {
    if (!user) return;

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-subscription-email');

      if (error) {
        throw error;
      }

      setEmailSent(true);
      localStorage.setItem(`last-subscription-email-${user.id}`, Date.now().toString());
      
      toast({
        title: "✅ Email Sent",
        description: `Check ${user.email} for subscription instructions`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await checkSubscription();
      
      if (subscriptionStatus.subscribed) {
        toast({
          title: "✨ Account Active!",
          description: "All features are now unlocked. Welcome to tadoc!",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Account Not Active",
          description: "Please complete activation to unlock features.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast({
        title: "Error",
        description: "Failed to check subscription status.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const hasExpired = subscriptionStatus.expiresAt && 
    new Date(subscriptionStatus.expiresAt) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {hasExpired ? "Account Expired" : "Check Your Email"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              {hasExpired ? (
                <p className="text-sm">
                  Your account access expired on {new Date(subscriptionStatus.expiresAt!).toLocaleDateString()}. 
                  Please activate to continue using tadoc.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    We've sent you an email with next steps to activate your account.
                  </p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">Please check:</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <p className="text-sm">
                    Click the link in the email to activate your account and unlock all tadoc features.
                  </p>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={sendEmail}
            disabled={isSendingEmail}
            variant="outline"
          >
            {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {emailSent ? "Resend Email" : "Send Email"}
          </Button>
          
          <Button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check Account Status
          </Button>
          
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
