import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Plus, Share2, Trash2, HelpCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentModal } from "@/components/AppointmentModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnreadSharedVisits } from "@/hooks/useUnreadSharedVisits";
import { formatTime } from "@/utils/timeUtils";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefresh } from "@/components/PullToRefresh";
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
  const { user } = useAuth();
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

  const { 
    containerRef, 
    pullDistance, 
    isRefreshing, 
    shouldShowIndicator 
  } = usePullToRefresh({
    onRefresh: fetchAppointments,
    threshold: 80
  });


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

  return (
    <div className="min-h-screen bg-background" ref={containerRef}>
      <PullToRefresh 
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
        shouldShow={shouldShowIndicator}
      />
      <Header />
      
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Appointments</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-8 sm:w-8 p-0">
                  <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-2 sm:mx-auto sm:max-w-md max-w-[calc(100vw-1rem)]">
                <DialogHeader>
                  <DialogTitle className="text-sm sm:text-base">How to Use Clearvisit</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Simple steps to get started:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div>• <strong>Create appointments</strong> - Click "New Appointment" to schedule visits</div>
                  <div>• <strong>Record visits</strong> - Click on any appointment to record audio during your visit</div>
                  <div>• <strong>Share visits</strong> - Share visit recordings with family or other doctors</div>
                  <div>• <strong>Get AI insights</strong> - Receive personalized medical insights from your visit recordings</div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            <Button 
              onClick={() => setShowAppointmentModal(true)}
              className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-3"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>New Appointment</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/shared-visits")}
              className="flex items-center justify-center gap-1 sm:gap-2 relative text-xs sm:text-sm py-2 px-3"
              size="sm"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Shared Visits</span>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-destructive rounded-full"></div>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground text-xs sm:text-sm">Loading appointments...</p>
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm">No upcoming appointments</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Click "New Appointment" to schedule your first visit</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                       className="p-2 sm:p-3 lg:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer group relative transition-colors"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium text-sm sm:text-base pr-8">{appointment.doctor_name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {appointment.date} at {formatTime(appointment.time)}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 pr-8 line-clamp-2">
                        {appointment.reason}
                      </div>
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/visit/${appointment.id}`);
                          }}
                        >
                          Go <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={(e) => handleDeleteAppointment(appointment.id, e)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Previous Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {previousAppointments.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm">No previous appointments</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Completed appointments will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {previousAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-2 sm:p-3 lg:p-4 border rounded-lg hover:bg-muted/50 cursor-pointer group relative transition-colors"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium text-sm sm:text-base pr-8">{appointment.doctor_name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {appointment.date} at {formatTime(appointment.time)}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1 pr-8 line-clamp-2">
                        {appointment.reason}
                      </div>
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/visit/${appointment.id}`);
                          }}
                        >
                          Go <ChevronRight className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={(e) => handleDeleteAppointment(appointment.id, e)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs sm:text-sm text-muted-foreground mt-8 sm:mt-12">
          © 2025 Clearvisit. All rights reserved.
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