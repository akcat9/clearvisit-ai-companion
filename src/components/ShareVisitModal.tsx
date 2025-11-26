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
import { shareVisitSchema, type ShareVisitFormData } from "@/lib/validation";
import { useTranslation } from 'react-i18next';

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
  const [formData, setFormData] = useState<ShareVisitFormData>({
    recipientEmails: [],
    message: "",
  });
  const [isSharing, setIsSharing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleShare = async () => {
    try {
      const validatedData = shareVisitSchema.parse(formData);
      setErrors({});
      
      if (!user) {
        toast({
          title: t('share.authRequired'),
          description: t('share.loginToShare'),
          variant: "destructive",
        });
        return;
      }

      setIsSharing(true);

      // Validate recipient emails exist using secure database function
      const emailChecks = await Promise.all(
        validatedData.recipientEmails.map(email => 
          supabase.rpc('check_email_exists', { email_address: email })
        )
      );

      const invalidEmails = validatedData.recipientEmails.filter((email, index) => {
        const result = emailChecks[index];
        return result.error || !result.data;
      });

      if (invalidEmails.length > 0) {
        toast({
          title: t('share.invalidRecipients'),
          description: `${t('share.notRegistered')}: ${invalidEmails.join(', ')}`,
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
      const sharePromises = validatedData.recipientEmails.map(email => 
        supabase
          .from('shared_visits')
          .insert({
            sender_id: user.id,
            recipient_email: email,
            visit_summary: visitSummary,
            appointment_data: appointmentData || null,
            sender_profile: senderProfile || null,
            message: validatedData.message?.trim() || null,
          })
      );

      const results = await Promise.all(sharePromises);
      const errors = results.filter(result => result.error);

      if (errors.length > 0) {
        toast({
          title: t('share.partialSuccess'),
          description: `${t('share.sharedWith')} ${validatedData.recipientEmails.length - errors.length} ${t('share.of')} ${validatedData.recipientEmails.length} ${t('share.recipients')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('share.shareSuccess'),
          description: `${t('share.shareSummaryShared')} ${validatedData.recipientEmails.length} ${t('share.recipient')}${validatedData.recipientEmails.length > 1 ? 's' : ''}`,
        });
      }

      // Reset form and close modal
      setFormData({ recipientEmails: [], message: "" });
      setIsOpen(false);
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
        
        toast({
          title: t('share.validationError'),
          description: t('share.checkForm'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('share.shareFailed'),
          description: t('share.tryAgain'),
          variant: "destructive",
        });
      }
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
            {t('visitDetails.shareVisit')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto mx-2">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{t('share.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="emails" className="text-sm">{t('share.recipientEmails')}</Label>
            <MultiEmailInput
              emails={formData.recipientEmails}
              onEmailsChange={(emails) => setFormData(prev => ({ ...prev, recipientEmails: emails }))}
              placeholder={t('share.emailPlaceholder')}
            />
            {errors.recipientEmails && (
              <p className="text-xs sm:text-sm text-destructive">{errors.recipientEmails}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="message" className="text-sm">{t('share.message')}</Label>
            <Textarea
              id="message"
              placeholder={t('share.messagePlaceholder')}
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className={`text-sm sm:text-base ${errors.message ? "border-destructive" : ""}`}
            />
            {errors.message && (
              <p className="text-xs sm:text-sm text-destructive">{errors.message}</p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="text-sm">
              {t('share.cancel')}
            </Button>
            <Button onClick={handleShare} disabled={isSharing} className="text-sm">
              {isSharing ? t('share.sharing') : t('share.share')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareVisitModal;