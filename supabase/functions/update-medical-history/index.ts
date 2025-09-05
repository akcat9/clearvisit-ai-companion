import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const { visitSummary, userId } = await req.json();
    
    if (!visitSummary || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Processing visit summary for user:', userId);
    console.log('Visit summary data:', visitSummary);

    // Extract medical information from visit summary using AI
    let extractedInfo: any = {};
    
    if (openAIApiKey && visitSummary) {
      try {
        const extractionPrompt = `
        Analyze this doctor visit summary and extract key medical information in JSON format.
        Focus on: new medications, medication changes, new diagnoses, symptoms mentioned, test results, and recommendations.
        
        Visit Summary: ${JSON.stringify(visitSummary)}
        
        Return a JSON object with this structure:
        {
          "date": "visit date if available",
          "medications": {
            "new": ["list of new medications prescribed"],
            "changed": ["list of medications with dosage changes"],
            "discontinued": ["list of stopped medications"]
          },
          "diagnoses": ["list of new conditions or diagnoses"],
          "symptoms": ["key symptoms discussed"],
          "testResults": ["important test results mentioned"],
          "recommendations": ["key doctor recommendations"],
          "followUp": ["follow-up instructions"]
        }
        
        Only include information that is explicitly mentioned. Use empty arrays for missing categories.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-mini-2025-08-07',
            messages: [
              { role: 'system', content: 'You are a medical information extraction assistant. Return only valid JSON.' },
              { role: 'user', content: extractionPrompt }
            ],
            max_completion_tokens: 1000,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const content = aiData.choices[0].message.content;
          
          try {
            extractedInfo = JSON.parse(content);
            console.log('Extracted medical info:', extractedInfo);
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback extraction from visit summary
            extractedInfo = extractBasicInfo(visitSummary);
          }
        }
      } catch (aiError) {
        console.error('OpenAI extraction error:', aiError);
        // Fallback extraction
        extractedInfo = extractBasicInfo(visitSummary);
      }
    } else {
      // Fallback extraction when OpenAI is not available
      extractedInfo = extractBasicInfo(visitSummary);
    }

    // Get current profile and AI history
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('ai_generated_history')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current AI history or initialize empty array
    const currentHistory = profile?.ai_generated_history || [];
    
    // Add new entry with timestamp
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'visit_summary',
      ...extractedInfo
    };
    
    const updatedHistory = [...currentHistory, newEntry];

    // Update profile with new AI-generated history
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        ai_generated_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update medical history' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extractedInfo: newEntry,
      totalEntries: updatedHistory.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-medical-history function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback extraction function for basic information
function extractBasicInfo(visitSummary: any) {
  const info: any = {
    date: new Date().toISOString().split('T')[0],
    medications: { new: [], changed: [], discontinued: [] },
    diagnoses: [],
    symptoms: [],
    testResults: [],
    recommendations: [],
    followUp: []
  };

  // Extract from prescriptions if available
  if (visitSummary.prescriptions?.length) {
    info.medications.new = visitSummary.prescriptions.map((p: any) => 
      `${p.medication} - ${p.dosage}${p.instructions ? ` (${p.instructions})` : ''}`
    );
  }

  // Extract from key symptoms
  if (visitSummary.keySymptoms?.length) {
    info.symptoms = visitSummary.keySymptoms;
  }

  // Extract from doctor recommendations
  if (visitSummary.doctorRecommendations?.length) {
    info.recommendations = visitSummary.doctorRecommendations;
  }

  // Extract from follow-up actions
  if (visitSummary.followUpActions?.length) {
    info.followUp = visitSummary.followUpActions;
  }

  return info;
}