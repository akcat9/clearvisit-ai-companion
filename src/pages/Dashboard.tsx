import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { MobileAppointmentCard } from "@/components/MobileAppointmentCard";
import { Plus, User, Share2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentModal } from "@/components/AppointmentModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnreadSharedVisits } from "@/hooks/useUnreadSharedVisits";
import { useMobileFeatures } from "@/hooks/useMobileFeatures";
import { ImpactStyle } from "@capacitor/haptics";

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
  const { triggerHaptic } = useMobileFeatures();

  useEffect(() => {
    if (!user) return;
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
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
  };

  const handleDeleteAppointment = async (appointmentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

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
    
    await triggerHaptic(ImpactStyle.Light);

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

  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  const previousAppointments = appointments.filter(apt => apt.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6" />
              <span className="text-xl font-semibold">ClearVisit AI</span>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm">Welcome, {user.email}</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2"
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader title="My Appointments" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Desktop Header Actions */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowAppointmentModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/shared-visits")}
              className="flex items-center gap-2 relative"
            >
              <Share2 className="w-4 h-4" />
              Shared Visits
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View Medical Profile
            </Button>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button 
            onClick={() => setShowAppointmentModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/shared-visits")}
            className="flex items-center gap-2 whitespace-nowrap relative"
            size="sm"
          >
            <Share2 className="w-4 h-4" />
            Shared Visits
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 whitespace-nowrap"
            size="sm"
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          {/* Upcoming Appointments */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No upcoming appointments</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <MobileAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onDelete={handleDeleteAppointment}
                    onClick={() => navigate(`/visit/${appointment.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Previous Appointments */}
          {previousAppointments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Previous</h2>
              <div className="space-y-3">
                {previousAppointments.map((appointment) => (
                  <MobileAppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onDelete={handleDeleteAppointment}
                    onClick={() => navigate(`/visit/${appointment.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
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
                <p className="text-muted-foreground text-center py-8">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer group relative"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctor_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {appointment.time}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
                <p className="text-muted-foreground text-center py-8">No previous appointments</p>
              ) : (
                <div className="space-y-4">
                  {previousAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer group relative"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctor_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {appointment.time}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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

        <div className="text-center text-sm text-muted-foreground mt-12 mb-20 md:mb-0">
          © 2025 ClearVisit AI. All rights reserved.
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />

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