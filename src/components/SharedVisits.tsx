import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff } from "lucide-react";

interface SharedVisit {
  id: string;
  sender_id: string;
  recipient_email: string;
  visit_summary: any;
  appointment_data: {
    doctor_name: string;
    date: string;
    time: string;
    reason: string;
    goal?: string;
  } | null;
  sender_profile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  message: string | null;
  shared_at: string;
  viewed_at: string | null;
}

const SharedVisits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sharedVisits, setSharedVisits] = useState<SharedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSharedVisits();
  }, [user]);

  const fetchSharedVisits = async () => {
    try {
      // The RLS policies will automatically filter to only show visits shared with this user
      const { data, error } = await supabase
        .from('shared_visits')
        .select('*')
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared visits:', error);
        toast({
          title: "Error loading shared visits",
          description: "Please try refreshing the page",
          variant: "destructive",
        });
        return;
      }

      setSharedVisits((data || []) as SharedVisit[]);
    } catch (error) {
      console.error('Error fetching shared visits:', error);
      toast({
        title: "Error loading shared visits",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('shared_visits')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', visitId);

      if (error) {
        console.error('Error marking as viewed:', error);
        return;
      }

      // Update local state
      setSharedVisits(prev => 
        prev.map(visit => 
          visit.id === visitId 
            ? { ...visit, viewed_at: new Date().toISOString() }
            : visit
        )
      );

      toast({
        title: "Marked as viewed",
        description: "Visit summary marked as viewed",
      });
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading shared visits...</p>
      </div>
    );
  }

  if (sharedVisits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No shared visits yet</p>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = sharedVisits.filter(visit => !visit.viewed_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Medical Inbox</h2>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>
      
      <div className="grid gap-4">
        {sharedVisits.map((visit) => (
          <Card key={visit.id} className={`transition-all duration-200 ${!visit.viewed_at ? "border-l-4 border-l-blue-500 shadow-md bg-gradient-to-r from-blue-50/50 to-transparent" : "border-l-4 border-l-gray-200"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {visit.appointment_data ? `Visit with Dr. ${visit.appointment_data.doctor_name}` : 'Visit Summary'}
                    </CardTitle>
                    {!visit.viewed_at && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>
                    )}
                  </div>
                  {visit.sender_profile && (
                    <p className="text-sm text-muted-foreground">
                      From: {visit.sender_profile.first_name} {visit.sender_profile.last_name} ({visit.sender_profile.email})
                    </p>
                  )}
                  {visit.appointment_data && (
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>📅 {visit.appointment_data.date}</span>
                      <span>🕐 {visit.appointment_data.time}</span>
                      <span>📋 {visit.appointment_data.reason}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(visit.shared_at), { addSuffix: true })}
                  </span>
                  {!visit.viewed_at ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsViewed(visit.id)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      Mark read
                    </Button>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <EyeOff className="w-3 h-3" />
                      Read
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {visit.message && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium mb-1">Personal Message:</p>
                  <p className="text-sm text-amber-700">{visit.message}</p>
                </div>
              )}
              
              {/* Visit Summary Content */}
              {visit.visit_summary && (
                <div className="space-y-3">
                  {visit.visit_summary.visitSummary && (
                    <div>
                      <h4 className="font-medium mb-1">Visit Summary</h4>
                      <p className="text-sm text-muted-foreground">{visit.visit_summary.visitSummary}</p>
                    </div>
                  )}
                  
                  {visit.visit_summary.keySymptoms && visit.visit_summary.keySymptoms.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Key Symptoms</h4>
                      <div className="flex flex-wrap gap-1">
                        {visit.visit_summary.keySymptoms.map((symptom: string, index: number) => (
                          <Badge key={index} variant="secondary">{symptom}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {visit.visit_summary.prescriptions && visit.visit_summary.prescriptions !== "None mentioned" && (
                    <div>
                      <h4 className="font-medium mb-1">Prescriptions</h4>
                      <p className="text-sm text-muted-foreground">{visit.visit_summary.prescriptions}</p>
                    </div>
                  )}
                  
                  {visit.visit_summary.followUpActions && visit.visit_summary.followUpActions !== "None specified" && (
                    <div>
                      <h4 className="font-medium mb-1">Follow-up Actions</h4>
                      <p className="text-sm text-muted-foreground">{visit.visit_summary.followUpActions}</p>
                    </div>
                  )}
                  
                  {visit.visit_summary.questionsForDoctor && visit.visit_summary.questionsForDoctor.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Questions for Doctor</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {visit.visit_summary.questionsForDoctor.map((question: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SharedVisits;