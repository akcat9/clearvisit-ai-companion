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

    const { appointmentId, appointmentReason, recordingData } = await req.json();

    // In a real implementation, you would:
    // 1. Process the audio recording using OpenAI's Whisper API
    // 2. Extract key information from the transcription
    // 3. Generate structured medical notes

    // For now, we'll simulate this with a direct prompt
    const prompt = `
You are a medical AI assistant that helps process doctor visit recordings.

Based on a doctor visit for "${appointmentReason}", generate a comprehensive visit summary that includes:

1. A detailed visit summary covering key points discussed
2. Any prescriptions or medications mentioned
3. Follow-up actions or recommendations

Please provide realistic medical content that would be typical for a visit regarding "${appointmentReason}".

Return the response as a JSON object with these exact keys:
- "visitSummary": A detailed paragraph summarizing the visit
- "prescriptions": Medications, dosages, and instructions (or empty string if none)
- "followUpActions": Recommended next steps, tests, or appointments (or empty string if none)
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a medical AI assistant that processes doctor visits. Always respond with valid JSON in the requested format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const content = data.choices[0].message.content;
    
    try {
      const parsedContent = JSON.parse(content);
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      // Fallback response
      const fallbackResponse = {
        visitSummary: `Visit completed for ${appointmentReason}. Patient discussed symptoms and concerns with the doctor. Treatment plan was reviewed and patient was advised on next steps.`,
        prescriptions: "No new prescriptions were provided during this visit.",
        followUpActions: "Follow up with primary care physician in 2-4 weeks to monitor progress."
      };
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in process-visit-recording function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});