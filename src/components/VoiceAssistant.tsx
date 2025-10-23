import { useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

const AGENT_ID = "agent_8701k88xxkgmfx98fy3n1c8f24ng";

export const VoiceAssistant = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    clientTools: {
      get_appointments: async () => {
        try {
          const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', user?.id)
            .order('date', { ascending: true });

          if (error) throw error;
          return JSON.stringify(data || []);
        } catch (error) {
          console.error('Error fetching appointments:', error);
          return JSON.stringify({ error: 'Failed to fetch appointments' });
        }
      },
      get_appointment_details: async ({ appointment_id }: { appointment_id: string }) => {
        try {
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointment_id)
            .eq('user_id', user?.id)
            .single();

          if (aptError) throw aptError;

          const { data: visitRecord, error: visitError } = await supabase
            .from('visit_records')
            .select('*')
            .eq('appointment_id', appointment_id)
            .maybeSingle();

          return JSON.stringify({
            appointment,
            visit_record: visitRecord || null
          });
        } catch (error) {
          console.error('Error fetching appointment details:', error);
          return JSON.stringify({ error: 'Failed to fetch appointment details' });
        }
      }
    },
    onConnect: () => {
      console.log("Connected to ElevenLabs");
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast({
        title: "Error",
        description: "Failed to connect to voice assistant",
        variant: "destructive"
      });
      setIsConnecting(false);
    },
    onMessage: (message) => {
      console.log("Message:", message);
    }
  });

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId: AGENT_ID }
      });

      if (error) {
        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error("No signed URL received");
      }

      await conversation.startSession({ signedUrl: data.signedUrl });
      
      toast({
        title: "Connected",
        description: "Voice assistant is ready"
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect to voice assistant",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
    toast({
      title: "Disconnected",
      description: "Voice assistant session ended"
    });
  };

  return (
    <>
      {/* Floating Bubble Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
          size="icon"
        >
          <Mic className="h-6 w-6" />
        </Button>
      )}

      {/* Drawer for Expanded State */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>AI Voice Assistant</DrawerTitle>
                <DrawerDescription>
                  {conversation.status === "connected" 
                    ? "Voice assistant is active" 
                    : "Start a voice conversation"}
                </DrawerDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>

          <div className="p-6 space-y-6">
            {/* Status Indicator */}
            {conversation.status === "connected" && (
              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm font-medium text-success">Connected</span>
              </div>
            )}

            {/* Speaking Indicator */}
            {conversation.isSpeaking && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex gap-1">
                  <div className="h-3 w-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="h-3 w-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="h-3 w-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium text-primary">Assistant is speaking...</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col gap-3">
              {conversation.status === "connected" ? (
                <Button
                  onClick={endConversation}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  End Session
                </Button>
              ) : (
                <Button
                  onClick={startConversation}
                  disabled={isConnecting}
                  size="lg"
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Voice Chat
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">How to use:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Click "Start Voice Chat" to begin</li>
                <li>Speak naturally - the assistant will respond with voice</li>
                <li>Click "End Session" when done</li>
                <li>You can minimize this window anytime</li>
              </ul>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
