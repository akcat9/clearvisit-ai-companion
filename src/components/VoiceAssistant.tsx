import { useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, X, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("voice");
  
  // Quick Lookup state
  const [doctorName, setDoctorName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const conversation = useConversation({
    clientTools: {
      get_appointments: async () => {
        try {
          console.log('[get_appointments] Fetching appointments for user:', user?.id);
          const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', user?.id)
            .order('date', { ascending: true });

          if (error) throw error;
          console.log('[get_appointments] Found', data?.length || 0, 'appointments');
          return JSON.stringify(data || []);
        } catch (error) {
          console.error('[get_appointments] Error:', error);
          return JSON.stringify({ error: 'Failed to fetch appointments' });
        }
      },
      get_appointment_details: async ({ appointment_id }: { appointment_id: string }) => {
        try {
          console.log('[get_appointment_details] Received query:', appointment_id);
          
          // Check if it's a UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isUUID = uuidRegex.test(appointment_id);
          
          if (isUUID) {
            // Direct UUID lookup
            console.log('[get_appointment_details] Treating as UUID');
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
          }
          
          // Natural language query - fetch recent and upcoming appointments
          console.log('[get_appointment_details] Treating as natural language query');
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
          
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', user?.id)
            .gte('date', sixMonthsAgo.toISOString().split('T')[0])
            .lte('date', sixMonthsFromNow.toISOString().split('T')[0])
            .order('date', { ascending: true });
            
          if (error) throw error;
          console.log('[get_appointment_details] Found', appointments?.length || 0, 'appointments to search');
          
          if (!appointments || appointments.length === 0) {
            return JSON.stringify({ 
              error: 'No appointments found in the last 6 months or upcoming 6 months' 
            });
          }
          
          const query = appointment_id.toLowerCase();
          const now = new Date();
          
          // Intent detection
          const isLastVisit = query.includes('last') || query.includes('most recent') || query.includes('previous');
          const isNextVisit = query.includes('next') || query.includes('upcoming');
          
          let bestMatch = null;
          
          if (isLastVisit) {
            // Find most recent past appointment
            const pastAppointments = appointments.filter(apt => new Date(apt.date) < now);
            if (pastAppointments.length > 0) {
              bestMatch = pastAppointments[pastAppointments.length - 1];
              console.log('[get_appointment_details] Matched "last visit":', bestMatch.id);
            }
          } else if (isNextVisit) {
            // Find next upcoming appointment
            const futureAppointments = appointments.filter(apt => new Date(apt.date) >= now);
            if (futureAppointments.length > 0) {
              bestMatch = futureAppointments[0];
              console.log('[get_appointment_details] Matched "next appointment":', bestMatch.id);
            }
          } else {
            // Fuzzy match by doctor name, date, or time
            for (const apt of appointments) {
              let score = 0;
              
              // Doctor name match
              if (apt.doctor_name && query.includes(apt.doctor_name.toLowerCase())) {
                score += 10;
              }
              
              // Date matching (simple keyword check)
              const dateStr = apt.date.toLowerCase();
              if (query.includes(dateStr)) {
                score += 5;
              }
              
              // Time matching
              if (apt.time && query.includes(apt.time.toLowerCase().replace(':00', ''))) {
                score += 3;
              }
              
              if (score > 0 && (!bestMatch || score > (bestMatch as any).__score)) {
                (apt as any).__score = score;
                bestMatch = apt;
              }
            }
            
            if (bestMatch) {
              console.log('[get_appointment_details] Matched by fuzzy search:', bestMatch.id, 'with score:', (bestMatch as any).__score);
            }
          }
          
          if (!bestMatch) {
            console.log('[get_appointment_details] No match found for query');
            return JSON.stringify({ 
              error: `Could not find an appointment matching "${appointment_id}". Try asking for "last visit", "next appointment", or mention a doctor's name.` 
            });
          }
          
          // Fetch visit record for the matched appointment
          const { data: visitRecord } = await supabase
            .from('visit_records')
            .select('*')
            .eq('appointment_id', bestMatch.id)
            .maybeSingle();
            
          console.log('[get_appointment_details] Returning appointment:', bestMatch.id);
          return JSON.stringify({
            appointment: bestMatch,
            visit_record: visitRecord || null
          });
          
        } catch (error) {
          console.error('[get_appointment_details] Error:', error);
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

  const searchAndSpeak = async () => {
    if (!doctorName && !appointmentDate) {
      toast({
        title: "Please enter search criteria",
        description: "Enter doctor name or date",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      // Build query string
      let query = [];
      if (doctorName) query.push(doctorName);
      if (appointmentDate) query.push(appointmentDate);
      
      const queryStr = query.join(' ');
      console.log('[Quick Lookup] Searching for:', queryStr);

      // Fetch appointments similar to get_appointment_details logic
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user?.id)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .lte('date', sixMonthsFromNow.toISOString().split('T')[0])
        .order('date', { ascending: true });
        
      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        toast({
          title: "No appointments found",
          description: "No appointments found in the last 6 months or upcoming 6 months",
          variant: "destructive"
        });
        return;
      }

      // Match logic
      let bestMatch = null;
      let bestScore = 0;

      for (const apt of appointments) {
        let score = 0;
        
        if (doctorName && apt.doctor_name?.toLowerCase().includes(doctorName.toLowerCase())) {
          score += 10;
        }
        
        if (appointmentDate && apt.date === appointmentDate) {
          score += 8;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = apt;
        }
      }

      if (!bestMatch) {
        toast({
          title: "No match found",
          description: "Could not find an appointment matching your criteria",
          variant: "destructive"
        });
        return;
      }

      // Fetch visit record
      const { data: visitRecord } = await supabase
        .from('visit_records')
        .select('*')
        .eq('appointment_id', bestMatch.id)
        .maybeSingle();

      // Build speech text
      let speechText = `I found an appointment with ${bestMatch.doctor_name || 'a doctor'} on ${bestMatch.date} at ${bestMatch.time}. `;
      
      if (visitRecord?.summary) {
        const summary = visitRecord.summary as any;
        if (summary.visitSummary) {
          speechText += `Visit summary: ${summary.visitSummary}. `;
        }
        if (summary.doctorRecommendations) {
          // Handle doctor recommendations properly - it might be an object or string
          const recommendations = typeof summary.doctorRecommendations === 'string' 
            ? summary.doctorRecommendations 
            : JSON.stringify(summary.doctorRecommendations);
          speechText += `Doctor recommendations: ${recommendations}. `;
        }
        if (summary.prescriptions && summary.prescriptions.length > 0) {
          speechText += `Prescriptions: ${summary.prescriptions.join(', ')}. `;
        }
      } else {
        speechText += `No visit summary has been recorded yet.`;
      }

      console.log('[Quick Lookup] Speaking:', speechText);

      // Use OpenAI TTS
      setIsSpeaking(true);
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke('openai-tts', {
        body: { 
          text: speechText,
          voice: 'nova' // Nova voice
        }
      });

      if (ttsError) throw ttsError;

      // Play audio
      const audioBlob = new Blob([Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();

      toast({
        title: "Found appointment",
        description: `${bestMatch.doctor_name} on ${bestMatch.date}`
      });

    } catch (error) {
      console.error('[Quick Lookup] Error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Could not search appointments",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
      setIsSpeaking(false);
    }
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

          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="voice">Voice Chat</TabsTrigger>
                <TabsTrigger value="lookup">Quick Lookup</TabsTrigger>
              </TabsList>

              <TabsContent value="voice" className="space-y-6 mt-6">
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
              </TabsContent>

              <TabsContent value="lookup" className="space-y-6 mt-6">
                {/* Speaking Indicator */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">Speaking appointment details...</span>
                  </div>
                )}

                {/* Search Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="doctor">Doctor Name</Label>
                    <Input
                      id="doctor"
                      placeholder="e.g., Dr. Smith"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="date">Appointment Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={searchAndSpeak}
                    disabled={isSearching || isSpeaking}
                    size="lg"
                    className="w-full"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5 mr-2" />
                        Find & Speak Details
                      </>
                    )}
                  </Button>
                </div>

                {/* Instructions */}
                <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">How to use:</p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Enter doctor name or date (at least one)</li>
                    <li>Click "Find & Speak Details" to search</li>
                    <li>The assistant will speak the appointment information</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
