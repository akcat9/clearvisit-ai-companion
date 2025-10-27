import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  goal?: string;
  symptoms?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export const useAppointment = (appointmentId: string | undefined, userId: string | undefined) => {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!appointmentId || !userId) {
      setLoading(false);
      return;
    }
    
    fetchAppointment();
  }, [appointmentId, userId]);

  const fetchAppointment = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (error || !data) {
        toast({
          title: "Appointment not found",
          description: "The appointment you're looking for doesn't exist.",
          variant: "destructive",
        });
        return;
      }

      setAppointment({
        id: data.id,
        doctorName: data.doctor_name,
        date: data.date,
        time: data.time,
        reason: data.reason,
        goal: data.goal,
        symptoms: data.symptoms,
        status: data.status as 'upcoming' | 'completed' | 'cancelled',
      });
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast({
        title: "Error loading appointment",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { appointment, loading, refetch: fetchAppointment };
};
