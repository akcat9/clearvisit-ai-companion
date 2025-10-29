import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { appointmentReason, goal, symptoms } = await req.json();
    
    console.log('Generating pre-visit education for:', appointmentReason);

    const prompt = `
You are a medical educator with expertise in pharmaceuticals, diagnostics, and comprehensive patient care. Create detailed pre-visit education content.

APPOINTMENT DETAILS:
- Reason: "${appointmentReason}"
- Goal: "${goal || 'Not specified'}"
- Symptoms: "${symptoms || 'Not specified'}"

Create comprehensive educational content to help the patient understand their condition BEFORE their visit. Include specific medical information while keeping language accessible.

Respond with ONLY valid JSON in this exact format:

{
  "mainCondition": {
    "title": "Most likely condition name based on reason/symptoms",
    "description": "Brief 1-line description",
    "explanation": "2-3 sentences explaining what this condition is in simple terms"
  },
  "possibleCauses": ["Specific cause 1", "Specific cause 2", "Specific cause 3"],
  "commonSymptoms": ["Specific symptom 1", "Specific symptom 2", "Specific symptom 3"],
  "preparationTips": [
    "Specific preparation tip for this condition",
    "Another preparation tip", 
    "Third tip for the visit"
  ],
  "questionsToAsk": [
    "Important question about diagnosis",
    "Question about treatment options",
    "Question about prognosis and management"
  ],
  "pharmaceuticals": {
    "title": "Common Medications for This Condition",
    "medications": [
      {
        "name": "Medication name (generic/brand)",
        "purpose": "What it treats",
        "commonSideEffects": ["Side effect 1", "Side effect 2"],
        "interactions": "Important drug interactions to discuss"
      }
    ]
  },
  "diagnosticTests": {
    "title": "Tests Your Doctor May Order",
    "tests": [
      {
        "name": "Test name",
        "purpose": "What it checks for",
        "procedure": "How it's done",
        "preparation": "How to prepare"
      }
    ]
  },
  "treatmentTimeline": {
    "title": "What to Expect",
    "phases": [
      {
        "phase": "Initial treatment",
        "duration": "Time frame",
        "expectations": "What to expect during this phase"
      }
    ]
  },
  "lifestyleFactors": {
    "title": "Lifestyle Considerations",
    "diet": ["Dietary recommendation 1", "Dietary recommendation 2"],
    "exercise": ["Exercise guideline 1", "Exercise guideline 2"],
    "lifestyle": ["Lifestyle modification 1", "Lifestyle modification 2"]
  },
  "costInsurance": {
    "title": "Cost and Insurance Information",
    "questions": [
      "What will this treatment cost?",
      "Is this covered by my insurance?",
      "Are there generic alternatives?"
    ],
    "tips": ["Cost-saving tip 1", "Insurance tip 2"]
  }
}

Include specific drug names, test procedures, and measurable recommendations where appropriate. Keep explanations simple but comprehensive.`;

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
            content: 'You are a medical educator. Create patient education content in simple terms. Respond only with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Fallback response
      const fallbackContent = {
        mainCondition: {
          title: appointmentReason || "Your Health Concern",
          description: "Your doctor will help evaluate your condition",
          explanation: "During your visit, your doctor will examine you and discuss your symptoms to determine the best treatment plan for your health concern."
        },
        possibleCauses: [
          "Various factors can contribute to this condition",
          "Your doctor will help identify the specific cause",
          "Medical history and symptoms provide important clues"
        ],
        commonSymptoms: [
          "Symptoms can vary from person to person",
          "Your specific symptoms will be discussed",
          "Keep track of when symptoms occur"
        ],
        preparationTips: [
          "Write down all your symptoms and when they started",
          "List any medications you are currently taking",
          "Prepare questions about your condition"
        ],
        questionsToAsk: [
          "What is causing my symptoms?",
          "What treatment options are available?", 
          "How can I manage this condition?"
        ],
        pharmaceuticals: {
          title: "Medications Discussion",
          medications: []
        },
        diagnosticTests: {
          title: "Potential Tests",
          tests: []
        },
        treatmentTimeline: {
          title: "Treatment Expectations",
          phases: []
        },
        lifestyleFactors: {
          title: "Lifestyle Considerations",
          diet: ["Discuss dietary needs with your doctor"],
          exercise: ["Get exercise recommendations from your doctor"],
          lifestyle: ["Review lifestyle factors during your visit"]
        },
        costInsurance: {
          title: "Financial Planning",
          questions: ["What will treatment cost?", "Is this covered by insurance?"],
          tips: ["Ask about payment options", "Inquire about generic medications"]
        }
      };
      
      return new Response(JSON.stringify(fallbackContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Generated pre-visit education successfully');

    let content = data.choices[0].message.content;
    
    if (!content || content.trim() === '') {
      console.error('OpenAI returned empty content');
      const fallbackContent = {
        mainCondition: {
          title: appointmentReason || "Your Health Concern",
          description: "Your doctor will help evaluate your condition",
          explanation: "During your visit, your doctor will examine you and discuss your symptoms to determine the best treatment plan."
        },
        possibleCauses: ["Multiple factors may be involved", "Your doctor will investigate", "Medical evaluation will help determine"],
        commonSymptoms: ["Varies by individual", "Will be discussed during visit", "Keep track of your experiences"],
        preparationTips: [
          "List your main concerns",
          "Note symptom patterns", 
          "Bring medication list"
        ],
        questionsToAsk: [
          "What should I know about my condition?",
          "What are my treatment options?",
          "How can I best manage this?"
        ],
        pharmaceuticals: {
          title: "Medications Discussion",
          medications: []
        },
        diagnosticTests: {
          title: "Potential Tests",
          tests: []
        },
        treatmentTimeline: {
          title: "Treatment Expectations",
          phases: []
        },
        lifestyleFactors: {
          title: "Lifestyle Considerations",
          diet: ["Discuss with your doctor"],
          exercise: ["Get recommendations during visit"],
          lifestyle: ["Review during appointment"]
        },
        costInsurance: {
          title: "Financial Planning",
          questions: ["Ask about costs", "Check insurance coverage"],
          tips: ["Inquire about options", "Ask about alternatives"]
        }
      };
      
      return new Response(JSON.stringify(fallbackContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsedContent = JSON.parse(content);
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      
      const fallbackContent = {
        mainCondition: {
          title: appointmentReason || "Your Health Concern", 
          description: "Your doctor will help evaluate your condition",
          explanation: "Your doctor will examine your symptoms and provide guidance on your health concern during the visit."
        },
        possibleCauses: ["Will be determined during evaluation"],
        commonSymptoms: ["Will be discussed with your doctor"],
        preparationTips: ["Prepare your questions", "List your symptoms", "Bring medical history"],
        questionsToAsk: ["What is my diagnosis?", "What are treatment options?", "What should I expect?"],
        pharmaceuticals: {
          title: "Medications Discussion",
          medications: []
        },
        diagnosticTests: {
          title: "Potential Tests",
          tests: []
        },
        treatmentTimeline: {
          title: "Treatment Expectations",
          phases: []
        },
        lifestyleFactors: {
          title: "Lifestyle Considerations",
          diet: ["Discuss with doctor"],
          exercise: ["Get recommendations"],
          lifestyle: ["Review during visit"]
        },
        costInsurance: {
          title: "Financial Planning",
          questions: ["Ask about costs"],
          tips: ["Inquire about options"]
        }
      };
      
      return new Response(JSON.stringify(fallbackContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-previsit-education:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});