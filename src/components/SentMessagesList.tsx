import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Mail, Clock } from "lucide-react";

interface SentMessage {
  id: string;
  recipient_email: string;
  visit_summary: any;
  appointment_data: any;
  message: string | null;
  shared_at: string;
  viewed_at: string | null;
}

const SentMessagesList = () => {
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchSentMessages();
  }, [user]);

  const fetchSentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_visits')
        .select('*')
        .eq('sender_id', user?.id)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent messages:', error);
        return;
      }

      setSentMessages((data || []) as SentMessage[]);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading sent messages...</p>
      </div>
    );
  }

  if (sentMessages.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No sent messages yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Share a visit summary to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sentMessages.map((message) => (
        <Card key={message.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">To: {message.recipient_email}</span>
                  <Badge variant={message.viewed_at ? "default" : "secondary"}>
                    {message.viewed_at ? "Read" : "Unread"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Sent {format(new Date(message.shared_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  {message.viewed_at && (
                    <span className="ml-2">
                      Read {format(new Date(message.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {message.appointment_data && (
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <div className="text-sm">
                  <strong>Visit:</strong> {message.appointment_data.doctor_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {message.appointment_data.date} at {message.appointment_data.time}
                </div>
                <div className="text-sm text-muted-foreground">
                  {message.appointment_data.reason}
                </div>
              </div>
            )}
            
            {message.message && (
              <div className="text-sm bg-blue-50 rounded-lg p-3 mb-2">
                <strong>Message:</strong> {message.message}
              </div>
            )}
            
            {message.visit_summary && (
              <div className="text-sm bg-green-50 rounded-lg p-3">
                <strong>Visit Summary:</strong>
                <div className="mt-2 space-y-2">
                  {message.visit_summary.visitSummary && (
                    <div>
                      <p className="text-gray-700">{message.visit_summary.visitSummary}</p>
                    </div>
                  )}
                  
                  {message.visit_summary.keySymptoms && (
                    <div>
                      <em className="text-gray-600">Symptoms:</em> 
                      <span className="ml-1">
                        {Array.isArray(message.visit_summary.keySymptoms) 
                          ? message.visit_summary.keySymptoms.join(', ')
                          : message.visit_summary.keySymptoms}
                      </span>
                    </div>
                  )}
                  
                  {message.visit_summary.prescriptions && (
                    <div>
                      <em className="text-gray-600">Prescriptions:</em>
                      <span className="ml-1">
                        {Array.isArray(message.visit_summary.prescriptions) 
                          ? message.visit_summary.prescriptions.join(', ')
                          : message.visit_summary.prescriptions}
                      </span>
                    </div>
                  )}
                  
                  {message.visit_summary.doctorRecommendations && (
                    <div>
                      <em className="text-gray-600">Recommendations:</em>
                      <span className="ml-1">
                        {Array.isArray(message.visit_summary.doctorRecommendations) 
                          ? message.visit_summary.doctorRecommendations.join(', ')
                          : message.visit_summary.doctorRecommendations}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SentMessagesList;