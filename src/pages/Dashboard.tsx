import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Plus, Share2, Trash2, HelpCircle, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentModal } from "@/components/AppointmentModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnreadSharedVisits } from "@/hooks/useUnreadSharedVisits";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Appointment {
  id: string;
  doctor_name: string;
  date: string;
  time: string;
  reason: string;
  goal?: string;
  symptoms?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const Dashboard = () => {
  const { user, subscriptionStatus, subscriptionLoading } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { unreadCount } = useUnreadSharedVisits();

  const fetchAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error",
          description: "Failed to load appointments",
          variant: "destructive"
        });
        return;
      }

      setAppointments((data || []) as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    fetchAppointments();
  }, [user, fetchAppointments]);

  const formatTime = (timeString: string) => {
    try {
      // Parse the time string (e.g., "22:35:00" or "14:30:00")
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Format to 12-hour format
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  };

  const handleDeleteAppointment = async (appointmentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('Error deleting appointment:', error);
        toast({
          title: "Error",
          description: "Failed to delete appointment",
          variant: "destructive"
        });
        return;
      }

      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      toast({
        title: "Success",
        description: "Appointment deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          user_id: user.id,
          doctor_name: appointmentData.doctorName,
          date: appointmentData.date,
          time: appointmentData.time,
          reason: appointmentData.reason,
          goal: appointmentData.goal,
          symptoms: appointmentData.symptoms,
          status: 'upcoming'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        toast({
          title: "Error",
          description: "Failed to create appointment",
          variant: "destructive"
        });
        return;
      }

      setAppointments(prev => [...prev, data as Appointment]);
      setShowAppointmentModal(false);
      toast({
        title: "Success",
        description: "Appointment created successfully"
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const upcomingAppointments = useMemo(() => 
    appointments.filter(apt => apt.status === 'upcoming'), [appointments]
  );
  const previousAppointments = useMemo(() => 
    appointments.filter(apt => apt.status === 'completed'), [appointments]
  );

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // Show subscription required message if user is not subscribed or check failed
  if (!subscriptionStatus || !subscriptionStatus?.subscribed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <Card className="max-w-2xl mx-auto mt-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Lock className="h-6 w-6" />
                Subscription Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You need an active subscription to use tadoc. Please visit our website to subscribe.
              </p>
              <Button 
                onClick={() => window.open('https://tadoc.app', '_blank')}
                className="w-full"
              >
                Subscribe at tadoc.app
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">My Appointments</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>How to Use tadoc</DialogTitle>
                  <DialogDescription>
                    Simple steps to get started:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>• <strong>Create appointments</strong> - Click "New Appointment" to schedule visits</div>
                  <div>• <strong>Record visits</strong> - Click on any appointment to record audio during your visit</div>
                  <div>• <strong>Share visits</strong> - Share visit recordings with family or other doctors</div>
                  <div>• <strong>Get AI insights</strong> - Receive personalized medical insights from your visit recordings</div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={() => setShowAppointmentModal(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:inline">New Appointment</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/shared-visits")}
              className="flex items-center justify-center gap-2 relative w-full sm:w-auto"
              size="sm"
            >
              <Share2 className="w-4 h-4" />
              <span className="sm:inline">Shared Visits</span>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></div>
              )}
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading appointments...</p>
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Appointment" to schedule your first visit</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-3 sm:p-4 border rounded-lg group relative transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctor_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {formatTime(appointment.time)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/visit/${appointment.id}`);
                          }}
                        >
                          Go <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={(e) => handleDeleteAppointment(appointment.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Previous Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {previousAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No previous appointments</p>
                  <p className="text-sm text-muted-foreground mt-1">Completed appointments will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previousAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-3 sm:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer group relative transition-colors"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctor_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {formatTime(appointment.time)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/visit/${appointment.id}`);
                          }}
                        >
                          Go <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={(e) => handleDeleteAppointment(appointment.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-12">
          © 2025 tadoc. All rights reserved.
        </div>
      </div>

      {showAppointmentModal && (
        <AppointmentModal
          onClose={() => setShowAppointmentModal(false)}
          onSubmit={handleCreateAppointment}
        />
      )}
    </div>
  );
};

export default Dashboard;
