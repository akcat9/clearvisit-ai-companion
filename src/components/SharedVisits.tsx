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
      const { data, error } = await supabase
        .from('shared_visits')
        .select('*')
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching shared visits:', error);
        return;
      }

      setSharedVisits(data || []);
    } catch (error) {
      console.error('Error fetching shared visits:', error);
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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Shared Visit Summaries</h2>
      {sharedVisits.map((visit) => (
        <Card key={visit.id} className={visit.viewed_at ? "opacity-75" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Visit Summary
                {!visit.viewed_at && (
                  <Badge variant="secondary" className="ml-2">New</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(visit.shared_at), { addSuffix: true })}
                </span>
                {!visit.viewed_at ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsViewed(visit.id)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Mark as viewed
                  </Button>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    Viewed
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Shared with: {visit.recipient_email}</p>
              {visit.message && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">{visit.message}</p>
                </div>
              )}
            </div>
            
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
  );
};

export default SharedVisits;