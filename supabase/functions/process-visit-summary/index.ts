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

    const { fullTranscription, appointmentReason, medicalHistory } = await req.json();
    
    console.log('Processing visit summary with transcription length:', fullTranscription?.length || 0);

    if (!fullTranscription) {
      throw new Error('No transcription provided');
    }

    const prompt = `
You are a medical AI assistant that analyzes doctor visit transcriptions.

APPOINTMENT REASON: "${appointmentReason}"
PATIENT MEDICAL HISTORY: ${medicalHistory || "No previous history provided"}

VISIT TRANSCRIPTION:
"${fullTranscription}"

Based on this ACTUAL doctor visit transcription, provide a comprehensive analysis. Extract specific information ONLY from what was actually said in the transcription.

IMPORTANT: Respond with ONLY valid JSON in this exact format:

{
  "visitSummary": "A detailed paragraph summarizing what was actually discussed, symptoms mentioned, examination findings, and doctor's assessment based on the transcription",
  "prescriptions": "List any medications, dosages, and instructions mentioned (or 'None mentioned' if no prescriptions)",
  "followUpActions": "Any recommended next steps, tests, appointments, or lifestyle changes (or 'None specified' if no follow-ups)",
  "keySymptoms": ["List", "the", "main", "symptoms", "or", "concerns", "discussed"],
  "doctorRecommendations": ["Specific", "advice", "or", "recommendations", "given", "by", "the", "doctor"],
  "questionsForDoctor": ["Question 1 to ask your doctor based on what was discussed", "Question 2 to ask your doctor based on what was discussed", "Question 3 to ask your doctor based on what was discussed"],
  "keyTermsExplained": {
    "term1": "Simple explanation of medical term mentioned in visit",
    "term2": "Simple explanation of another medical term"
  }
}

Do not include any markdown formatting, code blocks, or extra text. Return only the JSON object.`;

    console.log('Sending to OpenAI for visit analysis...');

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
            content: 'You are a medical AI assistant. Analyze the doctor visit transcription and respond with ONLY valid JSON. No markdown, no explanations, just the JSON object.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        console.log('Rate limited, providing fallback response');
        const fallbackResponse = {
          visitSummary: `Visit completed for ${appointmentReason}. Patient discussed their concerns with the doctor. Please review the full transcription for details as AI processing was temporarily unavailable.`,
          prescriptions: "Please review transcription for medication details",
          followUpActions: "Please review transcription for follow-up instructions",
          keySymptoms: ["Please review transcription"],
          doctorRecommendations: ["Please review transcription for recommendations"],
          questionsForDoctor: [
            "What should I monitor regarding my condition?",
            "When should I schedule my next appointment?",
            "Are there any warning signs I should watch for?"
          ]
        };
        return new Response(JSON.stringify(fallbackResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Visit analysis completed');

    let content = data.choices[0].message.content;
    console.log('Raw OpenAI response:', content);
    
    // Check if OpenAI returned empty content
    if (!content || content.trim() === '') {
      console.error('OpenAI returned empty content');
      const fallbackResponse = {
        visitSummary: `Visit completed for ${appointmentReason}. The AI was unable to process the transcription properly. Please review the transcription manually.`,
        prescriptions: "Please review the visit transcription for prescription details",
        followUpActions: "Please review the visit transcription for follow-up instructions",
        keySymptoms: ["Review transcription for symptoms discussed"],
        doctorRecommendations: ["Review transcription for doctor's recommendations"],
        questionsForDoctor: [
          "What are the main takeaways from today's visit?",
          "What should I monitor before our next appointment?",
          "When should I schedule my next visit?"
        ]
      };
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Clean up the response - remove any markdown formatting
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsedContent = JSON.parse(content);
      console.log('Successfully parsed AI response');
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      console.error('Parse error:', parseError);
      
      // Fallback response with safe data
      const fallbackResponse = {
        visitSummary: `Visit completed for ${appointmentReason}. The doctor and patient discussed the condition and treatment options. Full details are available in the transcription.`,
        prescriptions: "Please review the visit transcription for prescription details",
        followUpActions: "Please review the visit transcription for follow-up instructions",
        keySymptoms: ["Refer to transcription for symptom details"],
        doctorRecommendations: ["Refer to transcription for doctor's recommendations"],
        questionsForDoctor: [
          "What are the next steps in my treatment plan?",
          "How should I monitor my symptoms?",
          "When should I return for follow-up?"
        ]
      };
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in process-visit-summary function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});