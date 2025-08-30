import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Share2 } from "lucide-react";

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
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleShare = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
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
      // Get sender profile data
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('shared_visits')
        .insert({
          sender_id: user.id,
          recipient_email: recipientEmail.trim(),
          visit_summary: visitSummary,
          appointment_data: appointmentData || null,
          sender_profile: senderProfile || null,
          message: message.trim() || null,
        });

      if (error) {
        console.error('Error sharing visit:', error);
        throw error;
      }

      toast({
        title: "Visit shared successfully",
        description: `Visit summary has been shared with ${recipientEmail}`,
      });

      // Reset form and close modal
      setRecipientEmail("");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      console.error('Error sharing visit:', error);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Visit Summary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
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