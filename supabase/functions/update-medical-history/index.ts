import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { visitSummary, appointmentId } = await req.json();
    console.log('📝 Updating medical history for user:', user.id);

    if (!visitSummary) {
      return new Response(JSON.stringify({ error: 'No visit summary provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing medical history
    const { data: existingHistory } = await supabaseClient
      .from('medical_history')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Use AI to extract and merge medical data
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingData = existingHistory || {
      current_medications: [],
      chronic_conditions: [],
      allergies: [],
      visit_derived_data: {}
    };

    const prompt = `Extract medical information from this visit summary and merge with existing history.

EXISTING MEDICAL HISTORY:
- Current Medications: ${JSON.stringify(existingData.current_medications || [])}
- Chronic Conditions: ${JSON.stringify(existingData.chronic_conditions || [])}
- Allergies: ${JSON.stringify(existingData.allergies || [])}

VISIT SUMMARY:
${JSON.stringify(visitSummary)}

Extract and return JSON with:
1. new_medications: Array of new medications mentioned (name, dosage, frequency if available)
2. new_conditions: Array of any diagnosed conditions
3. new_allergies: Array of any allergies mentioned
4. key_findings: Array of important findings from this visit
5. recommendations: Array of doctor recommendations

Only include NEW information not already in existing history. Return valid JSON only:
{
  "new_medications": [],
  "new_conditions": [],
  "new_allergies": [],
  "key_findings": [],
  "recommendations": []
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a medical data extraction assistant. Extract medical information and return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('❌ AI extraction failed:', response.status);
      // Still update the visit sync time even if AI fails
      await updateHistoryRecord(supabaseClient, user.id, existingHistory, null, appointmentId);
      return new Response(JSON.stringify({ success: true, ai_extraction: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch {
      console.error('❌ Failed to parse AI response');
      extractedData = { new_medications: [], new_conditions: [], new_allergies: [], key_findings: [], recommendations: [] };
    }

    // Merge new data with existing
    const updatedMedications = mergeArrays(existingData.current_medications || [], extractedData.new_medications || []);
    const updatedConditions = mergeArrays(existingData.chronic_conditions || [], extractedData.new_conditions || []);
    const updatedAllergies = mergeArrays(existingData.allergies || [], extractedData.new_allergies || []);

    // Update visit derived data with timestamp
    const visitDerivedData = existingData.visit_derived_data || {};
    if (appointmentId) {
      visitDerivedData[appointmentId] = {
        date: new Date().toISOString(),
        key_findings: extractedData.key_findings || [],
        recommendations: extractedData.recommendations || []
      };
    }

    await updateHistoryRecord(supabaseClient, user.id, existingHistory, {
      current_medications: updatedMedications,
      chronic_conditions: updatedConditions,
      allergies: updatedAllergies,
      visit_derived_data: visitDerivedData
    }, appointmentId);

    console.log('✅ Medical history updated successfully');
    return new Response(JSON.stringify({ 
      success: true, 
      extracted: extractedData,
      updated: {
        medications: updatedMedications.length,
        conditions: updatedConditions.length,
        allergies: updatedAllergies.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to update medical history' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mergeArrays(existing: any[], newItems: any[]): any[] {
  const merged = [...existing];
  for (const item of newItems) {
    const itemStr = typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item).toLowerCase();
    const exists = merged.some(e => {
      const eStr = typeof e === 'string' ? e.toLowerCase() : JSON.stringify(e).toLowerCase();
      return eStr.includes(itemStr) || itemStr.includes(eStr);
    });
    if (!exists && item) {
      merged.push(item);
    }
  }
  return merged;
}

async function updateHistoryRecord(
  supabase: any, 
  userId: string, 
  existing: any, 
  updates: any,
  appointmentId?: string
) {
  const record = {
    user_id: userId,
    last_visit_sync: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(updates || {})
  };

  if (existing) {
    await supabase
      .from('medical_history')
      .update(record)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('medical_history')
      .insert(record);
  }
}
