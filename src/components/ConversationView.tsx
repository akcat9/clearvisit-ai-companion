import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, User, Check } from 'lucide-react';
import { format } from 'date-fns';

interface SharedVisit {
  id: string;
  sender_id: string;
  visit_summary: any;
  appointment_data: {
    doctor_name: string;
    date: string;
    time: string;
    reason: string;
    goal?: string;
  } | null;
  message: string | null;
  shared_at: string;
  viewed_at: string | null;
}

interface ConversationViewProps {
  senderId: string;
  senderProfile: any;
  onBack: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ senderId, senderProfile, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SharedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [senderId]);

  const fetchMessages = async () => {
    try {
      // Get user's email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.email) return;

      const { data, error } = await supabase
        .from('shared_visits')
        .select('*')
        .eq('sender_id', senderId)
        .eq('recipient_email', profile.email)
        .order('shared_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages((data || []) as any);
      
      // Mark all unread messages as read
      const unreadIds = data?.filter(m => !m.viewed_at).map(m => m.id) || [];
      if (unreadIds.length > 0) {
        await markMessagesAsRead(unreadIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (messageIds: string[]) => {
    try {
      const { error } = await supabase
        .from('shared_visits')
        .update({ viewed_at: new Date().toISOString() })
        .in('id', messageIds);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Update local state
      setMessages(prev => 
        prev.map(message => 
          messageIds.includes(message.id)
            ? { ...message, viewed_at: new Date().toISOString() }
            : message
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getSenderName = () => {
    if (!senderProfile) return 'Unknown';
    return senderProfile.first_name && senderProfile.last_name
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : senderProfile.email || 'Unknown';
  };

  const getInitials = () => {
    if (!senderProfile) return 'U';
    if (senderProfile.first_name && senderProfile.last_name) {
      return `${senderProfile.first_name[0]}${senderProfile.last_name[0]}`.toUpperCase();
    }
    return senderProfile.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{getSenderName()}</p>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex justify-start">
            <div className="max-w-3xl">
              {/* Message bubble */}
              <div className="bg-gray-100 rounded-2xl rounded-tl-md p-4 shadow-sm">
                {/* Timestamp */}
                <div className="text-xs text-muted-foreground mb-2">
                  {format(new Date(message.shared_at), 'MMM d, h:mm a')}
                </div>

                {/* Personal message */}
                {message.message && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900 italic">"{message.message}"</p>
                  </div>
                )}

                {/* Appointment details */}
                {message.appointment_data && (
                  <div className="mb-3 p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Dr. {message.appointment_data.doctor_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {message.appointment_data.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {message.appointment_data.time}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Visit reason: </span>
                      {message.appointment_data.reason}
                    </p>
                  </div>
                )}

                {/* Visit summary */}
                <div className="space-y-3">
                  {message.visit_summary.visitSummary && (
                    <div>
                      <h6 className="font-medium text-xs text-gray-600 mb-1">📋 Summary</h6>
                      <p className="text-sm">{message.visit_summary.visitSummary}</p>
                    </div>
                  )}

                  {message.visit_summary.keySymptoms && message.visit_summary.keySymptoms.length > 0 && (
                    <div>
                      <h6 className="font-medium text-xs text-gray-600 mb-1">🩺 Symptoms</h6>
                      <div className="flex flex-wrap gap-1">
                        {message.visit_summary.keySymptoms.map((symptom: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">{symptom}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.visit_summary.prescriptions && message.visit_summary.prescriptions !== "None mentioned" && (
                    <div>
                      <h6 className="font-medium text-xs text-gray-600 mb-1">💊 Prescriptions</h6>
                      <p className="text-sm">{message.visit_summary.prescriptions}</p>
                    </div>
                  )}

                  {message.visit_summary.followUpActions && message.visit_summary.followUpActions !== "None specified" && (
                    <div>
                      <h6 className="font-medium text-xs text-gray-600 mb-1">📅 Follow-up</h6>
                      <p className="text-sm">{message.visit_summary.followUpActions}</p>
                    </div>
                  )}

                  {message.visit_summary.questionsForDoctor && message.visit_summary.questionsForDoctor.length > 0 && (
                    <div>
                      <h6 className="font-medium text-xs text-gray-600 mb-1">❓ Questions</h6>
                      <ul className="text-sm space-y-1">
                        {message.visit_summary.questionsForDoctor.map((question: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary text-xs">•</span>
                            <span className="text-sm">{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Read status */}
                {message.viewed_at && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3" />
                    Read
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationView;