import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sanitizeForPrompt, checkRateLimit } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const languageNames: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'ar': 'Arabic'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user info for rate limiting (optional)
    let user = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data } = await supabaseClient.auth.getUser();
        user = data?.user;
        
        if (user) {
          const rateLimit = checkRateLimit(user.id, 50, 60000);
          if (!rateLimit.allowed) {
            return new Response(
              JSON.stringify({ error: 'Too many requests, please wait a moment' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (authError) {
        console.log('Auth check skipped:', authError.message);
      }
    }

    const { appointmentReason, goal, symptoms, language = 'en' } = await req.json();
    console.log('📝 Received request:', { appointmentReason, goal, symptoms, language });

    if (!appointmentReason || appointmentReason.trim().length < 2) {
      console.error('❌ Validation failed: appointment reason too short');
      return new Response(
        JSON.stringify({ error: 'Please provide an appointment reason (at least 2 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeReason = sanitizeForPrompt(appointmentReason, 500);
    const safeGoal = goal ? sanitizeForPrompt(goal, 500) : '';
    const safeSymptoms = symptoms ? sanitizeForPrompt(symptoms, 1000) : '';
    const outputLanguage = languageNames[language] || 'English';

    // Use Lovable AI Gateway (faster than OpenAI)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('✅ Lovable AI key found, generating in:', outputLanguage);

    const prompt = `You are a medical education AI. Provide pre-visit education for a patient.

Appointment Reason: ${safeReason}
${safeGoal ? `Patient Goal: ${safeGoal}` : ''}
${safeSymptoms ? `Symptoms: ${safeSymptoms}` : ''}

Respond ONLY in valid JSON format with ALL content in ${outputLanguage}:
{
  "causesAndPathophysiology": {
    "title": "[Title in ${outputLanguage}]",
    "primaryCauses": ["Cause 1", "Cause 2", "Cause 3"],
    "riskFactors": ["Risk 1", "Risk 2"],
    "underlyingMechanisms": ["Mechanism 1", "Mechanism 2"]
  },
  "treatmentRecommendations": {
    "title": "[Title in ${outputLanguage}]",
    "firstLineTherapies": ["Treatment 1", "Treatment 2"],
    "alternativeApproaches": ["Alternative 1", "Alternative 2"],
    "expectedOutcomes": ["Outcome 1", "Outcome 2"],
    "lifestyleModifications": ["Modification 1", "Modification 2"]
  },
  "medicationInformation": {
    "title": "[Title in ${outputLanguage}]",
    "commonMedications": ["Medication 1", "Medication 2", "Medication 3"],
    "sideEffects": ["Side effect 1", "Side effect 2"],
    "drugInteractions": ["Interaction 1", "Interaction 2"]
  },
  "keyPointsForDoctor": {
    "title": "[Title in ${outputLanguage}]",
    "diagnosticQuestions": ["Question 1?", "Question 2?", "Question 3?"],
    "treatmentQuestions": ["Question 1?", "Question 2?", "Question 3?"],
    "prognosisQuestions": ["Question 1?", "Question 2?"]
  },
  "clinicalContext": {
    "title": "[Title in ${outputLanguage}]",
    "prevalence": "Prevalence info",
    "typicalPresentation": "Presentation info",
    "redFlags": ["Warning 1", "Warning 2"]
  }
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
          {
            role: 'system',
            content: `You are a medical education assistant. Always respond with valid JSON only. Generate all content in ${outputLanguage}.`
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lovable AI error:', response.status, errorText);
      
      // Handle rate limits
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service busy, please try again in a moment' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Return fallback
      return new Response(JSON.stringify(getFallbackContent(language)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    console.log('📦 Raw AI response length:', content.length);
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsedContent = JSON.parse(content);
      console.log('✅ Successfully parsed AI response in', outputLanguage);
      return new Response(JSON.stringify(parsedContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      return new Response(JSON.stringify(getFallbackContent(language)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to generate education content' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getFallbackContent(language: string) {
  return {
    causesAndPathophysiology: {
      title: language === 'es' ? "Qué Causa Esta Condición" : language === 'ar' ? "ما يسبب هذه الحالة" : "What Causes This Condition",
      primaryCauses: [language === 'es' ? "Las causas específicas se discutirán según sus síntomas" : language === 'ar' ? "سيتم مناقشة الأسباب المحددة بناءً على أعراضك" : "Specific causes will be discussed based on your symptoms"],
      riskFactors: [language === 'es' ? "Su médico evaluará los factores de riesgo" : language === 'ar' ? "سيقوم طبيبك بتقييم عوامل الخطر" : "Your doctor will assess risk factors"],
      underlyingMechanisms: [language === 'es' ? "Los mecanismos varían según la condición" : language === 'ar' ? "تختلف الآليات حسب الحالة" : "Mechanisms vary by condition"]
    },
    treatmentRecommendations: {
      title: language === 'es' ? "Opciones de Tratamiento" : language === 'ar' ? "خيارات العلاج" : "Treatment Options",
      firstLineTherapies: [language === 'es' ? "Opciones de tratamiento basadas en evidencia" : language === 'ar' ? "خيارات العلاج القائمة على الأدلة" : "Evidence-based treatment options"],
      alternativeApproaches: [language === 'es' ? "Terapias alternativas disponibles" : language === 'ar' ? "العلاجات البديلة المتاحة" : "Alternative therapies available"],
      expectedOutcomes: [language === 'es' ? "El pronóstico depende de factores individuales" : language === 'ar' ? "يعتمد التشخيص على العوامل الفردية" : "Prognosis depends on individual factors"],
      lifestyleModifications: [language === 'es' ? "Cambios en estilo de vida recomendados" : language === 'ar' ? "تغييرات نمط الحياة الموصى بها" : "Lifestyle changes recommended"]
    },
    medicationInformation: {
      title: language === 'es' ? "Medicamentos Comunes" : language === 'ar' ? "الأدوية الشائعة" : "Common Medications",
      commonMedications: [language === 'es' ? "Opciones según diagnóstico" : language === 'ar' ? "الخيارات حسب التشخيص" : "Options vary by diagnosis"],
      sideEffects: [language === 'es' ? "Se revisarán los efectos secundarios" : language === 'ar' ? "سيتم مراجعة الآثار الجانبية" : "Side effects will be reviewed"],
      drugInteractions: [language === 'es' ? "Traiga lista de medicamentos" : language === 'ar' ? "أحضر قائمة الأدوية" : "Bring medication list"]
    },
    keyPointsForDoctor: {
      title: language === 'es' ? "Puntos para Discutir" : language === 'ar' ? "نقاط للمناقشة" : "Points to Discuss",
      diagnosticQuestions: [language === 'es' ? "¿Qué pruebas se necesitan?" : language === 'ar' ? "ما الاختبارات اللازمة؟" : "What tests are needed?"],
      treatmentQuestions: [language === 'es' ? "¿Cuáles son mis opciones?" : language === 'ar' ? "ما هي خياراتي؟" : "What are my options?"],
      prognosisQuestions: [language === 'es' ? "¿Cuál es la perspectiva?" : language === 'ar' ? "ما هي التوقعات؟" : "What's the outlook?"]
    },
    clinicalContext: {
      title: language === 'es' ? "Contexto Clínico" : language === 'ar' ? "السياق السريري" : "Clinical Background",
      prevalence: language === 'es' ? "Información disponible durante la visita" : language === 'ar' ? "المعلومات متاحة أثناء الزيارة" : "Information available during visit",
      typicalPresentation: language === 'es' ? "Varía por individuo" : language === 'ar' ? "يختلف حسب الفرد" : "Varies by individual",
      redFlags: [language === 'es' ? "Informe síntomas severos" : language === 'ar' ? "أبلغ عن الأعراض الشديدة" : "Report severe symptoms"]
    }
  };
}
