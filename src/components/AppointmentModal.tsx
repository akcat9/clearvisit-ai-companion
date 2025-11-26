import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { appointmentSchema, type AppointmentFormData } from "@/lib/validation";
import { useTranslation } from 'react-i18next';

interface AppointmentModalProps {
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => void;
}

export const AppointmentModal = ({ onClose, onSubmit }: AppointmentModalProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AppointmentFormData>({
    doctorName: "",
    date: "",
    time: "",
    reason: "",
    goal: "",
    symptoms: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    try {
      const validatedData = appointmentSchema.parse(formData);
      setIsSubmitting(true);
      await onSubmit(validatedData);
      setErrors({});
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
          title: t('appointment.validationError'),
          description: t('appointment.validationError'),
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AppointmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[85vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{t('appointment.createTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="doctorName" className="text-sm">{t('appointment.doctorName')}</Label>
              <Input
                id="doctorName"
                placeholder={t('appointment.doctorPlaceholder')}
                value={formData.doctorName}
                onChange={(e) => handleChange("doctorName", e.target.value)}
                required
                className={`text-sm sm:text-base ${errors.doctorName ? "border-destructive" : ""}`}
              />
              {errors.doctorName && (
                <p className="text-xs sm:text-sm text-destructive">{errors.doctorName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="date" className="text-sm">{t('appointment.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                  className={`text-sm sm:text-base ${errors.date ? "border-destructive" : ""}`}
                />
                {errors.date && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.date}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="time" className="text-sm">{t('appointment.time')}</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  required
                  className={`text-sm sm:text-base ${errors.time ? "border-destructive" : ""}`}
                />
                {errors.time && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.time}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reason" className="text-sm">{t('appointment.reason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('appointment.reasonPlaceholder')}
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                required
                className={`text-sm sm:text-base min-h-[80px] ${errors.reason ? "border-destructive" : ""}`}
              />
              {errors.reason && (
                <p className="text-xs sm:text-sm text-destructive">{errors.reason}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="goal" className="text-sm">{t('appointment.goal')}</Label>
              <Textarea
                id="goal"
                placeholder={t('appointment.goalPlaceholder')}
                value={formData.goal}
                onChange={(e) => handleChange("goal", e.target.value)}
                className={`text-sm sm:text-base min-h-[80px] ${errors.goal ? "border-destructive" : ""}`}
              />
              {errors.goal && (
                <p className="text-xs sm:text-sm text-destructive">{errors.goal}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="symptoms" className="text-sm">{t('appointment.symptoms')}</Label>
              <Textarea
                id="symptoms"
                placeholder={t('appointment.symptomsPlaceholder')}
                value={formData.symptoms}
                onChange={(e) => handleChange("symptoms", e.target.value)}
                className={`text-sm sm:text-base min-h-[80px] ${errors.symptoms ? "border-destructive" : ""}`}
              />
              {errors.symptoms && (
                <p className="text-xs sm:text-sm text-destructive">{errors.symptoms}</p>
              )}
            </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-sm" disabled={isSubmitting}>
              {t('appointment.cancel')}
            </Button>
            <Button type="submit" className="flex-1 text-sm" disabled={isSubmitting}>
              {isSubmitting ? t('appointment.creating') : t('appointment.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};