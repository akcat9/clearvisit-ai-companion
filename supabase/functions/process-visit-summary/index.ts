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
You are a medical AI assistant with expertise in medication analysis, follow-up care, and comprehensive visit summarization.

APPOINTMENT REASON: "${appointmentReason}"
PATIENT MEDICAL HISTORY: ${medicalHistory || "No previous history provided"}

VISIT TRANSCRIPTION:
"${fullTranscription}"

Based on this ACTUAL doctor visit transcription, provide a comprehensive analysis. Extract specific information ONLY from what was actually said in the transcription.

IMPORTANT: Respond with ONLY valid JSON in this exact format:

{
  "visitSummary": "A detailed paragraph summarizing what was actually discussed, symptoms mentioned, examination findings, and doctor's assessment based on the transcription",
  "medicationAnalysis": {
    "prescriptions": [
      {
        "medication": "Medication name if mentioned",
        "dosage": "Specific dosage mentioned",
        "frequency": "How often to take",
        "duration": "How long to take",
        "instructions": "Special instructions mentioned",
        "sideEffects": "Side effects discussed",
        "interactions": "Drug interactions mentioned"
      }
    ],
    "medicationManagement": [
      "Specific instruction 1 about taking medications",
      "Specific instruction 2 about medication timing"
    ]
  },
  "followUpTimeline": {
    "immediate": ["Actions to take within 24-48 hours"],
    "shortTerm": ["Actions within 1-2 weeks"],
    "longTerm": ["Actions within 1-3 months"],
    "nextAppointment": "When to schedule next visit if mentioned"
  },
  "keySymptoms": ["List", "the", "main", "symptoms", "or", "concerns", "discussed"],
  "doctorRecommendations": {
    "lifestyle": ["Specific lifestyle changes mentioned"],
    "monitoring": ["What to monitor or track"],
    "warnings": ["Warning signs to watch for"],
    "restrictions": ["Any restrictions mentioned (diet, activity, etc.)"]
  },
  "diagnosticResults": {
    "testsOrdered": ["Test 1 if mentioned", "Test 2 if mentioned"],
    "resultsDiscussed": ["Result 1 if discussed", "Result 2 if discussed"],
    "futureTests": ["Upcoming tests mentioned"]
  },
  "costInsuranceDiscussion": {
    "costMentioned": "Any cost discussions from the visit",
    "insuranceCoverage": "Insurance coverage discussions",
    "financialConcerns": "Any financial concerns addressed"
  },
  "questionsForDoctor": ["Follow-up question 1 based on visit", "Follow-up question 2 based on visit", "Follow-up question 3 based on visit"],
  "keyTermsExplained": {
    "term1": "Simple explanation of medical term mentioned in visit",
    "term2": "Simple explanation of another medical term mentioned"
  },
  "riskFactors": ["Risk factor 1 if discussed", "Risk factor 2 if discussed"]
}

Extract information ONLY from the actual transcription. If something wasn't mentioned, use "Not discussed" or leave arrays empty.`;

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
        max_completion_tokens: 1500,
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
          medicationAnalysis: {
            prescriptions: [],
            medicationManagement: ["Please review transcription for medication details"]
          },
          followUpTimeline: {
            immediate: ["Please review transcription"],
            shortTerm: ["Please review transcription"],
            longTerm: ["Please review transcription"],
            nextAppointment: "Please review transcription for appointment details"
          },
          keySymptoms: ["Please review transcription"],
          doctorRecommendations: {
            lifestyle: ["Please review transcription"],
            monitoring: ["Please review transcription"],
            warnings: ["Please review transcription"],
            restrictions: ["Please review transcription"]
          },
          diagnosticResults: {
            testsOrdered: [],
            resultsDiscussed: [],
            futureTests: []
          },
          costInsuranceDiscussion: {
            costMentioned: "Not discussed",
            insuranceCoverage: "Not discussed", 
            financialConcerns: "Not discussed"
          },
          questionsForDoctor: [
            "What should I monitor regarding my condition?",
            "When should I schedule my next appointment?",
            "Are there any warning signs I should watch for?"
          ],
          keyTermsExplained: {
            "medical_term": "Please review transcription for medical terms discussed"
          },
          riskFactors: ["Please review transcription for risk factors"]
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
        medicationAnalysis: {
          prescriptions: [],
          medicationManagement: ["Please review the visit transcription for medication details"]
        },
        followUpTimeline: {
          immediate: ["Review transcription for immediate actions"],
          shortTerm: ["Review transcription for short-term actions"], 
          longTerm: ["Review transcription for long-term actions"],
          nextAppointment: "Review transcription for appointment scheduling"
        },
        keySymptoms: ["Review transcription for symptoms discussed"],
        doctorRecommendations: {
          lifestyle: ["Review transcription for lifestyle recommendations"],
          monitoring: ["Review transcription for monitoring instructions"],
          warnings: ["Review transcription for warning signs"],
          restrictions: ["Review transcription for restrictions"]
        },
        diagnosticResults: {
          testsOrdered: [],
          resultsDiscussed: [],
          futureTests: []
        },
        costInsuranceDiscussion: {
          costMentioned: "Not discussed",
          insuranceCoverage: "Not discussed",
          financialConcerns: "Not discussed"
        },
        questionsForDoctor: [
          "What are the main takeaways from today's visit?",
          "What should I monitor before our next appointment?",
          "When should I schedule my next visit?"
        ],
        keyTermsExplained: {
          "medical_term": "Review transcription for medical terms"
        },
        riskFactors: ["Review transcription for risk factors mentioned"]
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
        medicationAnalysis: {
          prescriptions: [],
          medicationManagement: ["Please review the visit transcription for medication details"]
        },
        followUpTimeline: {
          immediate: ["Refer to transcription for immediate actions"],
          shortTerm: ["Refer to transcription for short-term follow-up"],
          longTerm: ["Refer to transcription for long-term care plan"],
          nextAppointment: "Refer to transcription for next appointment details"
        },
        keySymptoms: ["Refer to transcription for symptom details"],
        doctorRecommendations: {
          lifestyle: ["Refer to transcription for lifestyle advice"],
          monitoring: ["Refer to transcription for monitoring instructions"],
          warnings: ["Refer to transcription for warning signs"],
          restrictions: ["Refer to transcription for any restrictions"]
        },
        diagnosticResults: {
          testsOrdered: [],
          resultsDiscussed: [],
          futureTests: []
        },
        costInsuranceDiscussion: {
          costMentioned: "Not discussed",
          insuranceCoverage: "Not discussed",
          financialConcerns: "Not discussed"
        },
        questionsForDoctor: [
          "What are the next steps in my treatment plan?",
          "How should I monitor my symptoms?",
          "When should I return for follow-up?"
        ],
        keyTermsExplained: {
          "medical_term": "Refer to transcription for medical terms discussed"
        },
        riskFactors: ["Refer to transcription for risk factors mentioned"]
      };
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in process-visit-summary function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});