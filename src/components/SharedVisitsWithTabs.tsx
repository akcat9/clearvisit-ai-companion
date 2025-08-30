import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import SentMessagesList from './SentMessagesList';

const SharedVisitsWithTabs = () => {
  const [selectedConversation, setSelectedConversation] = useState<{
    senderId: string;
    senderProfile: any;
  } | null>(null);

  const handleSelectConversation = (senderId: string, senderProfile: any) => {
    setSelectedConversation({ senderId, senderProfile });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-200px)]">
      <div className="bg-white rounded-lg shadow-sm border h-full flex">
        {!selectedConversation ? (
          <div className="w-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Messages</h2>
              <p className="text-sm text-muted-foreground">Shared visit summaries</p>
            </div>
            <Tabs defaultValue="received" className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="received" className="flex-1">Received</TabsTrigger>
                <TabsTrigger value="sent" className="flex-1">Sent</TabsTrigger>
              </TabsList>
              <TabsContent value="received" className="p-4">
                <ConversationList onSelectConversation={handleSelectConversation} />
              </TabsContent>
              <TabsContent value="sent" className="p-4">
                <SentMessagesList />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="w-full">
            <ConversationView
              senderId={selectedConversation.senderId}
              senderProfile={selectedConversation.senderProfile}
              onBack={handleBackToList}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedVisitsWithTabs;