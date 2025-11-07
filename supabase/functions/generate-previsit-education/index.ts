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
You are a medical educator helping patients prepare for their doctor visits. Create concise, practical education content.

APPOINTMENT DETAILS:
- Reason: "${appointmentReason}"
- Goal: "${goal || 'Not specified'}"
- Symptoms: "${symptoms || 'Not specified'}"

Create education content in EXACTLY these 5 categories. Keep content practical and actionable.

Respond with ONLY valid JSON in this exact format:

{
  "symptomsAndHistory": {
    "title": "Understanding Symptoms and History",
    "trackingTips": ["Tip about tracking onset, duration, triggers", "Tip about relief methods", "Another tracking tip"],
    "descriptors": ["Common descriptor 1 (e.g., sharp vs dull pain)", "Descriptor 2 (e.g., localized vs radiating)", "Descriptor 3"],
    "importantNotes": ["Note about medications to mention", "Note about allergies", "Note about past conditions"]
  },
  "questionsForDoctor": {
    "title": "Preparing Questions for the Doctor",
    "topConcerns": ["How to list top 3 concerns", "How to prioritize what matters most"],
    "effectiveQuestions": ["What are my treatment options?", "What's the next step if this doesn't work?", "What should I expect?"],
    "clarificationPrompts": ["Can you explain that in simpler terms?", "How will this affect my daily life?", "What are the risks and benefits?"]
  },
  "testsAndMedications": {
    "title": "Understanding Tests, Medications, and Referrals",
    "whatToExpect": ["What to expect from labs", "What imaging tests might involve", "How prescriptions work"],
    "medications": ["Difference between generic and brand", "Questions to ask about side effects", "Cost considerations"],
    "referrals": ["How referrals work", "What follow-ups might be needed", "When to schedule next appointment"]
  },
  "communicationAndLiteracy": {
    "title": "Communication and Health Literacy",
    "explainingSymptoms": ["How to describe symptoms without jargon", "Using specific examples", "Being clear about timeline"],
    "takingNotes": ["Using Tadoc's AI transcription feature", "Writing down key points", "Recording important instructions"],
    "confirmUnderstanding": ["Using teach-back method", "Asking for clarification", "Confirming next steps"]
  },
  "insuranceAndCosts": {
    "title": "Insurance, Costs, and Visit Logistics",
    "insurance": ["How to confirm coverage before visit", "Understanding co-pays and deductibles", "Prior authorization basics"],
    "whatToBring": ["ID and insurance card", "Current medication list", "Referral forms if needed"],
    "costTips": ["Ask about payment options", "Inquire about generic alternatives", "Check if tests are covered"]
  }
}

Keep each section focused, practical, and specific to the appointment reason where relevant.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a medical educator. Create patient education content in simple, practical terms. Respond only with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Fallback response
      const fallbackContent = {
        symptomsAndHistory: {
          title: "Understanding Symptoms and History",
          trackingTips: ["Track when symptoms started and how they've changed", "Note what makes symptoms better or worse", "Keep a daily log if symptoms vary"],
          descriptors: ["Describe pain intensity (1-10 scale)", "Note location and if it moves", "Use clear terms like sharp, dull, throbbing"],
          importantNotes: ["List all current medications and supplements", "Mention any drug allergies", "Note relevant family health history"]
        },
        questionsForDoctor: {
          title: "Preparing Questions for the Doctor",
          topConcerns: ["Write down your top 3 concerns before the visit", "Prioritize what's most affecting your daily life"],
          effectiveQuestions: ["What are my treatment options?", "What happens if we don't treat this?", "What should I expect in terms of recovery?"],
          clarificationPrompts: ["Can you explain that in simpler terms?", "How will this affect my daily routine?", "What warning signs should I watch for?"]
        },
        testsAndMedications: {
          title: "Understanding Tests, Medications, and Referrals",
          whatToExpect: ["Labs may require fasting", "Imaging tests are usually painless", "Results may take a few days"],
          medications: ["Generic drugs have the same active ingredients as brand names", "Ask about side effects and interactions", "Check if samples are available"],
          referrals: ["Referrals connect you to specialists", "Schedule follow-ups before leaving", "Ask how long to wait for improvement"]
        },
        communicationAndLiteracy: {
          title: "Communication and Health Literacy",
          explainingSymptoms: ["Use specific examples and timeframes", "Avoid medical jargon unless you're certain", "Be honest about all symptoms, even embarrassing ones"],
          takingNotes: ["Use Tadoc's AI transcription to record the visit", "Write down medication names and dosages", "Note any follow-up instructions"],
          confirmUnderstanding: ["Repeat back instructions in your own words", "Ask the doctor to clarify anything unclear", "Confirm next steps before leaving"]
        },
        insuranceAndCosts: {
          title: "Insurance, Costs, and Visit Logistics",
          insurance: ["Call insurance before your visit to verify coverage", "Ask about co-pays when scheduling", "Understand what prior authorization means"],
          whatToBring: ["Photo ID and insurance card", "List of current medications with dosages", "Any referral paperwork"],
          costTips: ["Ask if generic options are available", "Inquire about payment plans if needed", "Check if tests can be done at lower-cost facilities"]
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
        symptomsAndHistory: {
          title: "Understanding Symptoms and History",
          trackingTips: ["Track symptom patterns", "Note triggers and relief", "Monitor changes over time"],
          descriptors: ["Use specific descriptive terms", "Note severity and location", "Describe timing and duration"],
          importantNotes: ["List medications and doses", "Mention allergies", "Note medical history"]
        },
        questionsForDoctor: {
          title: "Preparing Questions for the Doctor",
          topConcerns: ["List top 3 concerns", "Prioritize goals"],
          effectiveQuestions: ["What are my options?", "What's the timeline?", "What if this doesn't work?"],
          clarificationPrompts: ["Please explain in simpler terms", "How does this affect me?", "What should I watch for?"]
        },
        testsAndMedications: {
          title: "Understanding Tests, Medications, and Referrals",
          whatToExpect: ["Expect labs or imaging", "Understand prescription process", "Know result timelines"],
          medications: ["Ask about generic vs brand", "Discuss side effects", "Check costs"],
          referrals: ["Understand specialist referrals", "Schedule follow-ups", "Know next steps"]
        },
        communicationAndLiteracy: {
          title: "Communication and Health Literacy",
          explainingSymptoms: ["Use clear, specific language", "Provide examples", "Be thorough and honest"],
          takingNotes: ["Use Tadoc's AI transcription", "Write key points", "Record instructions"],
          confirmUnderstanding: ["Use teach-back method", "Ask for clarification", "Confirm next steps"]
        },
        insuranceAndCosts: {
          title: "Insurance, Costs, and Visit Logistics",
          insurance: ["Verify coverage", "Understand co-pays", "Check authorization needs"],
          whatToBring: ["ID and insurance", "Medication list", "Referral forms"],
          costTips: ["Ask about payment options", "Check generic availability", "Inquire about coverage"]
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
        symptomsAndHistory: {
          title: "Understanding Symptoms and History",
          trackingTips: ["Track symptoms", "Note patterns", "Monitor changes"],
          descriptors: ["Describe clearly", "Be specific", "Use examples"],
          importantNotes: ["List medications", "Note allergies", "Medical history"]
        },
        questionsForDoctor: {
          title: "Preparing Questions for the Doctor",
          topConcerns: ["List concerns", "Prioritize"],
          effectiveQuestions: ["What are options?", "Timeline?", "Next steps?"],
          clarificationPrompts: ["Explain simply", "How affects me?", "Watch for?"]
        },
        testsAndMedications: {
          title: "Understanding Tests, Medications, and Referrals",
          whatToExpect: ["Labs or imaging", "Prescriptions", "Results timing"],
          medications: ["Generic vs brand", "Side effects", "Costs"],
          referrals: ["Specialist referrals", "Follow-ups", "Next steps"]
        },
        communicationAndLiteracy: {
          title: "Communication and Health Literacy",
          explainingSymptoms: ["Clear language", "Examples", "Be honest"],
          takingNotes: ["Use Tadoc AI", "Key points", "Instructions"],
          confirmUnderstanding: ["Teach-back", "Clarify", "Confirm"]
        },
        insuranceAndCosts: {
          title: "Insurance, Costs, and Visit Logistics",
          insurance: ["Verify coverage", "Co-pays", "Authorization"],
          whatToBring: ["ID/insurance", "Med list", "Forms"],
          costTips: ["Payment options", "Generics", "Coverage"]
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