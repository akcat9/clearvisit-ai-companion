import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, MessageSquare, Check } from 'lucide-react';
import { format } from 'date-fns';

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

  return (
    <div className="max-w-4xl mx-auto">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading messages...</p>
        </div>
      ) : sharedVisits.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No shared visits yet</h3>
          <p className="text-muted-foreground">
            When someone shares a visit summary with you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sharedVisits.map((visit) => {
            const isUnread = !visit.viewed_at;
            const senderName = visit.sender_profile?.first_name && visit.sender_profile?.last_name
              ? `${visit.sender_profile.first_name} ${visit.sender_profile.last_name}`
              : visit.sender_profile?.email || 'Unknown sender';
            
            return (
              <div key={visit.id} className="flex justify-start">
                <div className={`max-w-3xl ${isUnread ? 'animate-pulse' : ''}`}>
                  {/* Message bubble */}
                  <div className={`
                    rounded-2xl p-4 shadow-sm border
                    ${isUnread 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-white border-gray-200'
                    }
                  `}>
                    {/* Sender info and timestamp */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{senderName}</span>
                        {isUnread && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(visit.shared_at), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    {/* Personal message */}
                    {visit.message && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 italic">"{visit.message}"</p>
                      </div>
                    )}

                    {/* Appointment details */}
                    {visit.appointment_data && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Dr. {visit.appointment_data.doctor_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {visit.appointment_data.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {visit.appointment_data.time}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Visit reason: </span>
                          {visit.appointment_data.reason}
                        </p>
                      </div>
                    )}

                    {/* Visit summary */}
                    <div className="space-y-3">
                      {visit.visit_summary.visitSummary && (
                        <div>
                          <h6 className="font-medium text-xs text-gray-600 mb-1">📋 Summary</h6>
                          <p className="text-sm">{visit.visit_summary.visitSummary}</p>
                        </div>
                      )}

                      {visit.visit_summary.keySymptoms && visit.visit_summary.keySymptoms.length > 0 && (
                        <div>
                          <h6 className="font-medium text-xs text-gray-600 mb-1">🩺 Symptoms</h6>
                          <div className="flex flex-wrap gap-1">
                            {visit.visit_summary.keySymptoms.map((symptom: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">{symptom}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {visit.visit_summary.prescriptions && visit.visit_summary.prescriptions !== "None mentioned" && (
                        <div>
                          <h6 className="font-medium text-xs text-gray-600 mb-1">💊 Prescriptions</h6>
                          <p className="text-sm">{visit.visit_summary.prescriptions}</p>
                        </div>
                      )}

                      {visit.visit_summary.followUpActions && visit.visit_summary.followUpActions !== "None specified" && (
                        <div>
                          <h6 className="font-medium text-xs text-gray-600 mb-1">📅 Follow-up</h6>
                          <p className="text-sm">{visit.visit_summary.followUpActions}</p>
                        </div>
                      )}

                      {visit.visit_summary.questionsForDoctor && visit.visit_summary.questionsForDoctor.length > 0 && (
                        <div>
                          <h6 className="font-medium text-xs text-gray-600 mb-1">❓ Questions</h6>
                          <ul className="text-sm space-y-1">
                            {visit.visit_summary.questionsForDoctor.map((question: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-primary text-xs">•</span>
                                <span className="text-sm">{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Mark as read button */}
                    {isUnread && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markAsViewed(visit.id)}
                          className="text-xs h-7"
                        >
                          Mark as read
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedVisits;