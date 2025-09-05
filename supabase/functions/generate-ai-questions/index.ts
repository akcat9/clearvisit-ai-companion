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

    const { appointmentReason, medicalHistory, medications, allergies, userId, aiGeneratedHistory } = await req.json();

    // Analyze AI-generated history for recent changes
    const contextFromHistory = analyzeAIHistory(aiGeneratedHistory);
    
    const prompt = `
You are a medical AI assistant helping patients prepare for their doctor appointments.

Given the following information:
- Appointment reason: ${appointmentReason}
- Medical history: ${medicalHistory || "None provided"}
- Current medications: ${medications || "None provided"}
- Known allergies: ${allergies || "None provided"}

Recent Medical Changes (from AI analysis of past visits):
${contextFromHistory}

Generate exactly 3 specific, personalized questions that this patient should ask their doctor during their appointment. The questions should be:
1. Relevant to their appointment reason and medical history
2. If recent medication changes are noted, include relevant medication questions
3. If new symptoms were recently documented, ask about progression or management
4. Actionable and specific
5. Help the patient get the most value from their visit
6. Focus on recent changes when medically relevant

Return the response as a JSON object with a "questions" array containing exactly 3 strings.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful medical AI assistant. Always respond with valid JSON in the requested format.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 500,
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
      const fallbackQuestions = {
        questions: [
          `What specific treatment options are available for my ${appointmentReason}?`,
          "Based on my medical history, are there any risks I should be aware of?",
          "What symptoms should prompt me to seek immediate medical attention?"
        ]
      };
      return new Response(JSON.stringify(fallbackQuestions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-ai-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeAIHistory(aiHistory: any[]): string {
  if (!aiHistory || aiHistory.length === 0) {
    return "No recent medical history available.";
  }

  const recentEntries = aiHistory.slice(-3); // Last 3 entries
  let context = "";
  
  recentEntries.forEach((entry: any, index: number) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    context += `\nVisit ${index + 1} (${date}):\n`;
    
    if (entry.medications?.new?.length) {
      context += `- New medications prescribed: ${entry.medications.new.join(', ')}\n`;
    }
    
    if (entry.medications?.changed?.length) {
      context += `- Medication changes: ${entry.medications.changed.join(', ')}\n`;
    }
    
    if (entry.symptoms?.length) {
      context += `- Reported symptoms: ${entry.symptoms.join(', ')}\n`;
    }
    
    if (entry.diagnoses?.length) {
      context += `- New diagnoses: ${entry.diagnoses.join(', ')}\n`;
    }
    
    if (entry.recommendations?.length) {
      context += `- Doctor recommendations: ${entry.recommendations.join(', ')}\n`;
    }
  });
  
  return context || "No specific medical changes noted in recent visits.";
}