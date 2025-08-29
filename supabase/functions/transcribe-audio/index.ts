import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { audioData, chunkIndex, totalChunks } = await req.json();
    console.log(`Processing audio chunk ${chunkIndex + 1} of ${totalChunks}`);

    if (!audioData) {
      throw new Error('No audio data provided');
    }

    // Convert base64 audio to blob for Whisper API
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const audioBlob = new Blob([bytes], { type: 'audio/wav' });
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, `audio_chunk_${chunkIndex}.wav`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Specify English for better accuracy
    
    console.log('Sending to Whisper API...');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Whisper API error: ${response.status} - ${errorText}`);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Transcription completed for chunk ${chunkIndex + 1}:`, data.text?.substring(0, 100) + '...');

    return new Response(JSON.stringify({
      transcription: data.text || '',
      chunkIndex,
      totalChunks,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      chunkIndex: -1 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});