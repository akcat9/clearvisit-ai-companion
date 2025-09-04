import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Share2 } from "lucide-react";
import MultiEmailInput from "./MultiEmailInput";

interface ShareVisitModalProps {
  visitSummary: any;
  appointmentData?: {
    doctor_name: string;
    date: string;
    time: string;
    reason: string;
    goal?: string;
  };
  trigger?: React.ReactNode;
}

const ShareVisitModal = ({ visitSummary, appointmentData, trigger }: ShareVisitModalProps) => {
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleShare = async () => {
    if (recipientEmails.length === 0) {
      toast({
        title: "Email required",
        description: "Please enter at least one recipient email address",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to share visits",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      // Validate recipient emails exist using secure database function
      const emailChecks = await Promise.all(
        recipientEmails.map(email => 
          supabase.rpc('check_email_exists', { email_address: email })
        )
      );

      const invalidEmails = recipientEmails.filter((email, index) => {
        const result = emailChecks[index];
        return result.error || !result.data;
      });

      if (invalidEmails.length > 0) {
        toast({
          title: "Invalid recipients",
          description: `The following email addresses are not registered: ${invalidEmails.join(', ')}`,
          variant: "destructive",
        });
        setIsSharing(false);
        return;
      }

      // Get sender profile data
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      // Create share records for each recipient
      const sharePromises = recipientEmails.map(email => 
        supabase
          .from('shared_visits')
          .insert({
            sender_id: user.id,
            recipient_email: email,
            visit_summary: visitSummary,
            appointment_data: appointmentData || null,
            sender_profile: senderProfile || null,
            message: message.trim() || null,
          })
      );

      const results = await Promise.all(sharePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        toast({
          title: "Partial success",
          description: `Shared with ${recipientEmails.length - errors.length} of ${recipientEmails.length} recipients`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Visit shared successfully",
          description: `Visit summary has been shared with ${recipientEmails.length} recipient${recipientEmails.length > 1 ? 's' : ''}`,
        });
      }

      // Reset form and close modal
      setRecipientEmails([]);
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Failed to share visit",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Visit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Visit Summary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Recipient Emails</Label>
            <MultiEmailInput
              emails={recipientEmails}
              onEmailsChange={setRecipientEmails}
              placeholder="Enter email addresses..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message..."
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? "Sharing..." : "Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareVisitModal;