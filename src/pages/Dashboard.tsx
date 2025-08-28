import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppointmentModal } from "@/components/AppointmentModal";

interface Appointment {
  id: string;
  doctorName: string;
  date: string;
  time: string;
  reason: string;
  status: 'upcoming' | 'completed';
}

const Dashboard = () => {
  const [user, setUser] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = localStorage.getItem("clearvisit_user");
    if (!currentUser) {
      navigate("/");
      return;
    }
    setUser(currentUser);

    // Load sample appointments
    const savedAppointments = localStorage.getItem("clearvisit_appointments");
    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("clearvisit_user");
    navigate("/");
  };

  const handleCreateAppointment = (appointmentData: any) => {
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      ...appointmentData,
      status: 'upcoming' as const
    };
    
    const updatedAppointments = [...appointments, newAppointment];
    setAppointments(updatedAppointments);
    localStorage.setItem("clearvisit_appointments", JSON.stringify(updatedAppointments));
    setShowAppointmentModal(false);
  };

  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  const previousAppointments = appointments.filter(apt => apt.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user || undefined} onLogout={handleLogout} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
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
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View Medical Profile
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No upcoming appointments</p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {appointment.time}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
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
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/visit/${appointment.id}`)}
                    >
                      <div className="font-medium">{appointment.doctorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.date} at {appointment.time}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {appointment.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-12">
          © 2025 ClearVisit AI. All rights reserved.
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