import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { userId, manualProfile } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user profile with AI-generated history
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to fetch user profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate HTML for PDF
    const htmlContent = generateHandoffHTML(profile, manualProfile);
    
    // For now, return the HTML content that can be converted to PDF on the client side
    // In the future, this could use a service like Puppeteer to generate actual PDFs
    return new Response(JSON.stringify({ 
      html: htmlContent,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-pdf-handoff function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateHandoffHTML(profile: any, manualProfile: any) {
  const aiHistory = profile?.ai_generated_history || [];
  const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Patient';
  
  // Combine and organize medical information
  const allMedications = new Set();
  const allConditions = new Set();
  const recentSymptoms = new Set();
  const recommendations = new Set();
  
  // Add from AI history
  aiHistory.forEach((entry: any) => {
    entry.medications?.new?.forEach((med: string) => allMedications.add(med));
    entry.medications?.changed?.forEach((med: string) => allMedications.add(med));
    entry.diagnoses?.forEach((diag: string) => allConditions.add(diag));
    entry.symptoms?.forEach((symptom: string) => recentSymptoms.add(symptom));
    entry.recommendations?.forEach((rec: string) => recommendations.add(rec));
  });

  // Add from manual profile
  if (manualProfile?.currentMedications) {
    manualProfile.currentMedications.split('\n').forEach((med: string) => {
      if (med.trim()) allMedications.add(med.trim());
    });
  }
  
  if (manualProfile?.medicalConditions) {
    manualProfile.medicalConditions.split('\n').forEach((condition: string) => {
      if (condition.trim()) allConditions.add(condition.trim());
    });
  }

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Medical Handoff - ${name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 20px;
            color: #333;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            margin-bottom: 20px;
            padding-bottom: 10px;
        }
        .patient-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        .generated-date {
            color: #666;
            font-size: 14px;
        }
        .section {
            margin: 20px 0;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .two-column {
            display: flex;
            gap: 20px;
        }
        .column {
            flex: 1;
        }
        .alert-box {
            background-color: #fee2e2;
            border: 1px solid #fca5a5;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
        }
        .alert-title {
            font-weight: bold;
            color: #dc2626;
        }
        ul {
            margin: 0;
            padding-left: 20px;
        }
        li {
            margin: 3px 0;
        }
        .contact-info {
            background-color: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .no-data {
            color: #9ca3af;
            font-style: italic;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="patient-name">${name}</div>
        <div class="generated-date">Medical Handoff Sheet - Generated: ${new Date().toLocaleDateString()}</div>
        ${profile?.email ? `<div class="generated-date">Email: ${profile.email}</div>` : ''}
    </div>

    <div class="two-column">
        <div class="column">
            <div class="section">
                <div class="section-title">🚨 Critical Information</div>
                ${manualProfile?.allergies ? `
                <div class="alert-box">
                    <div class="alert-title">Allergies</div>
                    ${manualProfile.allergies.split('\n').map((allergy: string) => 
                      allergy.trim() ? `<div>• ${allergy.trim()}</div>` : ''
                    ).join('')}
                </div>` : '<div class="no-data">No known allergies documented</div>'}
            </div>

            <div class="section">
                <div class="section-title">💊 Current Medications</div>
                ${Array.from(allMedications).length > 0 ? `
                <ul>
                    ${Array.from(allMedications).map(med => `<li>${med}</li>`).join('')}
                </ul>` : '<div class="no-data">No current medications documented</div>'}
            </div>

            <div class="section">
                <div class="section-title">🏥 Medical Conditions</div>
                ${Array.from(allConditions).length > 0 ? `
                <ul>
                    ${Array.from(allConditions).map(condition => `<li>${condition}</li>`).join('')}
                </ul>` : '<div class="no-data">No medical conditions documented</div>'}
            </div>
        </div>

        <div class="column">
            <div class="section">
                <div class="section-title">📞 Emergency Contact</div>
                <div class="contact-info">
                    ${manualProfile?.emergencyContactName ? 
                      `<strong>${manualProfile.emergencyContactName}</strong><br>` : ''}
                    ${manualProfile?.emergencyContactPhone ? 
                      `Phone: ${manualProfile.emergencyContactPhone}<br>` : ''}
                    ${manualProfile?.emergencyContactRelation ? 
                      `Relationship: ${manualProfile.emergencyContactRelation}` : ''}
                    ${!manualProfile?.emergencyContactName ? 
                      '<div class="no-data">No emergency contact provided</div>' : ''}
                </div>
            </div>

            <div class="section">
                <div class="section-title">🩺 Recent Symptoms & Concerns</div>
                ${Array.from(recentSymptoms).length > 0 ? `
                <ul>
                    ${Array.from(recentSymptoms).map(symptom => `<li>${symptom}</li>`).join('')}
                </ul>` : '<div class="no-data">No recent symptoms documented</div>'}
            </div>

            <div class="section">
                <div class="section-title">📋 Recent Recommendations</div>
                ${Array.from(recommendations).length > 0 ? `
                <ul>
                    ${Array.from(recommendations).map(rec => `<li>${rec}</li>`).join('')}
                </ul>` : '<div class="no-data">No recent recommendations documented</div>'}
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📈 Recent Medical History Timeline</div>
        ${aiHistory.length > 0 ? `
        ${aiHistory.slice(-5).reverse().map((entry: any) => `
            <div style="margin: 10px 0; padding: 10px; border-left: 3px solid #2563eb; background-color: #f8fafc;">
                <strong>${new Date(entry.timestamp).toLocaleDateString()}</strong>
                ${entry.medications?.new?.length ? `<br><em>New Medications:</em> ${entry.medications.new.join(', ')}` : ''}
                ${entry.symptoms?.length ? `<br><em>Symptoms:</em> ${entry.symptoms.join(', ')}` : ''}
                ${entry.diagnoses?.length ? `<br><em>Diagnoses:</em> ${entry.diagnoses.join(', ')}` : ''}
            </div>
        `).join('')}` : '<div class="no-data">No recent medical history available</div>'}
    </div>

    <div class="section">
        <div class="section-title">ℹ️ Additional Information</div>
        <div style="font-size: 12px; color: #666;">
            This handoff sheet was automatically generated by Clearvisit AI on ${new Date().toLocaleString()}.
            Please verify all information with the patient and their primary care provider.
            For questions or updates, contact the patient at ${profile?.email || 'email not provided'}.
        </div>
    </div>
</body>
</html>`;
}