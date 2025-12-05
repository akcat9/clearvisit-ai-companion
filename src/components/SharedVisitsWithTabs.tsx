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
      <div className="bg-card rounded-lg shadow-sm border h-full overflow-hidden">
        {!selectedConversation ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="text-lg font-semibold">Messages</h2>
              <p className="text-sm text-muted-foreground">Shared visit summaries</p>
            </div>
            <Tabs defaultValue="received" className="flex-1 flex flex-col min-h-0">
              <div className="px-4 pt-2 flex-shrink-0">
                <TabsList className="w-full">
                  <TabsTrigger value="received" className="flex-1">Received</TabsTrigger>
                  <TabsTrigger value="sent" className="flex-1">Sent</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="received" className="mt-0">
                  <ConversationList onSelectConversation={handleSelectConversation} />
                </TabsContent>
                <TabsContent value="sent" className="mt-0">
                  <SentMessagesList />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <ConversationView
            senderId={selectedConversation.senderId}
            senderProfile={selectedConversation.senderProfile}
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  );
};

export default SharedVisitsWithTabs;