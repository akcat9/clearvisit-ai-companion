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

    const prompt = `Generate very short educational content for a patient visiting their doctor for: ${reason}${symptoms ? `. Symptoms: ${symptoms}` : ''}${goal ? `. Goal: ${goal}` : ''}

Write exactly 2 short sentences (max 30 words total):
1. What this condition means in simple terms (10-15 words)
2. What to expect during the visit (10-15 words)

Use simple language. Separate sentences with a line break.

Example: "Hearing problems in the cochlea affect how you process sounds.

Your doctor will test your hearing and discuss treatment options."`;

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
        max_tokens: 100,
        temperature: 0.5,
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