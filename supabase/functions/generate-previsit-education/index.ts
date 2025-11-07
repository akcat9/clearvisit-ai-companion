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
You are a medical educator specializing in condition-specific patient preparation for doctor visits.

CRITICAL: Every single tip, question, and piece of advice MUST be specifically tailored to this patient's exact condition. Never give generic advice.

PATIENT'S CONDITION:
- Main Reason for Visit: "${appointmentReason}"
- Patient's Goal: "${goal || 'Not specified'}"
- Current Symptoms: "${symptoms || 'Not specified'}"

YOUR TASK: Create highly specific, actionable education content for THIS EXACT CONDITION. Each section must reference the patient's condition directly.

REQUIRED JSON FORMAT (respond with ONLY valid JSON):

{
  "symptomsAndHistory": {
    "title": "Understanding Your ${appointmentReason} - Symptoms and History",
    "trackingTips": [
      "For ${appointmentReason}, track: [specific symptom tracking for this condition]",
      "Monitor: [condition-specific triggers and patterns]",
      "Keep a log of: [specific things to track for this condition]"
    ],
    "descriptors": [
      "Common descriptions for ${appointmentReason}: [condition-specific descriptor]",
      "[Another condition-specific way to describe the problem]",
      "[Third condition-specific descriptor]"
    ],
    "importantNotes": [
      "For ${appointmentReason}, make sure to mention: [condition-specific medications/history]",
      "[Condition-specific allergy or interaction concerns]",
      "[Condition-specific past medical history to mention]"
    ]
  },
  "questionsForDoctor": {
    "title": "Questions About Your ${appointmentReason}",
    "topConcerns": [
      "For ${appointmentReason}, your top concerns should include: [specific concern]",
      "[Another condition-specific priority]"
    ],
    "effectiveQuestions": [
      "What treatment options exist specifically for ${appointmentReason}?",
      "With ${appointmentReason}, what's the expected timeline for [condition-specific outcome]?",
      "If [condition-specific treatment] doesn't work, what's next?",
      "[Another highly specific question for this condition]"
    ],
    "clarificationPrompts": [
      "How will treating my ${appointmentReason} affect [condition-specific daily activity]?",
      "What warning signs specific to ${appointmentReason} should I watch for?",
      "Can you explain how [condition-specific treatment/test] works?"
    ]
  },
  "testsAndMedications": {
    "title": "Tests and Treatments for ${appointmentReason}",
    "whatToExpect": [
      "For ${appointmentReason}, common tests include: [specific test 1 and why]",
      "[Specific test/procedure 2 for this condition]",
      "[What to expect during condition-specific examination]"
    ],
    "medications": [
      "Common medications for ${appointmentReason}: [specific drug class and examples]",
      "For ${appointmentReason}, ask about: [condition-specific medication concerns]",
      "[Condition-specific side effects to discuss]"
    ],
    "referrals": [
      "With ${appointmentReason}, you may be referred to: [specific specialist type]",
      "[Condition-specific follow-up timing and why]",
      "[What happens if symptoms persist - condition-specific next steps]"
    ]
  },
  "communicationAndLiteracy": {
    "title": "Communicating About Your ${appointmentReason}",
    "explainingSymptoms": [
      "When describing ${appointmentReason}, focus on: [specific aspect 1]",
      "For ${appointmentReason}, doctors need to know: [specific information]",
      "[Condition-specific timeline or severity information to share]"
    ],
    "takingNotes": [
      "Use Tadoc's AI to capture: [condition-specific instructions]",
      "Write down: [specific information for this condition]",
      "Record: [condition-specific medication names or dosages]"
    ],
    "confirmUnderstanding": [
      "For ${appointmentReason} treatment, ask the doctor to explain: [specific thing]",
      "Confirm you understand: [condition-specific instruction or restriction]",
      "[Condition-specific follow-up question to ensure understanding]"
    ]
  },
  "insuranceAndCosts": {
    "title": "Coverage and Costs for ${appointmentReason}",
    "insurance": [
      "For ${appointmentReason}, verify coverage for: [specific test/treatment]",
      "[Condition-specific prior authorization concern]",
      "Check if [condition-specific medication or procedure] requires special approval"
    ],
    "whatToBring": [
      "For ${appointmentReason}, bring: [condition-specific documents]",
      "List of: [condition-specific medications or supplements]",
      "[Condition-specific previous test results or imaging]"
    ],
    "costTips": [
      "For ${appointmentReason}, ask about cost of: [specific treatment or test]",
      "[Condition-specific generic medication alternatives]",
      "Check if [condition-specific therapy or treatment] is covered"
    ]
  }
}

REMEMBER: Mention "${appointmentReason}" frequently throughout. Never give generic advice - everything must be specific to THIS condition.`;

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
            content: 'You are a medical educator specializing in condition-specific patient education. Every piece of advice must be tailored to the patient\'s exact medical situation - never give generic tips. Respond only with valid JSON in the exact format requested.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      // Fallback response with condition awareness
      const fallbackContent = {
        symptomsAndHistory: {
          title: `Understanding Your ${appointmentReason} - Symptoms and History`,
          trackingTips: [`For ${appointmentReason}, track when symptoms started and patterns`, `Note what makes your ${appointmentReason} symptoms better or worse`, `Keep a daily log of your ${appointmentReason} progression`],
          descriptors: [`Describe your ${appointmentReason} intensity (1-10 scale)`, `Note the location and nature of your ${appointmentReason}`, `Use clear terms for your ${appointmentReason} symptoms`],
          importantNotes: [`List medications you're taking for ${appointmentReason}`, `Mention any drug allergies relevant to ${appointmentReason} treatment`, `Note your history with ${appointmentReason} or similar conditions`]
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