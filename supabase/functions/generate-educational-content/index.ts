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

    const { reason, symptoms, goal } = await req.json();

    const prompt = `Generate educational content for a patient visiting their doctor for: ${reason}${symptoms ? `. Symptoms: ${symptoms}` : ''}${goal ? `. Goal: ${goal}` : ''}

Create 4 detailed sections with medical specificity:

What it is: (Explain the condition with basic medical/scientific details, causes, and mechanisms. Include relevant anatomy or physiology. 35-50 words)

What to expect: (Describe the visit process, tests, examinations, and what the doctor will likely do. Be specific about procedures. 35-50 words)

Common treatments: (List specific treatment options, medications, therapies, or procedures. Include how they work and success rates when relevant. 35-50 words)

Questions to ask: (Provide 2-3 specific, important questions patients should ask their doctor about their condition. 25-35 words)

Use plain text only - NO markdown symbols, asterisks, or special formatting. Use simple medical language that patients can understand but include proper medical terminology. Make content informative and evidence-based.`;

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
            content: 'You are a helpful medical AI assistant providing educational content for patients. Always respond with clear, compassionate, and informative content.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 400,
        
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const content = data.choices[0].message.content;
    
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-educational-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});