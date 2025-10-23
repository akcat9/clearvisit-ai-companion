import { useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const VoiceAssistant = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentId, setAgentId] = useState("");

  const conversation = useConversation({
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
    if (!agentId.trim()) {
      toast({
        title: "Agent ID Required",
        description: "Please enter an ElevenLabs Agent ID first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-signed-url', {
        body: { agentId: agentId.trim() }
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">AI Voice Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">ElevenLabs Agent ID</label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Enter your agent ID"
            className="w-full px-3 py-2 border rounded-md text-sm"
            disabled={conversation.status === "connected"}
          />
          <p className="text-xs text-muted-foreground">
            Get your Agent ID from the ElevenLabs dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          {conversation.status === "connected" ? (
            <>
              <Button
                onClick={endConversation}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <MicOff className="w-4 h-4" />
                End Session
              </Button>
              {conversation.isSpeaking && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Assistant is speaking...
                </span>
              )}
            </>
          ) : (
            <Button
              onClick={startConversation}
              disabled={isConnecting || !agentId.trim()}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Voice Chat
                </>
              )}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Enter your ElevenLabs Agent ID above</li>
            <li>Click "Start Voice Chat" to begin</li>
            <li>Speak naturally - the assistant will respond with voice</li>
            <li>Click "End Session" when done</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
