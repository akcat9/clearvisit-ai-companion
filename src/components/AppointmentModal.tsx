import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface AppointmentModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const AppointmentModal = ({ onClose, onSubmit }: AppointmentModalProps) => {
  const [formData, setFormData] = useState({
    doctorName: "",
    date: "",
    time: "",
    reason: "",
    goal: "",
    symptoms: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
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
            />
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
                required
              />
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal for Visit</Label>
            <Textarea
              id="goal"
              placeholder="What do you hope to achieve with this appointment?"
              value={formData.goal}
              onChange={(e) => handleChange("goal", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symptoms">Symptoms (optional)</Label>
            <Textarea
              id="symptoms"
              placeholder="List any symptoms you're experiencing"
              value={formData.symptoms}
              onChange={(e) => handleChange("symptoms", e.target.value)}
            />
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