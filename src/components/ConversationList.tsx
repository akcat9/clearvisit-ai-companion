import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Conversation {
  senderId: string;
  senderProfile: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface ConversationListProps {
  onSelectConversation: (senderId: string, senderProfile: any) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelectConversation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    // Set up real-time subscription
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_visits'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      // Get user's email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.email) return;

      // Fetch all shared visits for this user
      const { data: visits, error } = await supabase
        .from('shared_visits')
        .select('*')
        .eq('recipient_email', profile.email)
        .order('shared_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Group by sender and create conversation summaries
      const conversationMap = new Map<string, Conversation>();
      
      visits?.forEach((visit) => {
        const senderId = visit.sender_id;
        const existing = conversationMap.get(senderId);
        
        if (!existing || new Date(visit.shared_at) > new Date(existing.lastMessageTime)) {
          const appointmentData = visit.appointment_data as any;
          const lastMessage = visit.message || 
            (appointmentData?.doctor_name ? `Shared visit summary for ${appointmentData.doctor_name}` : 
            'Shared a visit summary');
          
          conversationMap.set(senderId, {
            senderId,
            senderProfile: visit.sender_profile as any,
            lastMessage,
            lastMessageTime: visit.shared_at,
            unreadCount: visits.filter(v => 
              v.sender_id === senderId && !v.viewed_at
            ).length
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSenderName = (senderProfile: any) => {
    if (!senderProfile) return 'Unknown';
    return senderProfile.first_name && senderProfile.last_name
      ? `${senderProfile.first_name} ${senderProfile.last_name}`
      : senderProfile.email || 'Unknown';
  };

  const getInitials = (senderProfile: any) => {
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
        <p className="mt-2 text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <div
          key={conversation.senderId}
          onClick={() => onSelectConversation(conversation.senderId, conversation.senderProfile)}
          className="flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer rounded-lg transition-colors"
        >
          <div className="relative">
            <Avatar className="h-10 w-10 md:h-12 md:w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(conversation.senderProfile)}
              </AvatarFallback>
            </Avatar>
            {conversation.unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm md:text-base truncate">
                {getSenderName(conversation.senderProfile)}
              </p>
              <span className="text-xs md:text-sm text-muted-foreground">
                {format(new Date(conversation.lastMessageTime), 'MMM d')}
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {conversation.lastMessage}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;