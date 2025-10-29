import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { appointmentSchema, type AppointmentFormData } from "@/lib/validation";

interface AppointmentModalProps {
  onClose: () => void;
  onSubmit: (data: AppointmentFormData) => void;
}

export const AppointmentModal = ({ onClose, onSubmit }: AppointmentModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<AppointmentFormData>({
    doctorName: "",
    date: "",
    time: "",
    reason: "",
    goal: "",
    symptoms: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = appointmentSchema.parse(formData);
      onSubmit(validatedData);
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
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive",
        });
      }
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
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor's Name</Label>
              <Input
                id="doctorName"
                placeholder="John Smith"
                value={formData.doctorName}
                onChange={(e) => handleChange("doctorName", e.target.value)}
                required
                className={errors.doctorName ? "border-destructive" : ""}
              />
              {errors.doctorName && (
                <p className="text-sm text-destructive">{errors.doctorName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                  className={errors.date ? "border-destructive" : ""}
                />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  required
                  className={errors.time ? "border-destructive" : ""}
                />
                {errors.time && (
                  <p className="text-sm text-destructive">{errors.time}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Textarea
                id="reason"
                placeholder="Describe the reason for your appointment"
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                required
                className={errors.reason ? "border-destructive" : ""}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Goal for Visit</Label>
              <Textarea
                id="goal"
                placeholder="What do you hope to achieve with this appointment?"
                value={formData.goal}
                onChange={(e) => handleChange("goal", e.target.value)}
                className={errors.goal ? "border-destructive" : ""}
              />
              {errors.goal && (
                <p className="text-sm text-destructive">{errors.goal}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (optional)</Label>
              <Textarea
                id="symptoms"
                placeholder="List any symptoms you're experiencing"
                value={formData.symptoms}
                onChange={(e) => handleChange("symptoms", e.target.value)}
                className={errors.symptoms ? "border-destructive" : ""}
              />
              {errors.symptoms && (
                <p className="text-sm text-destructive">{errors.symptoms}</p>
              )}
            </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};